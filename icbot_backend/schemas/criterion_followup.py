# Defines schema models for criterion follow-up generation.
from __future__ import annotations

from pydantic import BaseModel, Field


class CriterionFollowUpRequest(BaseModel):  # Captures context needed to draft a follow-up question.
    competency_name: str = Field(..., min_length=1)
    criterion_name: str = Field(..., min_length=1)
    criterion_description: str = Field(..., min_length=1)
    latest_question: str = Field(..., min_length=1)
    candidate_answer: str = Field(..., min_length=1)
    evaluation_level: str = Field(..., min_length=1)
    evaluation_confidence: float = Field(..., ge=0.0, le=1.0)
    evaluation_notes: str | None = None
    candidate_focus: list[str] = Field(default_factory=list)
    evidence_focus: list[str] = Field(default_factory=list)
    attempt_count: int = Field(default=1, ge=1)


class CriterionFollowUp(BaseModel):  # Represents a synthesized follow-up question.
    question: str = Field(..., min_length=1)

