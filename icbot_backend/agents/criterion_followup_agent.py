# Generates criterion-specific follow-up questions using the shared LLM gateway.
from __future__ import annotations

from langchain_core.prompts import ChatPromptTemplate  # Builds structured prompts.

from ..config import load_app_config  # Loads app configuration.
from ..llm_gateway import runnable  # Provides schema-enforced runnable.
from ..registry import resolve_binding  # Resolves registry bindings.
from ..prompts import (  # Imports prompt assets.
    CRITERION_FOLLOW_UP_SYSTEM_PROMPT,
    CRITERION_FOLLOW_UP_USER_TEMPLATE,
)
from ..schemas.criterion_followup import CriterionFollowUp, CriterionFollowUpRequest  # Imports schema models.


class CriterionFollowUpAgent:  # Synthesizes targeted interviewer follow-up questions.
    def __init__(self) -> None:
        app_config = load_app_config()
        route, schema = resolve_binding("criterion.followup", app_config)
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", CRITERION_FOLLOW_UP_SYSTEM_PROMPT),
                ("human", CRITERION_FOLLOW_UP_USER_TEMPLATE),
            ]
        )
        self._chain = prompt | runnable(route, schema, extra_hint="Return only the interviewer question.")

    async def generate(self, request: CriterionFollowUpRequest) -> CriterionFollowUp:  # Returns a direct follow-up question.
        payload = request.model_dump()
        payload["candidate_focus"] = ", ".join(request.candidate_focus) or "None"
        payload["evidence_focus"] = ", ".join(request.evidence_focus) or "None"
        payload["evaluation_notes"] = request.evaluation_notes or "No evaluator notes provided."
        return await self._chain.ainvoke(payload)

