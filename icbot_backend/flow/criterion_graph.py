from __future__ import annotations

from typing import TypedDict

from langgraph.graph import END, StateGraph  # Provides LangGraph orchestration.

from ..agents.evaluation_agent import EvaluationAgent  # Scores criterion responses.
from ..schemas.criterion import CriterionAttempt, CriterionState, EvaluationRequest, EvaluationResult


class _CriterionPayload(TypedDict):  # Payload circulated through the LangGraph.
    state: CriterionState
    question: str
    answer: str
    evaluation: EvaluationResult | None
    follow_up: str | None
    rubric_levels: dict[str, str] | None


class CriterionGraph:  # Executes criterion-level turn taking using LangGraph.
    def __init__(
        self,
        evaluator: EvaluationAgent,
        *,
        confidence_threshold: float = 0.7,
        max_attempts: int = 2,
    ) -> None:  # Initializes the criterion flow controller.
        self._evaluator = evaluator
        self._confidence_threshold = confidence_threshold
        self._max_attempts = max_attempts
        self._graph = self._build()

    async def advance(
        self,
        state: CriterionState,
        *,
        question: str,
        answer: str,
        rubric_levels: dict[str, str] | None = None,
    ) -> tuple[CriterionState, str | None]:  # Processes an answer and returns updated state plus optional follow-up.
        payload: _CriterionPayload = {
            "state": state,
            "question": question,
            "answer": answer,
            "evaluation": None,
            "follow_up": None,
            "rubric_levels": rubric_levels,
        }
        result = await self._graph.ainvoke(payload)
        updated_state: CriterionState = result["state"]
        follow_up: str | None = result["follow_up"]
        return updated_state, follow_up

    def _build(self) -> StateGraph[_CriterionPayload]:  # Compiles the LangGraph used for criterion handling.
        graph: StateGraph[_CriterionPayload] = StateGraph(_CriterionPayload)
        graph.add_node("score_response", self._score_response)
        graph.add_node("update_state", self._update_state)
        graph.add_node("check_confidence", self._check_confidence)
        graph.add_node("compose_followup", self._compose_followup)
        graph.set_entry_point("score_response")
        graph.add_edge("score_response", "update_state")
        graph.add_edge("update_state", "check_confidence")
        graph.add_conditional_edges("check_confidence", self._route_after_check)
        graph.add_edge("compose_followup", END)
        return graph.compile()

    async def _score_response(self, payload: _CriterionPayload) -> _CriterionPayload:  # Calls evaluator to score the reply.
        state = payload["state"]
        directive = state.directive
        request = EvaluationRequest(
            competency_id=directive.competency_id,
            competency_name=directive.competency_name,
            criterion_id=directive.criterion_id,
            criterion_name=directive.criterion_name,
            criterion_description=directive.description,
            directive=directive.directive,
            question=payload["question"],
            answer=payload["answer"],
            transcript=state.attempts,
        )
        evaluation = await self._evaluator.score(request, rubric_levels=payload["rubric_levels"])
        payload["evaluation"] = evaluation
        return payload

    def _update_state(self, payload: _CriterionPayload) -> _CriterionPayload:  # Registers the scored attempt on the state.
        state = payload["state"]
        evaluation = payload["evaluation"]
        assert evaluation is not None
        attempt = CriterionAttempt(
            question=payload["question"],
            answer=payload["answer"],
            level=evaluation.level,
            confidence=evaluation.confidence,
            notes=evaluation.notes,
        )
        updated = state.register_attempt(attempt)
        updated.done = evaluation.disposition == "complete"
        payload["state"] = updated
        return payload

    def _check_confidence(self, payload: _CriterionPayload) -> _CriterionPayload:  # Determines whether to advance or request more detail.
        state = payload["state"]
        evaluation = payload["evaluation"]
        assert evaluation is not None
        sufficient = (
            evaluation.confidence >= self._confidence_threshold
            or evaluation.disposition == "complete"
            or len(state.attempts) >= self._max_attempts
        )
        if sufficient:
            state.done = True
            state.pending_question = None
            payload["follow_up"] = None
        else:
            state.done = False
        return payload

    def _compose_followup(self, payload: _CriterionPayload) -> _CriterionPayload:  # Crafts a follow-up prompt when confidence is low.
        state = payload["state"]
        evaluation = payload["evaluation"]
        assert evaluation is not None
        directive = state.directive
        hint = directive.directive.follow_up_hint or "Please expand on a different example or angle."
        follow_up = (
            f"Thanks for the context so far. {hint.strip()} "
            f"Focus on: {directive.criterion_name}."
        )
        state.pending_question = follow_up
        payload["follow_up"] = follow_up
        return payload

    def _route_after_check(self, payload: _CriterionPayload) -> str:  # Routes either to END or the follow-up node.
        state = payload["state"]
        return END if state.done else "compose_followup"
