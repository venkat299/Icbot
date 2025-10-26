from __future__ import annotations  # Defines style contracts and runtime state.

from typing import Literal

from pydantic import BaseModel, Field, PositiveInt


class TranscriptTurn(BaseModel):  # Captures transcript entries exchanged so far.
    role: Literal["interviewer", "candidate"]
    text: str = Field(..., min_length=1)


class StyleTaskTemplate(BaseModel):  # Describes a reusable task pattern for directives.
    task_id: str = Field(..., min_length=1)
    objective: str = Field(..., min_length=1)
    rubric_focus: list[str] = Field(default_factory=list)
    evidence_tags: list[str] = Field(default_factory=list)
    interviewer_actions: list[str] = Field(default_factory=list)
    response_shape: str = Field(..., min_length=1)


class StyleStageControls(BaseModel):  # Captures stage-specific runtime hints.
    mode: str | None = None
    probe_min: PositiveInt | None = None
    concept_min: PositiveInt | None = None
    cycle: list[PositiveInt] = Field(default_factory=list)
    scenario_structure: list[str] = Field(default_factory=list)
    tasks: PositiveInt | None = None
    followups: PositiveInt | None = None
    task_catalog: list[str] = Field(default_factory=list)
    triage_levels: list[PositiveInt] = Field(default_factory=list)
    optional: bool = False


class StyleStageTemplate(BaseModel):  # Configures how a stage pulls directives.
    stage_id: str = Field(..., min_length=1)
    prompt_id: str = Field(..., min_length=1)
    registry_key: str = Field(..., min_length=1)
    goal: str = Field(..., min_length=1)
    tone: str = Field(..., min_length=1)
    task_sequence: list[str] = Field(default_factory=list)
    max_directives: PositiveInt = 1
    persona_hint: str | None = None
    controls: StyleStageControls = Field(default_factory=StyleStageControls)


class StyleSpec(BaseModel):  # Aggregates metadata for a single style entry.
    style_id: str = Field(..., min_length=1)
    label: str = Field(..., min_length=1)
    summary: str = Field(..., min_length=1)
    persona: str = Field(..., min_length=1)
    task_catalog: dict[str, StyleTaskTemplate] = Field(default_factory=dict)
    stages: list[StyleStageTemplate] = Field(default_factory=list)


class StyleState(BaseModel):  # Tracks progress across stages and tasks.
    stage_index: int = 0
    task_cursor: int = 0
    completed_tasks: list[str] = Field(default_factory=list)
    done: bool = False
    metadata: dict[str, str] = Field(default_factory=dict)


class DirectiveSchema(BaseModel):  # Defines the LLM directive contract.
    task_id: str = Field(..., min_length=1)
    task_brief: str = Field(..., min_length=1)
    interviewer_actions: list[str] = Field(default_factory=list)
    candidate_focus: list[str] = Field(default_factory=list)
    evidence_focus: list[str] = Field(default_factory=list)
    follow_up_hint: str | None = None
    rubric_reference: str | None = None


class StagePlan(BaseModel):  # Represents a directive plus updated style state.
    style_id: str = Field(..., min_length=1)
    stage_id: str = Field(..., min_length=1)
    task_id: str = Field(..., min_length=1)
    directive: DirectiveSchema
    state: StyleState
    done: bool = False


class StyleDirectiveRequest(BaseModel):  # Carries inputs needed to fetch a directive.
    style_id: str = Field(..., min_length=1)
    competency_id: str = Field(..., min_length=1)
    competency_title: str = Field(..., min_length=1)
    rubric_focus: list[str] = Field(default_factory=list)
    transcript: list[TranscriptTurn] = Field(default_factory=list)
    highlights: list[str] = Field(default_factory=list)
    guidance: list[str] = Field(default_factory=list)
    resume_excerpt: str | None = None
    state: StyleState | None = None
