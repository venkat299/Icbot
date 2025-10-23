from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from langgraph.graph import END, StateGraph  # Builds runtime graph structure.

from ..config import FlowConfig  # Provides flow constraints and stage scaffold.
from ..schemas.competency import CompetencyItem, CompetencyPlan  # Supplies competency plan data.
from .state import FlowState  # Flow state model propagated through nodes.


@dataclass(frozen=True)
class FlowBlueprint:  # Encapsulates a compiled graph and supporting metadata.
    graph: StateGraph
    initial_state: FlowState
    stage_sequence: list[str]
    stage_styles: dict[str, str]
    plan: CompetencyPlan


def build_flow_blueprint(plan: CompetencyPlan, config: FlowConfig) -> FlowBlueprint:  # Builds a dynamic flow from competency plan.
    competencies = plan.competencies
    limits = config.competency
    if not competencies:
        raise ValueError("Competency plan is empty")
    if len(competencies) < limits.min or len(competencies) > limits.max:
        raise ValueError(f"Competency count {len(competencies)} outside configured bounds {limits.min}-{limits.max}")

    stage_sequence: list[str] = []
    stage_styles: dict[str, str] = {}

    for stage_id in config.stages:
        if stage_id.lower() == "competency":
            stage_sequence.extend(_expand_competency_sequence(competencies, stage_styles))
        else:
            stage_sequence.append(stage_id)

    enriched_plan = plan.model_copy(update={"stage_sequence": stage_sequence, "stage_styles": stage_styles})

    graph = StateGraph(FlowState)
    for stage in stage_sequence:
        if stage.startswith("competency-"):
            index = int(stage.split("-")[1]) - 1
            graph.add_node(stage, _competency_node(stage, index, competencies[index]))
        else:
            graph.add_node(stage, _stage_node(stage))

    if stage_sequence:
        graph.set_entry_point(stage_sequence[0])
        for current, nxt in zip(stage_sequence, stage_sequence[1:]):
            graph.add_edge(current, nxt)
        graph.add_edge(stage_sequence[-1], END)

    initial_state = FlowState(plan=enriched_plan, stage_styles=stage_styles)
    compiled = graph.compile()
    return FlowBlueprint(
        graph=compiled,
        initial_state=initial_state,
        stage_sequence=stage_sequence,
        stage_styles=stage_styles,
        plan=enriched_plan,
    )


def _expand_competency_sequence(competencies: list[CompetencyItem], stage_styles: dict[str, str]) -> list[str]:
    sequence: list[str] = []
    for index, item in enumerate(competencies, start=1):
        stage_id = f"competency-{index}"
        sequence.append(stage_id)
        stage_styles[stage_id] = item.style_id
    return sequence


def _stage_node(stage_id: str) -> Callable[[FlowState], FlowState]:
    def _node(state: FlowState) -> FlowState:
        return state.advance(stage_id)

    return _node


def _competency_node(stage_id: str, index: int, item: CompetencyItem) -> Callable[[FlowState], FlowState]:
    def _node(state: FlowState) -> FlowState:
        return state.advance(stage_id, style_id=item.style_id, index=index)

    return _node
