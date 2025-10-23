from pydantic import BaseModel, Field  # Defines evaluation verdict schemas.


class EvaluationEvidence(BaseModel):  # Summarizes evidence captured per competency.
    competency_id: str = Field(..., min_length=1)
    notes: str = Field(..., min_length=1)
    provisional_score: float = Field(..., ge=0, le=1)


class EvaluationVerdict(BaseModel):  # Conveys the final evaluation package.
    overall_score: float = Field(..., ge=0, le=1)
    recommendation: str = Field(..., min_length=1)
    evidence: list[EvaluationEvidence] = Field(default_factory=list)
    risk_flags: list[str] = Field(default_factory=list)
