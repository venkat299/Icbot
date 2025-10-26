from typing import Literal

from pydantic import BaseModel  # Defines API config schema.


class UiConfigModel(BaseModel):  # Represents UI-specific configuration.
    default_view_mode: Literal["interviewer", "candidate"]
    tts_enabled: bool
    auto_candidate_reply: bool
