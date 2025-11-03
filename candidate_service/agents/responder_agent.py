# Implements candidate reply agent using the shared LLM gateway.
from __future__ import annotations

from typing import Iterable

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage  # Supplies LangChain chat message types.
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder  # Builds structured prompts for LLMs.

from icbot_backend.config import load_app_config  # Loads shared application config.
from icbot_backend.llm_gateway import runnable  # Provides schema-enforced LangChain runnable.
from icbot_backend.registry import resolve_binding  # Resolves registry bindings to routes and schemas.

from ..prompts import (  # Imports prompt templates.
    CANDIDATE_BASE_SYSTEM_PROMPT,
    CANDIDATE_LEVEL_PROMPTS,
    CANDIDATE_PROMPT_RESOURCES,
    CANDIDATE_USER_TEMPLATE,
)
from ..schemas import (  # Imports schema models for payload handling.
    CandidateLevel,
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
        self._candidate_cfg = app_config.candidate
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", CANDIDATE_BASE_SYSTEM_PROMPT),
                ("system", "{level_prompt}"),
                ("system", "{post_processing_prompt}"),
                ("system", "{generation_notes_prompt}"),
                ("system", "{response_format_prompt}"),
                MessagesPlaceholder("conversation"),
                ("human", CANDIDATE_USER_TEMPLATE),
            ]
        )
        self._chain = prompt | runnable(route, schema, extra_hint="Keep the reply grounded and specific.")
        self._post_processing_prompt = self._resolve_prompt_resource(app_config.candidate.post_processing_prompt_id)
        self._generation_notes_prompt = self._resolve_prompt_resource(app_config.candidate.generation_notes_prompt_id)
        self._response_format_prompt = self._resolve_prompt_resource(app_config.candidate.response_format_prompt_id)

    async def respond(self, request: CandidateReplyRequest) -> CandidateReply:  # Returns a candidate-style reply for the question.
        conversation = self._build_conversation(request.conversation)
        persona_summary = self._summarize_persona(request.persona)
        level_label, level_prompt = self._resolve_level_prompt(request.level, request.question)
        payload = {
            "level_prompt": level_prompt,
            "post_processing_prompt": self._post_processing_prompt,
            "generation_notes_prompt": self._generation_notes_prompt,
            "response_format_prompt": self._response_format_prompt,
            "conversation": conversation,
            "criterion_or_question": request.question,
            "persona_summary": persona_summary,
            "level_label": level_label,
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

    def _resolve_level_prompt(self, level: CandidateLevel, question: str) -> tuple[str, str]:  # Maps request level to prompt text and label.
        settings = self._candidate_cfg.levels.get(level.value)
        if not settings:
            raise ValueError(f"Candidate level '{level.value}' is not configured.")
        template = CANDIDATE_LEVEL_PROMPTS.get(settings.prompt_id)
        if not template:
            raise ValueError(f"Prompt '{settings.prompt_id}' is not defined for candidate replies.")
        prompt_text = template.replace("${criterion_or_question}", question)
        return settings.label, prompt_text

    def _resolve_prompt_resource(self, prompt_id: str) -> str:  # Retrieves shared prompt resources by identifier.
        resource = CANDIDATE_PROMPT_RESOURCES.get(prompt_id)
        if resource is None:
            raise ValueError(f"Prompt resource '{prompt_id}' is not defined for candidate replies.")
        return resource
