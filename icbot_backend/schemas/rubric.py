from pydantic import BaseModel, Field  # Defines rubric response payloads.


class RubricCriterion(BaseModel):  # Represents a single rubric criterion.
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    weight: float = Field(..., ge=0, le=1)


class RubricCategory(BaseModel):  # Groups related rubric criteria.
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    criteria: list[RubricCriterion] = Field(default_factory=list)


class RubricModel(BaseModel):  # Summarizes the rubric produced by the LLM.
    role: str = Field(..., min_length=1)
    seniority_level: str = Field(..., min_length=1)
    categories: list[RubricCategory] = Field(default_factory=list)
