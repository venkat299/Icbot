from __future__ import annotations

import logging
from uuid import uuid4

from ..agents.warmup_agent import WarmupAgent  # Warm-up orchestration.
from ..agents.evaluation_agent import EvaluationAgent  # Criterion scoring.
from ..agents.wrapup_agent import WrapupAgent  # Wrap-up summarization.
from ..flow.criterion_graph import CriterionGraph
from ..flow.directives import generate_criterion_directives
from ..schemas.criterion import CriterionState
from ..schemas.interview import (
    ScheduledInterviewModel,
    ScheduledTranscriptEntry,
    ScheduledCriterionResult,
    ScoreDetail,
)
from ..schemas.warmup import WarmupFollowUpRequest, WarmupRequest, WarmupState, WarmupTurn
from ..styles import StyleRuntime
from ..schemas.wrapup_summary import WrapupRequest, WrapupCompetencySummary, WrapupCriterionSummary, WrapupSummary
from ..interview_store import complete_interview
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
        self._evaluation_agent = EvaluationAgent()
        self._criterion_graph = CriterionGraph(self._evaluation_agent)
        self._wrapup_agent = WrapupAgent()

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
        directives = await generate_criterion_directives(interview, self._style_runtime)
        state.criteria = [CriterionState(directive=directive, pending_question=directive.question) for directive in directives]
        if not state.criteria:
            logger.warning("No rubric criteria available | session_id=%s interview_id=%s", session_id, interview.id)
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
                competency_id=state.active_criterion.directive.competency_id if state.active_criterion else None,
            )

        if payload.event == SessionEventType.CANDIDATE_REPLY:
            if state.stage == "warmup":
                response = await self._handle_warmup_reply(state, text)
            elif state.stage == "competency":
                response = await self._handle_criterion_reply(state, text)
            else:
                response = await self._complete_session(state)
            self._store.save(state)
            return response

        raise ValueError(f"Unsupported session event '{payload.event}'")

    async def end_session(self, session_id: str) -> ScheduledInterviewModel:  # Forces completion of a session and persists artifacts.
        state = self._store.get(session_id)
        wrapup_message, wrapup_summary = await self._build_wrapup_message(state, include_fallback=True)
        updated = self._persist_interview_results(state, wrapup_summary)
        self._store.delete(session_id)
        logger.info("Interview session manually ended | session_id=%s", session_id)
        if wrapup_message:
            logger.debug("Wrap-up message generated | session_id=%s message=%s", session_id, wrapup_message.text)
        return updated

    async def _handle_warmup_reply(self, state: InterviewSessionState, text: str) -> InterviewSessionResponse:  # Processes candidate response during warm-up.
        assert state.warmup_plan is not None
        state.transcript.append(TranscriptEntry(role="candidate", text=text))
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
            reply_pending = not updated_state.done
            if updated_state.done:
                follow_up_text = _competency_notice(follow_up_text)
            message = SessionMessage(
                role="interviewer",
                text=follow_up_text,
                expect_candidate_reply=reply_pending,
                objective=state.warmup_plan.prompt.objective,
            )
            messages.append(message)
            state.transcript.append(TranscriptEntry(role="interviewer", text=message.text))
            if reply_pending:
                _log_waiting_for_reply(state.session_id, "warmup", message)
        elif updated_state.done:
            notice = _competency_notice("")
            message = SessionMessage(
                role="interviewer",
                text=notice,
                expect_candidate_reply=False,
                objective=state.warmup_plan.prompt.objective,
            )
            messages.append(message)
            state.transcript.append(TranscriptEntry(role="interviewer", text=message.text))
        if updated_state.done or not follow_up.follow_up:
            state.stage = "competency"
            logger.info("Warm-up complete, moving to criteria | session_id=%s", state.session_id)
            return await self._prompt_next_criterion(state, seed_messages=messages)
        return InterviewSessionResponse(
            session_id=state.session_id,
            stage="warmup",
            messages=messages,
            done=False,
        )

    async def _prompt_next_criterion(
        self,
        state: InterviewSessionState,
        *,
        seed_messages: list[SessionMessage] | None = None,
    ) -> InterviewSessionResponse:  # Emits the next criterion question or completes the interview.
        criterion = state.active_criterion
        if criterion is None:
            state.stage = "wrapup"
            logger.info("All criteria complete | session_id=%s", state.session_id)
            return await self._complete_session(state, include_message=False)

        question = (criterion.pending_question or criterion.directive.question).strip()
        if _already_prompted(state, question):
            question = _dedupe_prompt(question)
        criterion.pending_question = question
        message = SessionMessage(
            role="interviewer",
            text=question,
            expect_candidate_reply=True,
            objective=criterion.directive.directive.task_brief,
            metadata={
                "competency_id": criterion.directive.competency_id,
                "criterion_id": criterion.directive.criterion_id,
                "criterion": criterion.directive.criterion_name,
            },
        )
        state.transcript.append(TranscriptEntry(role="interviewer", text=message.text))
        _log_waiting_for_reply(state.session_id, "competency", message)
        logger.info(
            "Criterion prompt | session_id=%s competency_id=%s criterion_id=%s question=%s",
            state.session_id,
            criterion.directive.competency_id,
            criterion.directive.criterion_id,
            question,
        )
        messages = list(seed_messages or [])
        messages.append(message)
        return InterviewSessionResponse(
            session_id=state.session_id,
            stage="competency",
            messages=messages,
            done=False,
            competency_id=criterion.directive.competency_id,
        )

    async def _handle_criterion_reply(self, state: InterviewSessionState, text: str) -> InterviewSessionResponse:  # Processes candidate replies for criteria.
        criterion = state.active_criterion
        if criterion is None:
            return await self._complete_session(state)

        question = (criterion.pending_question or criterion.directive.question).strip()
        state.transcript.append(TranscriptEntry(role="candidate", text=text))
        rubric_levels = self._criterion_levels(state, criterion)
        updated_state, follow_up = await self._criterion_graph.advance(
            criterion,
            question=question,
            answer=text,
            rubric_levels=rubric_levels,
        )
        state.criteria[state.criterion_index] = updated_state

        if follow_up:
            if _already_prompted(state, follow_up):
                follow_up = _dedupe_prompt(follow_up)
            updated_state.pending_question = follow_up
            message = SessionMessage(
                role="interviewer",
                text=follow_up,
                expect_candidate_reply=True,
                objective=criterion.directive.directive.task_brief,
                metadata={
                    "competency_id": criterion.directive.competency_id,
                    "criterion_id": criterion.directive.criterion_id,
                    "criterion": criterion.directive.criterion_name,
                    "follow_up": "true",
                },
            )
            state.transcript.append(TranscriptEntry(role="interviewer", text=message.text))
            _log_waiting_for_reply(state.session_id, "competency", message)
            logger.info(
                "Criterion follow-up | session_id=%s competency_id=%s criterion_id=%s attempts=%s confidence=%.2f",
                state.session_id,
                criterion.directive.competency_id,
                criterion.directive.criterion_id,
                len(updated_state.attempts),
                updated_state.confidence,
            )
            return InterviewSessionResponse(
                session_id=state.session_id,
                stage="competency",
                messages=[message],
                done=False,
                competency_id=criterion.directive.competency_id,
            )

        logger.info(
            "Criterion complete | session_id=%s competency_id=%s criterion_id=%s level=%s confidence=%.2f attempts=%s",
            state.session_id,
            criterion.directive.competency_id,
            criterion.directive.criterion_id,
            updated_state.level,
            updated_state.confidence,
            len(updated_state.attempts),
        )
        state.criterion_index += 1
        return await self._prompt_next_criterion(state)

    def _criterion_levels(self, state: InterviewSessionState, criterion: CriterionState) -> dict[str, str]:  # Retrieves rubric guidance.
        rubric = state.interview.rubric
        target_competency = criterion.directive.competency_name.strip().lower()
        target_criterion = criterion.directive.criterion_name.strip().lower()
        for category in rubric.evaluation_criteria:
            if category.category.strip().lower() != target_competency:
                continue
            for item in category.criteria:
                if item.name.strip().lower() == target_criterion:
                    return item.scoring_levels or {}
        return {}

    async def _build_wrapup_message(self, state: InterviewSessionState, include_fallback: bool) -> tuple[SessionMessage | None, WrapupSummary | None]:  # Generates the wrap-up summary message and structured data.
        if not state.criteria:
            if include_fallback:
                return SessionMessage(
                    role="system",
                    text="Interview wrap-up complete. You may proceed to evaluation.",
                    expect_candidate_reply=False,
                ), None
            return None, None

        request, results = self._compose_wrapup_payload(state)
        try:
            summary = await self._wrapup_agent.summarize(request, results)
        except Exception as exc:
            logger.exception("Failed to generate wrap-up summary | session_id=%s", state.session_id, exc_info=exc)
            if include_fallback:
                return SessionMessage(
                    role="system",
                    text="Interview wrap-up complete. You may proceed to evaluation.",
                    expect_candidate_reply=False,
                ), None
            return None, None

        parts: list[str] = [summary.closing_statement.strip()]
        if summary.key_strengths:
            strengths = "\n".join(f"- {item}" for item in summary.key_strengths)
            parts.append(f"Key strengths:\n{strengths}")
        if summary.risk_flags:
            risks = "\n".join(f"- {item}" for item in summary.risk_flags)
            parts.append(f"Risks:\n{risks}")
        if summary.next_steps:
            steps = "\n".join(f"- {item}" for item in summary.next_steps)
            parts.append(f"Suggested next steps:\n{steps}")
        text = "\n\n".join(part for part in parts if part.strip())
        metadata = {
            "key_strengths": "|".join(summary.key_strengths),
            "risk_flags": "|".join(summary.risk_flags),
            "next_steps": "|".join(summary.next_steps),
        }
        logger.info(
            "Wrap-up summary | session_id=%s strengths=%s risks=%s next_steps=%s",
            state.session_id,
            len(summary.key_strengths),
            len(summary.risk_flags),
            len(summary.next_steps),
        )
        return SessionMessage(
            role="system",
            text=text,
            expect_candidate_reply=False,
            metadata=metadata,
        ), summary

    def _compose_wrapup_payload(self, state: InterviewSessionState) -> tuple[WrapupRequest, str]:  # Aggregates criterion data for wrap-up prompts.
        competencies: dict[str, WrapupCompetencySummary] = {}
        for criterion_state in state.criteria:
            directive = criterion_state.directive
            comp = competencies.get(directive.competency_id)
            if comp is None:
                comp = WrapupCompetencySummary(
                    competency_id=directive.competency_id,
                    competency_name=directive.competency_name,
                )
                competencies[directive.competency_id] = comp
            last_attempt = criterion_state.attempts[-1] if criterion_state.attempts else None
            comp.criteria.append(
                WrapupCriterionSummary(
                    criterion_id=directive.criterion_id,
                    criterion_name=directive.criterion_name,
                    weight=directive.weight,
                    level=(last_attempt.level if last_attempt else None),
                    confidence=(last_attempt.confidence if last_attempt else None),
                    notes=(last_attempt.notes if last_attempt and last_attempt.notes else None),
                )
            )

        request = WrapupRequest(
            candidate_name=state.interview.candidate_name,
            job_title=state.interview.job_title,
            competencies=list(competencies.values()),
        )

        lines: list[str] = []
        for comp in request.competencies:
            lines.append(f"- {comp.competency_name} ({comp.competency_id}):")
            for crit in comp.criteria:
                level = "pending" if crit.level is None else str(crit.level)
                confidence = "n/a" if crit.confidence is None else f"{crit.confidence:.2f}"
                notes = crit.notes or "n/a"
                lines.append(
                    f"  • {crit.criterion_name} | level={level} | confidence={confidence} | weight={crit.weight} | notes={notes}"
                )
        results = "\n".join(lines) if lines else "No criterion results recorded."
        return request, results

    def _persist_interview_results(
        self,
        state: InterviewSessionState,
        summary: WrapupSummary | None,
    ) -> ScheduledInterviewModel:  # Persists transcript, evaluation results, and wrap-up summary.
        transcripts = [
            ScheduledTranscriptEntry(role=entry.role, text=entry.text)
            for entry in state.transcript
        ]

        criterion_results: list[ScheduledCriterionResult] = []
        score_details: list[ScoreDetail] = []
        level_scores: list[int] = []

        for criterion_state in state.criteria:
            directive = criterion_state.directive
            last_attempt = criterion_state.attempts[-1] if criterion_state.attempts else None
            level = last_attempt.level if last_attempt else None
            confidence = last_attempt.confidence if last_attempt else None
            notes = last_attempt.notes if last_attempt and last_attempt.notes else None

            criterion_results.append(
                ScheduledCriterionResult(
                    competency_id=directive.competency_id,
                    competency_name=directive.competency_name,
                    criterion_id=directive.criterion_id,
                    criterion_name=directive.criterion_name,
                    level=level,
                    confidence=confidence,
                    notes=notes,
                )
            )

            if level is not None:
                score = int((level / 5) * 100)
                level_scores.append(score)
                score_details.append(
                    ScoreDetail(
                        criteria=f"{directive.competency_name} – {directive.criterion_name}",
                        score=score,
                        feedback=notes or "No additional feedback provided.",
                    )
                )

        overall = int(sum(level_scores) / len(level_scores)) if level_scores else None

        return complete_interview(
            state.interview.id,
            transcript=transcripts,
            criterion_results=criterion_results,
            wrapup_summary=summary,
            score_details=score_details or None,
            overall_score=overall,
        )

    async def _complete_session(
        self,
        state: InterviewSessionState,
        *,
        include_message: bool = True,
    ) -> InterviewSessionResponse:  # Marks the interview as wrapped up.
        state.stage = "completed"
        wrapup_message, wrapup_summary = await self._build_wrapup_message(state, include_message)
        self._persist_interview_results(state, wrapup_summary)
        self._store.delete(state.session_id)
        logger.info("Interview session completed | session_id=%s", state.session_id)
        messages: list[SessionMessage] = []
        if wrapup_message:
            messages.append(wrapup_message)
        elif include_message:
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

def _competency_focus(interview: ScheduledInterviewModel) -> list[str]:  # Extracts competency names for warm-up context.
    return [comp.name for comp in interview.competencies if comp.name.strip()]


def _competency_notice(text: str) -> str:  # Ensures warm-up closing cues competency handoff.
    base = text.strip() or "Thanks for warming up with me."
    if "competency" in base.lower():
        return base
    return f"{base}\n\nWe'll move into competency-focused questions now."


def _already_prompted(state: InterviewSessionState, text: str) -> bool:  # Checks if interviewer already asked the same text.
    normalized = (text or "").strip().lower()
    if not normalized:
        return False
    return any(entry.role == "interviewer" and entry.text.strip().lower() == normalized for entry in state.transcript)


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
