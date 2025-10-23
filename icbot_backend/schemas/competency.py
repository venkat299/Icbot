from pydantic import BaseModel, Field  # Defines competency planning payloads.


class CompetencyRequest(BaseModel):  # Captures inputs required to draft competencies.
    job_description: str = Field(..., min_length=20)
    resume_text: str | None = None
    target_roles: list[str] = Field(default_factory=list)


class CompetencyItem(BaseModel):  # Represents a single competency recommendation.
    competency_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    style_id: str = Field(..., min_length=1)
    rationale: str = Field(..., min_length=1)


class CompetencyPlan(BaseModel):  # Bundles competencies returned by the LLM.
    competencies: list[CompetencyItem] = Field(default_factory=list)
    stage_sequence: list[str] = Field(default_factory=list)
    stage_styles: dict[str, str] = Field(default_factory=dict)
