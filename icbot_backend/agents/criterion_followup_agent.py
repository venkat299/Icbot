from __future__ import annotations  # Generates criterion-specific follow-up questions using the shared LLM gateway.

from langchain_core.prompts import ChatPromptTemplate  # Builds structured prompts.

from ..config import load_app_config  # Loads app configuration.
from ..llm_gateway import runnable  # Provides schema-enforced runnable.
from ..registry import resolve_binding  # Resolves registry bindings.
from ..prompts import pick_criterion_follow_up_prompts  # Imports prompt selector.
from ..schemas.criterion_followup import CriterionFollowUp, CriterionFollowUpRequest  # Imports schema models.


class CriterionFollowUpAgent:  # Synthesizes targeted interviewer follow-up questions.
    def __init__(self) -> None:  # Prepares routing and schema for follow-up LLM calls.
        app_config = load_app_config()
        route, schema = resolve_binding("criterion.followup", app_config)
        hint = "Respond with a JSON object containing only the 'question' field."
        self._route = route
        self._schema = schema
        self._hint = hint

    async def generate(self, request: CriterionFollowUpRequest) -> CriterionFollowUp:  # Returns a direct follow-up question.
        system_prompt, user_template = pick_criterion_follow_up_prompts()
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system_prompt),
                ("human", user_template),
            ]
        )
        chain = prompt | runnable(self._route, self._schema, extra_hint=self._hint)
        payload = request.model_dump()
        payload["candidate_focus"] = ", ".join(request.candidate_focus) or "None"
        payload["evidence_focus"] = ", ".join(request.evidence_focus) or "None"
        payload["evaluation_notes"] = request.evaluation_notes or "No evaluator notes provided."
        return await chain.ainvoke(payload)
