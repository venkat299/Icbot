from __future__ import annotations

from langchain_core.prompts import ChatPromptTemplate  # Builds LLM prompt pipelines.

from ..llm_gateway import runnable  # Provides JSON-enforced runnable.
from ..prompts.evaluation import EVALUATION_SYSTEM_PROMPT, EVALUATION_USER_TEMPLATE  # Supplies prompt text.
from ..registry import resolve_binding  # Resolves route/schema bindings.
from ..schemas.criterion import EvaluationRequest, EvaluationResult  # Defines request/response models.


class EvaluationAgent:  # Scores criterion responses using an LLM.
    def __init__(self) -> None:
        route, schema = resolve_binding("evaluation.criterion")
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", EVALUATION_SYSTEM_PROMPT),
                ("human", EVALUATION_USER_TEMPLATE),
            ]
        )
        self._chain = prompt | runnable(route, schema)

    async def score(
        self,
        request: EvaluationRequest,
        *,
        rubric_levels: dict[str, str] | None = None,
    ) -> EvaluationResult:  # Scores a single criterion attempt.
        history = "\n".join(
            f"- Level: {attempt.level if attempt.level is not None else 'pending'}, "
            f"Confidence: {attempt.confidence if attempt.confidence is not None else 'pending'}, "
            f"Question: {attempt.question}\n  Answer: {attempt.answer}"
            for attempt in request.transcript
        ) or "- None"
        actions = "\n".join(f"- {item}" for item in request.directive.interviewer_actions) or "- None"
        levels_rendered = "\n".join(f"- {key}: {value}" for key, value in (rubric_levels or {}).items()) or "- Not provided"
        payload = {
            "competency_name": request.competency_name,
            "competency_id": request.competency_id,
            "criterion_name": request.criterion_name,
            "criterion_id": request.criterion_id,
            "criterion_description": request.criterion_description,
            "directive_objective": request.directive.task_brief,
            "directive_actions": actions,
            "question": request.question,
            "answer": request.answer,
            "history": history,
            "scoring_levels": levels_rendered,
        }
        return await self._chain.ainvoke(payload)
