from __future__ import annotations

import re
from typing import TypedDict

from langchain_core.prompts import ChatPromptTemplate  # Builds prompt pipelines for LangChain.
from langgraph.graph import END, StateGraph  # Drives warm-up flow control.

from ..config import load_app_config  # Provides access to warm-up config.
from ..llm_gateway import runnable  # Provides JSON-enforced runnable.
from ..logging_utils import structured_stream_logger  # Provides console logger for flow traces.
from ..prompts import (  # Supplies prompt templates.
    WARMUP_COMFORT_SYSTEM_PROMPT,
    WARMUP_COMFORT_USER_TEMPLATE,
    WARMUP_FOLLOWUP_SYSTEM_PROMPT,
    WARMUP_FOLLOWUP_USER_TEMPLATE,
    WARMUP_SYSTEM_PROMPT,
    WARMUP_USER_TEMPLATE,
)
from ..registry import resolve_binding  # Resolves LLM route and schema bindings.
from ..schemas.warmup import (  # Imports request/response models.
    WarmupComfortScore,
    WarmupContext,
    WarmupFollowUp,
    WarmupFollowUpRequest,
    WarmupHistoryEntry,
    WarmupRequest,
    WarmupState,
    WarmupTurn,
)

_READY_PATTERN = re.compile(r"\b(ready|let['’]?s (start|go)|start now|good to go|yes)\b", re.IGNORECASE)

logger = structured_stream_logger("warmup.flow")


class _WarmupGraphState(TypedDict):  # Payload exchanged across LangGraph nodes.
    state: WarmupState
    request: WarmupFollowUpRequest
    result: WarmupFollowUp | None


class WarmupAgent:  # Orchestrates warm-up prompts using LangGraph.
    def __init__(self) -> None:
        app_config = load_app_config()
        route, opening_schema = resolve_binding("warmup.opening", app_config)
        self._max_turns = app_config.flow.warmup.max_turns
        self._ready_threshold = app_config.flow.warmup.ready_threshold

        opening_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", WARMUP_SYSTEM_PROMPT),
                ("human", WARMUP_USER_TEMPLATE),
            ]
        )
        followup_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", WARMUP_FOLLOWUP_SYSTEM_PROMPT),
                ("human", WARMUP_FOLLOWUP_USER_TEMPLATE),
            ]
        )
        comfort_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", WARMUP_COMFORT_SYSTEM_PROMPT),
                ("human", WARMUP_COMFORT_USER_TEMPLATE),
            ]
        )

        self._opening_chain = opening_prompt | runnable(route, opening_schema)
        self._followup_chain = followup_prompt | runnable(route, WarmupFollowUp)
        self._comfort_chain = comfort_prompt | runnable(route, WarmupComfortScore)
        self._graph = self._build_graph()

    async def opening(self, request: WarmupRequest) -> WarmupTurn:  # Returns first warm-up exchange.
        context = self._build_context(request)
        state = WarmupState(context=context)
        payload = {
            "candidate_name": context.candidate_name or "there",
            "job_title": context.job_title or "this role",
            "style_summary": context.interview_style or "standard interview",
            "competency_focus": self._format_focus(context.competency_focus),
            "resume_excerpt": (context.resume_excerpt or "Resume not provided.")[:1500],
            "recent_history": self._format_history(state.history),
        }
        turn = await self._opening_chain.ainvoke(payload)
        updated_state = self._register_opening(state, turn)
        return turn.model_copy(update={"state": updated_state})

    async def follow_up(self, request: WarmupFollowUpRequest) -> WarmupFollowUp:  # Advances the warm-up session.
        if request.state is None:
            raise ValueError("Warm-up state is required to generate follow-ups.")
        graph_input: _WarmupGraphState = {"state": request.state, "request": request, "result": None}
        result = await self._graph.ainvoke(graph_input)
        follow_up = result.get("result")
        if follow_up:
            return follow_up
        return WarmupFollowUp(follow_up=None, state=result["state"])

    def _build_graph(self) -> StateGraph[_WarmupGraphState]:  # Creates the warm-up state machine.
        graph: StateGraph[_WarmupGraphState] = StateGraph(_WarmupGraphState)
        graph.add_node("record_answer", self._record_answer)
        graph.add_node("score_answer", self._score_answer)
        graph.add_node("check_completion", self._check_completion)
        graph.add_node("compose_followup", self._compose_followup)
        graph.set_entry_point("record_answer")
        graph.add_edge("record_answer", "score_answer")
        graph.add_edge("score_answer", "check_completion")
        graph.add_conditional_edges("check_completion", self._route_after_check)
        graph.add_edge("compose_followup", END)
        return graph.compile()

    def _build_context(self, request: WarmupRequest) -> WarmupContext:  # Normalizes request context.
        excerpt = (request.resume_text or "").strip()
        trimmed = excerpt[:1500] if excerpt else None
        return WarmupContext(
            candidate_name=request.candidate_name,
            job_title=request.job_title,
            interview_style=request.interview_style,
            competency_focus=request.competency_focus or [],
            resume_excerpt=trimmed,
        )

    def _register_opening(self, state: WarmupState, turn: WarmupTurn) -> WarmupState:  # Seeds history with opening turn.
        updated = state.model_copy(deep=True)
        greeting = turn.prompt.greeting.strip()
        question = turn.prompt.question.strip()
        if greeting:
            updated.history.append(WarmupHistoryEntry(role="interviewer", text=greeting))
        if question:
            updated.history.append(WarmupHistoryEntry(role="interviewer", text=question))
            updated.last_question = question
        return updated

    def _record_answer(self, payload: _WarmupGraphState) -> _WarmupGraphState:  # Stores the candidate reply.
        state = payload["state"].model_copy(deep=True)
        answer = payload["request"].candidate_response.strip()
        state.last_answer = answer
        state.history.append(WarmupHistoryEntry(role="candidate", text=answer))
        state.turns += 1
        payload["state"] = state
        self._log_transition(
            node="record_answer",
            state=state,
            answer_len=len(answer),
        )
        return payload

    async def _score_answer(self, payload: _WarmupGraphState) -> _WarmupGraphState:  # Updates comfort estimate.
        state = payload["state"].model_copy(deep=True)
        answer = state.last_answer or ""
        explicit = bool(_READY_PATTERN.search(answer))
        comfort_source = "explicit" if explicit else "llm"
        if explicit:
            comfort_score = 1.0
        else:
            comfort_response = await self._comfort_chain.ainvoke(
                {
                    "answer": answer,
                    "explicit_ready": str(explicit).lower(),
                }
            )
            comfort_score = comfort_response.comfort
        state.comfort = max(state.comfort, comfort_score)
        payload["state"] = state
        self._log_transition(
            node="score_answer",
            state=state,
            explicit_ready=str(explicit).lower(),
            comfort_raw=f"{comfort_score:.2f}",
            comfort_source=comfort_source,
        )
        return payload

    async def _check_completion(self, payload: _WarmupGraphState) -> _WarmupGraphState:  # Determines if warm-up is finished.
        state = payload["state"].model_copy(deep=True)
        comfort_met = state.comfort >= self._ready_threshold
        turn_limit = state.turns >= self._max_turns
        state.done = comfort_met or turn_limit
        reasons: list[str] = []
        if comfort_met:
            reasons.append("comfort")
        if turn_limit:
            reasons.append("turn_limit")
        if state.done:
            follow_up = await self._generate_turn(state, payload["request"], stage_complete=True)
            payload["state"] = follow_up.state or state
            payload["result"] = follow_up
            self._log_transition(
                node="check_completion",
                state=payload["state"],
                decision="complete",
                reason=",".join(reasons) or None,
                threshold=f"{self._ready_threshold:.2f}",
                turn_cap=self._max_turns,
            )
        else:
            payload["state"] = state
            self._log_transition(
                node="check_completion",
                state=state,
                decision="continue",
                threshold=f"{self._ready_threshold:.2f}",
                turn_cap=self._max_turns,
            )
        return payload

    async def _compose_followup(self, payload: _WarmupGraphState) -> _WarmupGraphState:  # Crafts next interviewer turn.
        state = payload["state"].model_copy(deep=True)
        follow_up = await self._generate_turn(state, payload["request"], stage_complete=False)
        payload["state"] = follow_up.state or state
        payload["result"] = follow_up
        self._log_transition(
            node="compose_followup",
            state=payload["state"],
            delivered=str(bool((follow_up.follow_up or "").strip())).lower(),
        )
        return payload

    async def _generate_turn(
        self,
        state: WarmupState,
        request: WarmupFollowUpRequest,
        *,
        stage_complete: bool,
    ) -> WarmupFollowUp:  # Calls LLM to build interviewer response.
        context = state.context
        focus = self._format_focus(context.competency_focus)
        tone = request.tone or "encouraging"
        user_payload = {
            "candidate_name": context.candidate_name or request.candidate_name or "there",
            "job_title": context.job_title or request.job_title or "this role",
            "tone": tone,
            "objective": request.prompt.objective,
            "competency_focus": focus,
            "ready_threshold": f"{self._ready_threshold:.2f}",
            "stage_complete": "true" if stage_complete else "false",
            "recent_history": self._format_history(state.history),
        }
        follow_up = await self._followup_chain.ainvoke(user_payload)
        text = (follow_up.follow_up or "").strip()
        if text:
            state.history.append(WarmupHistoryEntry(role="interviewer", text=text))
        state.last_question = None if stage_complete else (text or state.last_question)
        if stage_complete:
            state.done = True
        return follow_up.model_copy(update={"state": state})

    def _route_after_check(self, payload: _WarmupGraphState) -> str:  # Chooses next node based on completion.
        return END if payload["state"].done else "compose_followup"

    def _log_transition(self, *, node: str, state: WarmupState, **metrics: object) -> None:  # Emits concise state traces.
        parts = [
            f"node={node}",
            f"turns={state.turns}",
            f"comfort={state.comfort:.2f}",
            f"done={str(state.done).lower()}",
        ]
        for key, value in metrics.items():
            if value is None:
                continue
            if isinstance(value, bool):
                rendered = str(value).lower()
            else:
                rendered = str(value)
            if not rendered:
                continue
            parts.append(f"{key}={rendered}")
        logger.info(" ".join(parts))

    def _format_history(self, history: list[WarmupHistoryEntry], limit: int = 6) -> str:  # Builds transcript summary.
        if not history:
            return "No exchanges yet."
        recent = history[-limit:]
        return "\n".join(f"{item.role.capitalize()}: {item.text}" for item in recent)

    def _format_focus(self, focus: list[str]) -> str:  # Produces readable focus summary.
        return ", ".join(item for item in focus if item.strip()) or "general rapport"
*** End of File
