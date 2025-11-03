from typing import Literal

from pydantic import BaseModel  # Defines API config schema.


class UiCandidateLevelModel(BaseModel):  # Describes a selectable candidate level.
    id: str
    label: str
    index: int


class UiCandidateConfigModel(BaseModel):  # Groups candidate level defaults and options.
    default_level: str
    levels: list[UiCandidateLevelModel]


class UiConfigModel(BaseModel):  # Represents UI-specific configuration.
    default_view_mode: Literal["interviewer", "candidate"]
    tts_enabled: bool
    auto_candidate_reply: bool
    candidate_levels: UiCandidateConfigModel
