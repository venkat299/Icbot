from __future__ import annotations  # Provides the runtime facade for style directives.

import logging
from collections.abc import Mapping

from .base import StagePlan, StyleDirectiveRequest, StyleState
from .planner import StyleGraphBlueprint, build_style_graph
from .registry import StylesRegistry, get_registry


logger = logging.getLogger(__name__)


class StyleRuntime:  # Generates directives by orchestrating style-specific graphs.
    def __init__(self, registry: StylesRegistry | None = None) -> None:
        self._registry = registry or get_registry()
        self._graphs: dict[str, StyleGraphBlueprint] = {}
        self._preload_graphs()

    async def next_directive(self, request: StyleDirectiveRequest) -> StagePlan:  # Returns the next directive for a style.
        blueprint = self._resolve_graph(request.style_id)
        state = request.state or StyleState()
        payload: dict[str, object] = {
            "request": request,
            "state": state,
            "plan": None,
            "stage_id": None,
            "task_id": None,
        }
        result: Mapping[str, object] = await blueprint.graph.ainvoke(payload)
        plan = result.get("plan")
        if isinstance(plan, StagePlan):
            return plan
        if plan is None:
            updated_state = result.get("state", state)
            if isinstance(updated_state, StyleState) and updated_state.done:
                logger.warning(
                    "Style runtime exhausted directives without plan | style=%s stage_index=%s task_cursor=%s completed=%s",
                    request.style_id,
                    updated_state.stage_index,
                    updated_state.task_cursor,
                    updated_state.completed_tasks,
                )
                raise ValueError(f"Style '{request.style_id}' has no remaining directives")
            raise RuntimeError(f"Style '{request.style_id}' did not produce a directive")
        raise RuntimeError(f"Unexpected plan payload returned for style '{request.style_id}'")

    def _resolve_graph(self, style_id: str) -> StyleGraphBlueprint:  # Lazily compiles and caches graphs per style.
        cached = self._graphs.get(style_id)
        if cached:
            return cached
        spec = self._registry.get(style_id)
        blueprint = build_style_graph(spec)
        self._graphs[style_id] = blueprint
        return blueprint

    def _preload_graphs(self) -> None:  # Precompiles graphs for all configured styles.
        for style_id in self._registry.list_ids():
            if style_id in self._graphs:
                continue
            spec = self._registry.get(style_id)
            self._graphs[style_id] = build_style_graph(spec)
