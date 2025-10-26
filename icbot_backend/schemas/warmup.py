from typing import Literal

from pydantic import BaseModel, Field  # Models warm-up guidance payloads.


class WarmupRequest(BaseModel):  # Captures inputs required to craft the warm-up exchange.
    candidate_name: str | None = None
    job_title: str | None = None
    resume_text: str | None = None
    competency_focus: list[str] = Field(default_factory=list)
    interview_style: str | None = None


class WarmupPrompt(BaseModel):  # Captures warm-up question phrasing.
    greeting: str = Field(..., min_length=1)
    question: str = Field(..., min_length=1)
    objective: str = Field(..., min_length=1)


class WarmupContext(BaseModel):  # Persists normalized warm-up context.
    candidate_name: str | None = None
    job_title: str | None = None
    interview_style: str | None = None
    competency_focus: list[str] = Field(default_factory=list)
    resume_excerpt: str | None = None


class WarmupHistoryEntry(BaseModel):  # Records transcript messages.
    role: Literal["interviewer", "candidate"]
    text: str = Field(..., min_length=1)


class WarmupState(BaseModel):  # Tracks warm-up session progress.
    history: list[WarmupHistoryEntry] = Field(default_factory=list)
    last_question: str | None = None
    last_answer: str | None = None
    turns: int = 0
    comfort: float = 0.0
    done: bool = False
    context: WarmupContext = Field(default_factory=WarmupContext)


class WarmupComfortScore(BaseModel):  # Represents readiness score outputs.
    comfort: float = Field(..., ge=0.0, le=1.0)


class WarmupTurn(BaseModel):  # Represents a full warm-up interaction plan.
    prompt: WarmupPrompt
    tone: str = Field(..., min_length=1)
    follow_up: str | None = Field(default=None)
    state: WarmupState | None = None


class WarmupFollowUpRequest(BaseModel):  # Captures inputs needed to draft a tailored follow-up.
    prompt: WarmupPrompt
    candidate_response: str = Field(..., min_length=1)
    tone: str = Field(..., min_length=1)
    candidate_name: str | None = None
    job_title: str | None = None
    interview_style: str | None = None
    competency_focus: list[str] = Field(default_factory=list)
    state: WarmupState | None = None


class WarmupFollowUp(BaseModel):  # Represents an adaptive warm-up follow-up question.
    follow_up: str | None = None
    state: WarmupState | None = None
