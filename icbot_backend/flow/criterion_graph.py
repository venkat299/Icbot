from __future__ import annotations

from typing import TypedDict

from langgraph.graph import END, StateGraph  # Provides LangGraph orchestration.

from ..agents.criterion_followup_agent import CriterionFollowUpAgent  # Synthesizes follow-up questions.
from ..agents.evaluation_agent import EvaluationAgent  # Scores criterion responses.
from ..schemas.criterion import CriterionAttempt, CriterionState, EvaluationRequest, EvaluationResult
from ..schemas.criterion_followup import CriterionFollowUpRequest  # Provides follow-up request payload.
from ..confidence import ConfidenceModel, ConfidenceObservation  # Aggregates evaluation signals.


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
        followup_agent: CriterionFollowUpAgent | None = None,
        confidence_model: ConfidenceModel,
        confidence_threshold: float = 0.7,
        min_attempts: int = 1,
        max_attempts: int = 2,
    ) -> None:  # Initializes the criterion flow controller.
        self._evaluator = evaluator
        self._followup = followup_agent or CriterionFollowUpAgent()
        self._confidence_model = confidence_model
        if min_attempts < 1:
            raise ValueError("min_attempts must be at least 1.")
        if min_attempts > max_attempts:
            raise ValueError("min_attempts cannot exceed max_attempts.")
        self._confidence_threshold = confidence_threshold
        self._min_attempts = min_attempts
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
        posterior = state.confidence_posterior or self._confidence_model.initialize()
        observation = ConfidenceObservation(level=evaluation.level, confidence=evaluation.confidence)
        updated_posterior = self._confidence_model.observe(posterior, observation)
        summary = self._confidence_model.summarize(updated_posterior)
        updated = state.register_attempt(
            attempt,
            posterior=updated_posterior,
            summary=summary,
        )
        updated.done = evaluation.disposition == "complete"
        payload["state"] = updated
        return payload

    def _check_confidence(self, payload: _CriterionPayload) -> _CriterionPayload:  # Determines whether to advance or request more detail.
        state = payload["state"]
        evaluation = payload["evaluation"]
        assert evaluation is not None
        attempts = len(state.attempts)
        meets_floor = attempts >= self._min_attempts
        exhausted = attempts >= self._max_attempts
        high_confidence = state.confidence >= self._confidence_threshold
        completed = evaluation.disposition == "complete"
        sufficient = exhausted or (meets_floor and (high_confidence or completed))
        if sufficient:
            state.done = True
            state.pending_question = None
            payload["follow_up"] = None
        else:
            state.done = False
        return payload

    async def _compose_followup(self, payload: _CriterionPayload) -> _CriterionPayload:  # Crafts a follow-up prompt when confidence is low.
        state = payload["state"]
        evaluation = payload["evaluation"]
        assert evaluation is not None
        directive = state.directive
        request = CriterionFollowUpRequest(
            competency_name=directive.competency_name,
            criterion_name=directive.criterion_name,
            criterion_description=directive.description,
            latest_question=payload["question"],
            candidate_answer=payload["answer"],
            evaluation_level=str(evaluation.level),
            evaluation_confidence=state.confidence,
            evaluation_notes=evaluation.notes,
            candidate_focus=directive.directive.candidate_focus,
            evidence_focus=directive.directive.evidence_focus,
            attempt_count=len(state.attempts),
        )
        follow_up_model = await self._followup.generate(request)
        question = follow_up_model.question.strip()
        if not question:
            question = f"Could you share another concrete example for {directive.criterion_name}?"
        if not question.endswith("?"):
            question = f"{question.rstrip('.')}?"
        follow_up = question
        state.pending_question = follow_up
        payload["follow_up"] = follow_up
        return payload

    def _route_after_check(self, payload: _CriterionPayload) -> str:  # Routes either to END or the follow-up node.
        state = payload["state"]
        return END if state.done else "compose_followup"
