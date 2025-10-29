from __future__ import annotations

from langchain_core.prompts import ChatPromptTemplate  # Builds the wrap-up prompt pipeline.

from ..llm_gateway import runnable  # Provides JSON-enforced runnable.
from ..prompts.wrapup import WRAPUP_SYSTEM_PROMPT, WRAPUP_USER_TEMPLATE  # Supplies prompt strings.
from ..registry import resolve_binding  # Resolves LLM route bindings.
from ..schemas.wrapup_summary import WrapupRequest, WrapupSummary  # Defines request/response schemas.


class WrapupAgent:  # Generates interview wrap-up summaries.
    def __init__(self) -> None:
        route, schema = resolve_binding("wrapup.summary")
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", WRAPUP_SYSTEM_PROMPT),
                ("human", WRAPUP_USER_TEMPLATE),
            ]
        )
        self._chain = prompt | runnable(route, schema)

    async def summarize(self, request: WrapupRequest, results: str) -> WrapupSummary:
        payload = {
            "candidate_name": request.candidate_name,
            "job_title": request.job_title,
            "results": results,
        }
        return await self._chain.ainvoke(payload)
