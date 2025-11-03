from __future__ import annotations

from pydantic import BaseModel, Field  # Defines wrap-up request/response schemas.


class WrapupCriterionSummary(BaseModel):  # Captures per-criterion evaluation outcome.
    criterion_id: str = Field(..., min_length=1)
    criterion_name: str = Field(..., min_length=1)
    weight: int = Field(..., ge=0, le=100)
    level: int | None = Field(default=None, ge=0, le=5)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    notes: str | None = None


class WrapupCompetencySummary(BaseModel):  # Aggregates criterion summaries for a competency.
    competency_id: str = Field(..., min_length=1)
    competency_name: str = Field(..., min_length=1)
    criteria: list[WrapupCriterionSummary] = Field(default_factory=list)


class WrapupRequest(BaseModel):  # Input supplied to the wrap-up LLM agent.
    candidate_name: str = Field(..., min_length=1)
    job_title: str = Field(..., min_length=1)
    competencies: list[WrapupCompetencySummary] = Field(default_factory=list)


class WrapupSummary(BaseModel):  # Structured wrap-up response.
    closing_statement: str = Field(..., min_length=1)
    key_strengths: list[str] = Field(default_factory=list)
    risk_flags: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)


class WrapupClosing(BaseModel):  # Holds the closing message delivered to the candidate.
    closing_message: str = Field(..., min_length=1)
