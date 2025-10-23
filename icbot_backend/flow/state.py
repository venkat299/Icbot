from __future__ import annotations

from pydantic import BaseModel, Field  # Defines dynamic flow state container.

from ..schemas.competency import CompetencyPlan  # Ensures state tracks competency plan metadata.


class FlowState(BaseModel):  # Runtime payload passed between LangGraph nodes.
    plan: CompetencyPlan
    current_stage: str | None = None
    visited: list[str] = Field(default_factory=list)
    stage_styles: dict[str, str] = Field(default_factory=dict)
    competency_index: int = 0

    def advance(  # Returns a new state instance with updated stage metadata.
        self,
        stage_id: str,
        *,
        style_id: str | None = None,
        index: int | None = None,
    ) -> "FlowState":
        updated = self.model_copy(deep=True)
        updated.current_stage = stage_id
        updated.visited.append(stage_id)
        if style_id:
            updated.stage_styles[stage_id] = style_id
        if index is not None:
            updated.competency_index = index
        return updated
