from pydantic import BaseModel, Field  # Models warm-up guidance payloads.


class WarmupPrompt(BaseModel):  # Captures warm-up question phrasing.
    greeting: str = Field(..., min_length=1)
    question: str = Field(..., min_length=1)
    objective: str = Field(..., min_length=1)


class WarmupTurn(BaseModel):  # Represents a full warm-up interaction plan.
    prompt: WarmupPrompt
    follow_up: str = Field(..., min_length=1)
    tone: str = Field(..., min_length=1)
