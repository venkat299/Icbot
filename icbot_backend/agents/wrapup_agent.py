from __future__ import annotations

from langchain_core.prompts import ChatPromptTemplate  # Builds the wrap-up prompt pipeline.

from ..llm_gateway import runnable  # Provides JSON-enforced runnable.
from ..prompts.wrapup import (
    WRAPUP_SYSTEM_PROMPT,
    WRAPUP_USER_TEMPLATE,
    WRAPUP_CLOSING_SYSTEM_PROMPT,
    WRAPUP_CLOSING_USER_TEMPLATE,
)  # Supplies prompt strings.
from ..registry import resolve_binding  # Resolves LLM route bindings.
from ..schemas.wrapup_summary import WrapupRequest, WrapupSummary, WrapupClosing  # Defines request/response schemas.


class WrapupAgent:  # Generates interview wrap-up summaries.
    def __init__(self) -> None:
        route_summary, summary_schema = resolve_binding("wrapup.summary")
        summary_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", WRAPUP_SYSTEM_PROMPT),
                ("human", WRAPUP_USER_TEMPLATE),
            ]
        )
        self._summary_chain = summary_prompt | runnable(route_summary, summary_schema)

        route_closing, closing_schema = resolve_binding("wrapup.closing")
        closing_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", WRAPUP_CLOSING_SYSTEM_PROMPT),
                ("human", WRAPUP_CLOSING_USER_TEMPLATE),
            ]
        )
        self._closing_chain = closing_prompt | runnable(route_closing, closing_schema)

    async def summarize(self, request: WrapupRequest, results: str) -> WrapupSummary:
        payload = {
            "candidate_name": request.candidate_name,
            "job_title": request.job_title,
            "results": results,
        }
        return await self._summary_chain.ainvoke(payload)

    async def closing(self, request: WrapupRequest, summary: WrapupSummary, results: str) -> WrapupClosing:
        payload = {
            "candidate_name": request.candidate_name,
            "job_title": request.job_title,
            "summary": summary.closing_statement,
            "strengths": " | ".join(summary.key_strengths) if summary.key_strengths else "None",
            "risks": " | ".join(summary.risk_flags) if summary.risk_flags else "None",
            "next_steps": " | ".join(summary.next_steps) if summary.next_steps else "None",
            "results": results,
        }
        return await self._closing_chain.ainvoke(payload)
