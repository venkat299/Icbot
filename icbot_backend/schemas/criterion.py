from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field  # Defines criterion-level runtime models.

from ..styles import DirectiveSchema, InteractiveQuestion  # Reuses directive schema for stored prompts.
from ..confidence import ConfidencePosterior, ConfidenceSummary  # Reuses Bayesian confidence models.


class CriterionDirective(BaseModel):  # Stores the directive and metadata for a rubric criterion.
    competency_id: str = Field(..., min_length=1)
    competency_name: str = Field(..., min_length=1)
    criterion_id: str = Field(..., min_length=1)
    criterion_name: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    weight: int = Field(..., ge=0, le=100)
    directive: DirectiveSchema
    question: str = Field(..., min_length=1)
    interactive_question: InteractiveQuestion | None = None


class CriterionAttempt(BaseModel):  # Captures a single Q/A cycle for a criterion.
    question: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)
    level: int | None = Field(default=None, ge=0, le=5)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    notes: str | None = None


class CriterionState(BaseModel):  # Tracks runtime progress for a criterion.
    directive: CriterionDirective
    attempts: list[CriterionAttempt] = Field(default_factory=list)
    level: int | None = Field(default=None, ge=0, le=5)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    done: bool = False
    pending_question: str | None = None
    confidence_posterior: ConfidencePosterior | None = None

    def register_attempt(
        self,
        attempt: CriterionAttempt,
        *,
        posterior: ConfidencePosterior,
        summary: ConfidenceSummary,
    ) -> "CriterionState":  # Adds attempt and updates aggregated confidence.
        updated = self.model_copy(deep=True)
        updated.attempts.append(attempt)
        updated.level = summary.level
        updated.confidence = summary.confidence
        updated.confidence_posterior = posterior
        return updated


class EvaluationRequest(BaseModel):  # Provides evaluator inputs for a response.
    competency_id: str = Field(..., min_length=1)
    competency_name: str = Field(..., min_length=1)
    criterion_id: str = Field(..., min_length=1)
    criterion_name: str = Field(..., min_length=1)
    criterion_description: str = Field(..., min_length=1)
    directive: DirectiveSchema
    question: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)
    transcript: list[CriterionAttempt] = Field(default_factory=list)


class EvaluationResult(BaseModel):  # Evaluator output for a criterion attempt.
    level: int = Field(..., ge=0, le=5)
    confidence: float = Field(..., ge=0.0, le=1.0)
    notes: str | None = None
    disposition: Literal["complete", "follow_up"] = "complete"
