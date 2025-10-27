# Declares request model for competency stage directives.
from __future__ import annotations

from pydantic import BaseModel, Field

from ..styles import StyleState, TranscriptTurn


class CompetencyStageRequest(BaseModel):  # Captures inputs needed for the next competency directive.
    style_id: str = Field(..., min_length=1)
    competency_id: str = Field(..., min_length=1)
    competency_title: str = Field(..., min_length=1)
    rubric_focus: list[str] = Field(default_factory=list)
    transcript: list[TranscriptTurn] = Field(default_factory=list)
    highlights: list[str] = Field(default_factory=list)
    guidance: list[str] = Field(default_factory=list)
    resume_excerpt: str | None = None
    state: StyleState | None = None
