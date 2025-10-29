from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field  # Defines interview persistence schemas.

from .wrapup_summary import WrapupSummary  # Imports wrap-up summary schema.


class ScheduledCompetency(BaseModel):  # Represents a competency attached to an interview.
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    interview_style: str = Field(..., min_length=1)
    rationale: str | None = None


class ScheduledTranscriptEntry(BaseModel):  # Stores transcript exchange for completed interviews.
    role: Literal["interviewer", "candidate"]
    text: str = Field(..., min_length=1)


class ScheduledCriterionResult(BaseModel):  # Stores per-criterion evaluation snapshot.
    competency_id: str = Field(..., min_length=1)
    competency_name: str = Field(..., min_length=1)
    criterion_id: str = Field(..., min_length=1)
    criterion_name: str = Field(..., min_length=1)
    level: int | None = Field(default=None, ge=0, le=5)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    notes: str | None = None


class ScoreDetail(BaseModel):  # Captures scoring metadata for completed interviews.
    criteria: str = Field(..., min_length=1)
    score: int = Field(..., ge=0, le=100)
    feedback: str = Field(..., min_length=1)


class RubricCriterionModel(BaseModel):  # Describes a single rubric criterion record.
    name: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    weight: int = Field(..., ge=0, le=100)
    scoring_levels: dict[str, str] | None = None


class RubricCategoryModel(BaseModel):  # Groups rubric criteria by evaluation category.
    category: str = Field(..., min_length=1)
    criteria: list[RubricCriterionModel] = Field(default_factory=list)


class ScheduledRubric(BaseModel):  # Represents the rubric snapshot used during scheduling.
    candidate_name: str = Field(..., min_length=1)
    position: str = Field(..., min_length=1)
    evaluation_criteria: list[RubricCategoryModel] = Field(default_factory=list)


class ScheduleInterviewRequest(BaseModel):  # Defines payload required to persist an interview.
    job_title: str = Field(..., min_length=1)
    candidate_name: str = Field(..., min_length=1)
    job_description: str = Field(..., min_length=1)
    resume: str = Field(..., min_length=1)
    competencies: list[ScheduledCompetency] = Field(min_length=1)
    rubric: ScheduledRubric


class ScheduledInterviewModel(ScheduleInterviewRequest):  # Extends request payload with runtime fields.
    id: str = Field(..., min_length=1)
    scheduled_date: datetime
    status: Literal["scheduled", "completed"] = "scheduled"
    overall_score: int | None = Field(default=None, ge=0, le=100)
    score_details: list[ScoreDetail] | None = None
    transcript: list[ScheduledTranscriptEntry] = Field(default_factory=list)
    criterion_results: list[ScheduledCriterionResult] = Field(default_factory=list)
    wrapup_summary: WrapupSummary | None = None
