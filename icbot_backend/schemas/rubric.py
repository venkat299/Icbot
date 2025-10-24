from pydantic import BaseModel, Field  # Defines rubric response payloads.


class RubricCriterion(BaseModel):  # Represents a single rubric criterion.
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    weight: float = Field(..., ge=0, le=100)


class RubricCategory(BaseModel):  # Groups related rubric criteria.
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    criteria: list[RubricCriterion] = Field(default_factory=list)


class RubricModel(BaseModel):  # Summarizes the rubric produced by the LLM.
    role: str = Field(..., min_length=1)
    seniority_level: str = Field(..., min_length=1)
    categories: list[RubricCategory] = Field(default_factory=list)


class RubricCompetencyInput(BaseModel):  # Captures competency context for rubric design.
    competency_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    style_id: str = Field(..., min_length=1)
    rationale: str | None = None


class RubricRequest(BaseModel):  # Defines rubric generation inputs.
    job_description: str = Field(..., min_length=20)
    resume_text: str | None = None
    competencies: list[RubricCompetencyInput] = Field(..., min_length=1)
