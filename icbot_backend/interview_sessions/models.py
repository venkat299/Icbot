from __future__ import annotations

from enum import Enum
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field  # Defines session payload contracts.

from ..schemas.interview import ScheduledInterviewModel  # Interview data schemas.
from ..schemas.warmup import WarmupState, WarmupTurn  # Warm-up state payloads.
from ..styles import InteractiveQuestion, TranscriptTurn  # Style runtime models.
from ..schemas.criterion import CriterionState  # Criterion runtime models.


class SessionEventType(str, Enum):  # Enumerates events that mutate a session.
    INTERVIEWER_MESSAGE = "interviewer_message"
    CANDIDATE_REPLY = "candidate_reply"


class SessionMessage(BaseModel):  # Represents a message emitted to the UI.
    message_id: str = Field(default_factory=lambda: uuid4().hex)
    role: Literal["system", "directive", "interviewer", "candidate"]
    text: str = Field(..., min_length=1)
    expect_candidate_reply: bool = False
    objective: str | None = None
    metadata: dict[str, str] = Field(default_factory=dict)
    interactive_question: InteractiveQuestion | None = None


class SidebarCriterion(BaseModel):  # Describes criterion status for the sidebar snapshot.
    name: str = Field(..., min_length=1)
    level: int | None = Field(default=None, ge=0, le=5)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    status: Literal["pending", "in_progress", "follow_up", "complete"] = "pending"
    max_level: int = Field(default=5, ge=1)


class SidebarSnapshot(BaseModel):  # Aggregates sidebar data for interviewer insights.
    stage: Literal["warmup", "competency", "wrapup", "completed"]
    current_competency: str | None = None
    current_criterion: str | None = None
    interview_style: str | None = None
    directive_objective: str | None = None
    evaluation_status: Literal["pending", "in_progress", "follow_up", "complete"] = "pending"
    proficiency_level: int | None = Field(default=None, ge=0, le=5)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    scoring_levels: dict[str, str] = Field(default_factory=dict)
    criteria: list[SidebarCriterion] = Field(default_factory=list)
    score_notes: str | None = None
    overall_score: int | None = Field(default=None, ge=0, le=100)
    red_flags: list[str] = Field(default_factory=list)


class InterviewSessionEvent(BaseModel):  # Carries client events into the session manager.
    event: SessionEventType
    text: str = Field(..., min_length=1)


class InterviewSessionResponse(BaseModel):  # Returns the next step in the interview flow.
    session_id: str = Field(..., min_length=1)
    stage: Literal["warmup", "competency", "wrapup", "completed"]
    messages: list[SessionMessage] = Field(default_factory=list)
    done: bool = False
    competency_id: str | None = None
    sidebar: SidebarSnapshot | None = None


class TranscriptEntry(BaseModel):  # Tracks interviewer/candidate transcript history.
    role: Literal["interviewer", "candidate"]
    text: str = Field(..., min_length=1)

    def as_turn(self) -> TranscriptTurn:  # Converts to style transcript turn.
        return TranscriptTurn(role=self.role, text=self.text)


class InterviewSessionState(BaseModel):  # Persists session runtime data.
    session_id: str = Field(..., min_length=1)
    interview: ScheduledInterviewModel
    stage: Literal["warmup", "competency", "wrapup", "completed"] = "warmup"
    warmup_plan: WarmupTurn | None = None
    warmup_state: WarmupState | None = None
    transcript: list[TranscriptEntry] = Field(default_factory=list)
    criteria: list[CriterionState] = Field(default_factory=list)
    criterion_index: int = 0

    @property
    def active_criterion(self) -> CriterionState | None:  # Returns the criterion currently in focus.
        if self.criterion_index < 0:
            return None
        if self.criterion_index >= len(self.criteria):
            return None
        return self.criteria[self.criterion_index]

    def transcript_turns(self) -> list[TranscriptTurn]:  # Converts transcript entries to style turns.
        return [entry.as_turn() for entry in self.transcript]
