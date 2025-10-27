from __future__ import annotations

from enum import Enum
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field  # Defines session payload contracts.

from ..schemas.interview import ScheduledInterviewModel, ScheduledCompetency  # Interview data schemas.
from ..schemas.warmup import WarmupState, WarmupTurn  # Warm-up state payloads.
from ..styles import StyleState, TranscriptTurn  # Style runtime models.


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


class InterviewSessionEvent(BaseModel):  # Carries client events into the session manager.
    event: SessionEventType
    text: str = Field(..., min_length=1)


class InterviewSessionResponse(BaseModel):  # Returns the next step in the interview flow.
    session_id: str = Field(..., min_length=1)
    stage: Literal["warmup", "competency", "wrapup", "completed"]
    messages: list[SessionMessage] = Field(default_factory=list)
    done: bool = False
    competency_id: str | None = None


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
    competency_index: int = 0
    style_states: dict[str, StyleState] = Field(default_factory=dict)
    competency_finished: dict[str, bool] = Field(default_factory=dict)
    transcript: list[TranscriptEntry] = Field(default_factory=list)

    @property
    def active_competency(self) -> ScheduledCompetency | None:  # Returns the current competency entry.
        if self.competency_index < 0:
            return None
        competencies = self.interview.competencies
        if self.competency_index >= len(competencies):
            return None
        return competencies[self.competency_index]

    def transcript_turns(self) -> list[TranscriptTurn]:  # Converts transcript entries to style turns.
        return [entry.as_turn() for entry in self.transcript]
