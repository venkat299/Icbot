from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field  # Defines interview report payloads.


class ResumeEducation(BaseModel):  # Captures education entries parsed from the resume.
    institution: str = Field(..., min_length=1)
    credential: str = Field(..., min_length=1)
    graduated: str = Field(..., min_length=1)


class ResumeProject(BaseModel):  # Captures notable resume projects.
    name: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)


class ResumeSummary(BaseModel):  # Summarizes resume highlights for the report.
    headline: str = Field(..., min_length=1)
    highlights: list[str] = Field(default_factory=list)
    education: list[ResumeEducation] = Field(default_factory=list)
    notable_projects: list[ResumeProject] = Field(default_factory=list)


class CandidateProfile(BaseModel):  # Represents the candidate metadata.
    candidate_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)
    linked_profile: str | None = None
    experience_years: float | None = None
    resume_summary: ResumeSummary


class JobDescriptionSummary(BaseModel):  # Summarizes the target role metadata.
    mission: str = Field(..., min_length=1)
    core_responsibilities: list[str] = Field(default_factory=list)
    key_requirements: list[str] = Field(default_factory=list)


class PositionProfile(BaseModel):  # Represents the position metadata.
    job_title: str = Field(..., min_length=1)
    requisition_id: str = Field(..., min_length=1)
    hiring_manager: str = Field(..., min_length=1)
    job_description_summary: JobDescriptionSummary


class InterviewMetadata(BaseModel):  # Captures scheduling details for the interview.
    interview_id: str = Field(..., min_length=1)
    scheduled_at: datetime
    duration_minutes: int
    mode: Literal["virtual", "onsite", "hybrid"]
    stage_sequence: list[str] = Field(default_factory=list)


class WarmupOutcome(BaseModel):  # Describes the warm-up result.
    comfort_score: float = Field(ge=0.0, le=1.0)
    ready_signal: bool
    notes: str = Field(..., min_length=1)


class CompetencyProgress(BaseModel):  # Summarizes progression per competency.
    competency_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    interview_style: str = Field(..., min_length=1)
    question_count: int = Field(ge=0)
    time_spent_minutes: int = Field(ge=0)
    transcript_highlights: list[str] = Field(default_factory=list)


class SessionSummary(BaseModel):  # Aggregates session-level summaries.
    warmup_outcome: WarmupOutcome
    competency_progress: list[CompetencyProgress] = Field(default_factory=list)
    wrapup_notes: str = Field(..., min_length=1)


class ScoringThresholds(BaseModel):  # Captures thresholds for evaluation scores.
    strong_positive: int = Field(ge=0)
    lean_positive: int = Field(ge=0)
    neutral: int = Field(ge=0)
    concern: int = Field(ge=0)


class ScoringScale(BaseModel):  # Declares min/max scoring ranges.
    min: int = Field(ge=0)
    max: int = Field(gt=0)
    thresholds: ScoringThresholds


class OverallEvaluation(BaseModel):  # Summarizes the global evaluation.
    status: str = Field(..., min_length=1)
    confidence: float = Field(ge=0.0, le=1.0)
    overall_score: int = Field(ge=0)
    scoring_scale: ScoringScale
    strengths: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)


class CriterionEvidence(BaseModel):  # Stores evidence per evaluation criterion.
    criterion_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    score: int = Field(ge=0)
    max_score: int = Field(gt=0)
    evidence: list[str] = Field(default_factory=list)


class CompetencyResult(BaseModel):  # Summarizes results for a competency.
    competency_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    score: int = Field(ge=0)
    rating: str = Field(..., min_length=1)
    summary: str = Field(..., min_length=1)
    criteria: list[CriterionEvidence] = Field(default_factory=list)


class TranscriptExcerpt(BaseModel):  # Stores transcript highlights.
    stage: str = Field(..., min_length=1)
    speaker: str = Field(..., min_length=1)
    excerpt: str = Field(..., min_length=1)
    timestamp: str = Field(..., min_length=1)


class Attachments(BaseModel):  # References persisted artifacts.
    full_transcript_path: str = Field(..., min_length=1)
    rubric_snapshot_path: str = Field(..., min_length=1)


class LlmCallMetadata(BaseModel):  # Captures metadata for LLM calls contributing to the report.
    registry_key: str = Field(..., min_length=1)
    route: str = Field(..., min_length=1)
    model: str = Field(..., min_length=1)
    base_url: str = Field(..., min_length=1)
    temperature: float = Field(ge=0.0)
    schema: str = Field(..., min_length=1)
    timestamp: datetime


class InterviewReport(BaseModel):  # Represents the complete interview report payload.
    report_id: str = Field(..., min_length=1)
    generated_at: datetime
    generated_by: str = Field(..., min_length=1)
    interview: InterviewMetadata
    candidate: CandidateProfile
    position: PositionProfile
    session_summary: SessionSummary
    overall_evaluation: OverallEvaluation
    competency_results: list[CompetencyResult] = Field(default_factory=list)
    transcript_digest: list[TranscriptExcerpt] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    attachments: Attachments
    llm_metadata: dict[str, LlmCallMetadata] = Field(default_factory=dict)
