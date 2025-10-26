from __future__ import annotations  # Provides shared helpers for style runtimes.

from typing import Iterable

from langchain_core.messages import BaseMessage, ChatMessage

from .base import TranscriptTurn


def transcript_to_messages(turns: Iterable[TranscriptTurn]) -> list[BaseMessage]:  # Converts transcript turns to LangChain messages.
    return [ChatMessage(role=turn.role, content=turn.text) for turn in turns]


def summarize_transcript(turns: list[TranscriptTurn], limit: int = 6) -> str:  # Builds a compact transcript digest.
    if not turns:
        return "No prior exchanges."
    recent = turns[-limit:]
    return "\n".join(f"{turn.role.capitalize()}: {turn.text}" for turn in recent)


def render_lines(values: list[str], prefix: str = "- ") -> str:  # Formats list entries for prompt injection.
    cleaned = [value.strip() for value in values if value.strip()]
    if not cleaned:
        return "- None"
    return "\n".join(f"{prefix}{value}" for value in cleaned)


def format_inline(values: list[str]) -> str:  # Collapses list entries into a comma-delimited string.
    cleaned = [value.strip() for value in values if value.strip()]
    return ", ".join(cleaned) if cleaned else ""


def clamp_excerpt(text: str | None, limit: int = 1200) -> str:  # Limits resume text length for prompts.
    if not text:
        return "No resume excerpt provided."
    trimmed = text.strip()
    return trimmed if len(trimmed) <= limit else f"{trimmed[:limit]}..."
