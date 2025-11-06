from __future__ import annotations

from pydantic import BaseModel, Field  # Defines competency transition schema.


class CompetencyTransition(BaseModel):  # Represents interviewer transition messaging.
    message: str = Field(..., min_length=8, max_length=320)


__all__ = ["CompetencyTransition"]
