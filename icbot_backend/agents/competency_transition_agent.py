from __future__ import annotations

from langchain_core.prompts import ChatPromptTemplate  # Builds transition prompt chain.

from ..config import load_app_config  # Loads application configuration.
from ..llm_gateway import runnable  # Provides schema-enforced runnable.
from ..registry import resolve_binding  # Resolves route/schema binding.
from ..prompts.competency_transition import (  # Supplies prompt assets.
    COMPETENCY_TRANSITION_SYSTEM_PROMPT,
    COMPETENCY_TRANSITION_USER_TEMPLATE,
)
from ..schemas.transition import CompetencyTransition  # Uses typed response schema.


class CompetencyTransitionAgent:  # Generates competency transition messaging via LLM.
    def __init__(self) -> None:
        app_config = load_app_config()
        route, schema = resolve_binding("competency.transition", app_config)
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", COMPETENCY_TRANSITION_SYSTEM_PROMPT),
                ("human", COMPETENCY_TRANSITION_USER_TEMPLATE),
            ]
        )
        self._chain = prompt | runnable(route, schema)

    async def compose(
        self,
        *,
        candidate_name: str | None,
        competency_name: str,
        criterion_name: str,
        objective: str,
    ) -> str:  # Returns a succinct transition sentence.
        payload = {
            "candidate_name": candidate_name or "the candidate",
            "competency_name": competency_name,
            "criterion_name": criterion_name,
            "objective": objective,
        }
        response: CompetencyTransition = await self._chain.ainvoke(payload)
        return response.message.strip()
