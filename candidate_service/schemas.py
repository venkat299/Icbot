# Declares Pydantic models for candidate responder service.
from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, validator  # Validates candidate payloads.


class CandidateRole(str, Enum):  # Enumerates supported chat roles.
    INTERVIEWER = "interviewer"
    CANDIDATE = "candidate"


class CandidateMessage(BaseModel):  # Represents a single chat message in the interview log.
    role: CandidateRole
    text: str = Field(..., min_length=1)

    @validator("text")
    def _strip_text(cls, value: str) -> str:  # Normalizes whitespace in messages.
        return value.strip()


class CandidatePersona(BaseModel):  # Captures persona attributes for candidate simulation.
    name: str | None = None
    title: str | None = None
    years_experience: int | None = Field(default=None, ge=0)
    specialties: list[str] = Field(default_factory=list)
    tone: Literal["enthusiastic", "calm", "confident", "reflective", "direct", "warm"] | None = None


class CandidateReplyRequest(BaseModel):  # Defines request payload for generating a candidate reply.
    question: str = Field(..., min_length=1)
    conversation: list[CandidateMessage] = Field(default_factory=list)
    persona: CandidatePersona | None = None

    @validator("question")
    def _trim_question(cls, value: str) -> str:  # Ensures interviewer question is trimmed.
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Question cannot be empty.")
        return trimmed


class CandidateReply(BaseModel):  # Defines structured response returned to callers.
    reply: str = Field(..., min_length=1)
    tone: str = Field(..., min_length=1)
    confidence: float = Field(..., ge=0.0, le=1.0)
