# Implements candidate reply agent using the shared LLM gateway.
from __future__ import annotations

from typing import Iterable

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage  # Supplies LangChain chat message types.
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder  # Builds structured prompts for LLMs.

from icbot_backend.config import load_app_config  # Loads shared application config.
from icbot_backend.llm_gateway import runnable  # Provides schema-enforced LangChain runnable.
from icbot_backend.registry import resolve_binding  # Resolves registry bindings to routes and schemas.

from ..prompts import CANDIDATE_SYSTEM_PROMPT, CANDIDATE_USER_TEMPLATE  # Imports prompt templates.
from ..schemas import (  # Imports schema models for payload handling.
    CandidateMessage,
    CandidatePersona,
    CandidateReply,
    CandidateReplyRequest,
    CandidateRole,
)


class CandidateResponderAgent:  # Generates interview-style replies on behalf of the candidate.
    def __init__(self) -> None:  # Builds prompt chain with JSON-enforced runnable.
        app_config = load_app_config()
        route, schema = resolve_binding("candidate.reply", app_config)
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", CANDIDATE_SYSTEM_PROMPT),
                MessagesPlaceholder("conversation"),
                ("human", CANDIDATE_USER_TEMPLATE),
            ]
        )
        self._chain = prompt | runnable(route, schema, extra_hint="Keep the reply grounded and specific.")

    async def respond(self, request: CandidateReplyRequest) -> CandidateReply:  # Returns a candidate-style reply for the question.
        conversation = self._build_conversation(request.conversation)
        persona_summary = self._summarize_persona(request.persona)
        payload = {
            "conversation": conversation,
            "question": request.question,
            "persona_summary": persona_summary,
        }
        return await self._chain.ainvoke(payload)

    def _build_conversation(self, messages: Iterable[CandidateMessage]) -> list[BaseMessage]:  # Converts stored messages to LangChain chat messages.
        formatted: list[BaseMessage] = []
        for message in messages:
            text = message.text.strip()
            if not text:
                continue
            if message.role == CandidateRole.INTERVIEWER:
                formatted.append(HumanMessage(content=text))
            else:
                formatted.append(AIMessage(content=text))
        return formatted

    def _summarize_persona(self, persona: CandidatePersona | None) -> str:  # Builds persona context string for prompts.
        if not persona:
            return "A mid-level software engineer interviewing for a product-focused role."
        parts: list[str] = []
        if persona.name:
            parts.append(f"Name: {persona.name}")
        if persona.title:
            parts.append(f"Current role: {persona.title}")
        if persona.years_experience is not None:
            parts.append(f"Experience: {persona.years_experience} years")
        if persona.specialties:
            joined = ", ".join(persona.specialties)
            parts.append(f"Specialties: {joined}")
        if persona.tone:
            parts.append(f"Preferred tone: {persona.tone}")
        if not parts:
            return "A thoughtful professional responding candidly to interview questions."
        return "; ".join(parts)
