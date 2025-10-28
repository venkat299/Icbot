from __future__ import annotations

import logging
from typing import Iterable
from uuid import uuid4

from ..agents import WarmupAgent  # Warm-up orchestration.
from ..schemas.interview import ScheduledInterviewModel
from ..schemas.warmup import WarmupFollowUpRequest, WarmupRequest, WarmupState, WarmupTurn
from ..styles import DirectiveSchema, StagePlan, StyleDirectiveRequest, StyleRuntime
from ..styles.toolkit import clamp_excerpt
from .models import (
    InterviewSessionEvent,
    InterviewSessionResponse,
    InterviewSessionState,
    SessionEventType,
    SessionMessage,
    TranscriptEntry,
)
from .store import SessionStore, get_session_store


logger = logging.getLogger(__name__)


class InterviewSessionManager:  # Coordinates full interview flow across stages.
    def __init__(
        self,
        store: SessionStore | None = None,
        warmup_agent: WarmupAgent | None = None,
        style_runtime: StyleRuntime | None = None,
    ) -> None:
        self._store = store or get_session_store()
        self._warmup_agent = warmup_agent or WarmupAgent()
        self._style_runtime = style_runtime or StyleRuntime()

    async def start(self, interview: ScheduledInterviewModel) -> InterviewSessionResponse:  # Initializes a session and returns warm-up prompt.
        session_id = uuid4().hex
        warmup = await self._warmup_agent.opening(
            WarmupRequest(
                candidate_name=interview.candidate_name,
                job_title=interview.job_title,
                resume_text=interview.resume,
                competency_focus=_competency_focus(interview),
                interview_style=interview.competencies[0].interview_style if interview.competencies else None,
            )
        )
        warmup_state = warmup.state or WarmupState()
        warmup = warmup.model_copy(update={"state": warmup_state})
        state = InterviewSessionState(
            session_id=session_id,
            interview=interview,
            warmup_plan=warmup,
            warmup_state=warmup_state,
        )
        self._store.save(state)
        messages = self._build_warmup_messages(warmup)
        for msg in messages:
            if msg.expect_candidate_reply:
                state.transcript.append(TranscriptEntry(role="interviewer", text=msg.text))
            _log_waiting_for_reply(session_id, "warmup", msg)
        return InterviewSessionResponse(session_id=session_id, stage="warmup", messages=messages)

    async def advance(self, session_id: str, payload: InterviewSessionEvent) -> InterviewSessionResponse:  # Applies an event and returns emitted messages.
        state = self._store.get(session_id)
        if state.stage == "completed":
            return InterviewSessionResponse(session_id=session_id, stage="completed", messages=[], done=True)

        text = payload.text.strip()

        if payload.event == SessionEventType.INTERVIEWER_MESSAGE:
            if state.stage == "competency":
                state.transcript.append(TranscriptEntry(role="interviewer", text=text))
            self._store.save(state)
            return InterviewSessionResponse(
                session_id=session_id,
                stage=state.stage,
                messages=[],
                done=state.stage == "completed",
                competency_id=state.active_competency.id if state.active_competency else None,
            )

        if payload.event == SessionEventType.CANDIDATE_REPLY:
            if state.stage == "warmup":
                response = await self._handle_warmup_reply(state, text)
            elif state.stage == "competency":
                response = await self._handle_competency_reply(state, text)
            else:
                response = self._complete_session(state)
            self._store.save(state)
            return response

        raise ValueError(f"Unsupported session event '{payload.event}'")

    async def _handle_warmup_reply(self, state: InterviewSessionState, text: str) -> InterviewSessionResponse:  # Processes candidate response during warm-up.
        assert state.warmup_plan is not None
        request = WarmupFollowUpRequest(
            prompt=state.warmup_plan.prompt,
            candidate_response=text,
            tone=state.warmup_plan.tone,
            candidate_name=state.interview.candidate_name,
            job_title=state.interview.job_title,
            interview_style=state.interview.competencies[0].interview_style if state.interview.competencies else None,
            competency_focus=_competency_focus(state.interview),
            state=state.warmup_state,
        )
        follow_up = await self._warmup_agent.follow_up(request)
        messages: list[SessionMessage] = []
        updated_state = follow_up.state or state.warmup_state or WarmupState()
        state.warmup_state = updated_state
        if state.warmup_plan:
            state.warmup_plan = state.warmup_plan.model_copy(update={"state": updated_state})
        follow_up_text = (follow_up.follow_up or "").strip()
        if follow_up_text:
            if _already_prompted(state, follow_up_text):
                follow_up_text = _dedupe_prompt(follow_up_text)
            if updated_state.done:
                messages.append(
                    SessionMessage(
                        role="interviewer",
                        text=_competency_notice(follow_up_text),
                        expect_candidate_reply=False,
                        objective=state.warmup_plan.prompt.objective,
                    )
                )
            else:
                messages.append(
                    SessionMessage(
                        role="interviewer",
                        text=follow_up_text,
                        expect_candidate_reply=True,
                        objective=state.warmup_plan.prompt.objective,
                    )
                )
                _log_waiting_for_reply(state.session_id, "warmup", messages[-1])
            state.transcript.append(TranscriptEntry(role="interviewer", text=messages[-1].text))
        elif updated_state.done:
            messages.append(
                SessionMessage(
                    role="interviewer",
                    text=_competency_notice(""),
                    expect_candidate_reply=False,
                    objective=state.warmup_plan.prompt.objective,
                )
            )
            state.transcript.append(TranscriptEntry(role="interviewer", text=messages[-1].text))
        if updated_state.done or not follow_up.follow_up:
            state.stage = "competency"
            try:
                response = await self._next_competency_step(state, messages)
            except Exception as exc:  # Swallows directive failures so warm-up closure still returns.
                logger.exception(
                    "Failed to fetch competency directive | session_id=%s competency_id=%s",
                    state.session_id,
                    state.active_competency.id if state.active_competency else None,
                    exc_info=exc,
                )
                response = InterviewSessionResponse(
                    session_id=state.session_id,
                    stage="competency",
                    messages=messages,
                    done=False,
                    competency_id=state.active_competency.id if state.active_competency else None,
                )
            return response
        return InterviewSessionResponse(
            session_id=state.session_id,
            stage="warmup",
            messages=messages,
            done=False,
        )

    async def _handle_competency_reply(self, state: InterviewSessionState, text: str) -> InterviewSessionResponse:  # Advances competency stages after candidate replies.
        current = state.active_competency
        if current is None:
            return self._complete_session(state)

        state.transcript.append(TranscriptEntry(role="candidate", text=text))

        if state.competency_finished.get(current.id):
            state.competency_index += 1
            next_competency = state.active_competency
            if next_competency is None:
                state.stage = "wrapup"
                return self._complete_session(state, include_message=False)
            return await self._next_competency_step(state, [])

        return await self._next_competency_step(state, [])

    async def _next_competency_step(
        self,
        state: InterviewSessionState,
        seed_messages: list[SessionMessage] | None = None,
    ) -> InterviewSessionResponse:  # Requests the next directive for the active competency.
        competency = state.active_competency
        if competency is None:
            state.stage = "wrapup"
            return self._complete_session(state, include_message=False)
        existing_state = state.style_states.get(competency.id)
        logger.debug(
            "Requesting style directive | session_id=%s competency_id=%s style=%s stage_index=%s task_cursor=%s done=%s transcript_turns=%s",
            state.session_id,
            competency.id,
            competency.interview_style,
            existing_state.stage_index if existing_state else 0,
            existing_state.task_cursor if existing_state else 0,
            existing_state.done if existing_state else False,
            len(state.transcript),
        )
        attempts = 0
        last_plan: StagePlan | None = None
        last_prompt: str = ""
        while attempts < 3:
            plan = await self._style_runtime.next_directive(
                StyleDirectiveRequest(
                    style_id=competency.interview_style,
                    competency_id=competency.id,
                    competency_title=competency.name,
                    rubric_focus=[],
                    transcript=state.transcript_turns(),
                    highlights=[],
                    guidance=[competency.rationale] if competency.rationale else [],
                    resume_excerpt=clamp_excerpt(state.interview.resume),
                    state=state.style_states.get(competency.id),
                )
            )
            state.style_states[competency.id] = plan.state
            state.competency_finished[competency.id] = plan.done
            prompt = _build_candidate_prompt(plan.directive)
            if not _already_prompted(state, prompt):
                message = self._format_directive(plan, competency.name)
                state.transcript.append(TranscriptEntry(role="interviewer", text=message.text))
                messages = list(seed_messages or [])
                messages.append(message)
                _log_waiting_for_reply(state.session_id, "competency", message)
                return InterviewSessionResponse(
                    session_id=state.session_id,
                    stage="competency",
                    messages=messages,
                    done=False,
                    competency_id=competency.id,
                )
            logger.info(
                "Duplicate directive detected | session_id=%s competency_id=%s attempt=%s prompt=%s",
                state.session_id,
                competency.id,
                attempts,
                prompt,
            )
            last_plan = plan
            last_prompt = prompt
            if plan.done:
                break
            attempts += 1

        if last_plan and not last_plan.done:
            fallback_prompt = _dedupe_prompt(last_prompt)
            if not _already_prompted(state, fallback_prompt):
                message = SessionMessage(
                    role="interviewer",
                    text=fallback_prompt,
                    expect_candidate_reply=True,
                    objective=last_plan.directive.task_brief,
                    metadata={
                        "style_id": last_plan.style_id,
                        "stage_id": last_plan.stage_id,
                        "task_id": last_plan.task_id,
                        "competency": competency.name,
                        "deduped": "true",
                    },
                )
                state.transcript.append(TranscriptEntry(role="interviewer", text=message.text))
                messages = list(seed_messages or [])
                messages.append(message)
                _log_waiting_for_reply(state.session_id, "competency", message)
                return InterviewSessionResponse(
                    session_id=state.session_id,
                    stage="competency",
                    messages=messages,
                    done=False,
                    competency_id=competency.id,
                )

        state.competency_index += 1
        next_competency = state.active_competency
        if next_competency is None:
            state.stage = "wrapup"
            return self._complete_session(state, include_message=False)
        return await self._next_competency_step(state, seed_messages)

    def _complete_session(
        self,
        state: InterviewSessionState,
        *,
        include_message: bool = True,
    ) -> InterviewSessionResponse:  # Marks the interview as wrapped up.
        state.stage = "completed"
        self._store.delete(state.session_id)
        messages: list[SessionMessage] = []
        if include_message:
            messages.append(
                SessionMessage(
                    role="system",
                    text="Interview wrap-up complete. You may proceed to evaluation.",
                    expect_candidate_reply=False,
                )
            )
        return InterviewSessionResponse(
            session_id=state.session_id,
            stage="completed",
            messages=messages,
            done=True,
        )

    def _build_warmup_messages(self, warmup: WarmupTurn) -> list[SessionMessage]:  # Converts warm-up plan into messages.
        prompt = warmup.prompt
        greeting = SessionMessage(
            role="system",
            text=f"{prompt.greeting}\n\nObjective: {prompt.objective}",
            expect_candidate_reply=False,
            objective=prompt.objective,
            metadata={"tone": warmup.tone},
        )
        question = SessionMessage(
            role="system",
            text=prompt.question,
            expect_candidate_reply=True,
            objective=prompt.objective,
        )
        return [greeting, question]

    def _format_directive(self, plan: StagePlan, competency_name: str) -> SessionMessage:  # Renders directive text for the interviewer.
        directive = plan.directive
        prompt = _build_candidate_prompt(directive)
        metadata: dict[str, str] = {
            "style_id": plan.style_id,
            "stage_id": plan.stage_id,
            "task_id": plan.task_id,
            "competency": competency_name,
        }
        if directive.interviewer_actions:
            metadata["interviewer_actions"] = _format_section("Interviewer actions", directive.interviewer_actions)
        if directive.candidate_focus:
            metadata["candidate_focus"] = _format_section("Candidate focus", directive.candidate_focus)
        if directive.evidence_focus:
            metadata["evidence_focus"] = _format_section("Evidence focus", directive.evidence_focus)
        if directive.follow_up_hint:
            metadata["follow_up_hint"] = directive.follow_up_hint
        if directive.rubric_reference:
            metadata["rubric_reference"] = directive.rubric_reference
        return SessionMessage(
            role="interviewer",
            text=prompt,
            expect_candidate_reply=True,
            objective=directive.task_brief,
            metadata=metadata,
        )

def _competency_focus(interview: ScheduledInterviewModel) -> list[str]:  # Extracts competency names for warm-up context.
    return [comp.name for comp in interview.competencies if comp.name.strip()]


def _competency_notice(text: str) -> str:  # Ensures warm-up closing cues competency handoff.
    base = text.strip() or "Thanks for warming up with me."
    if "competency" in base.lower():
        return base
    return f"{base}\n\nWe'll move into competency-focused questions now."


def _format_section(label: str, items: Iterable[str]) -> str:  # Formats multiline directive sections.
    values = [item.strip() for item in items if item.strip()]
    if not values:
        return ""
    return f"{label}:\n" + "\n".join(f"• {value}" for value in values)


def _already_prompted(state: InterviewSessionState, text: str) -> bool:  # Checks if interviewer already asked the same text.
    normalized = (text or "").strip().lower()
    if not normalized:
        return False
    return any(entry.role == "interviewer" and entry.text.strip().lower() == normalized for entry in state.transcript)


def _build_candidate_prompt(directive: DirectiveSchema) -> str:  # Converts directive briefs into explicit candidate prompts.
    question = _ensure_question(directive.task_brief)
    extras: list[str] = []
    if directive.candidate_focus:
        extras.append("Focus on: " + "; ".join(item.strip() for item in directive.candidate_focus if item.strip()))
    if directive.evidence_focus:
        extras.append("Highlight evidence: " + "; ".join(item.strip() for item in directive.evidence_focus if item.strip()))
    if directive.follow_up_hint:
        extras.append(f"Hint: {directive.follow_up_hint.strip()}")
    if directive.rubric_reference:
        extras.append(f"Rubric reference: {directive.rubric_reference.strip()}")
    if extras:
        return question + "\n\n" + "\n".join(extras)
    return question


def _ensure_question(text: str) -> str:  # Recasts directive briefs into polite questions.
    stripped = (text or "").strip()
    if not stripped:
        return "Could you walk me through your approach?"
    if stripped.endswith("?"):
        return stripped
    lowered = stripped[0].lower() + stripped[1:] if stripped[0].isupper() else stripped
    lowered = lowered.rstrip(".")
    if lowered.lower().startswith(("can ", "could ", "would ", "should ", "what ", "how ", "why ", "tell ", "describe ", "walk ", "explain ")):
        return lowered[0].upper() + lowered[1:] + "?"
    return "Could you " + lowered + "?"


def _dedupe_prompt(text: str) -> str:  # Provides a fallback variant to avoid repeated questions.
    stripped = (text or "").strip().rstrip("?")
    if not stripped:
        return "Could you add a fresh example or perspective?"
    return f"{stripped}. This time, please add a different example or angle?"


def _log_waiting_for_reply(session_id: str, stage: str, message: SessionMessage) -> None:  # Logs when the flow awaits candidate input.
    if message.expect_candidate_reply:
        logger.info(
            "Awaiting candidate reply | session_id=%s stage=%s message_id=%s objective=%s",
            session_id,
            stage,
            message.message_id,
            message.objective,
        )
