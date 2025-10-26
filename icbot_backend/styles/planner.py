from __future__ import annotations  # Builds LangGraph planners for interview styles.

from dataclasses import dataclass
from typing import Awaitable, Callable, TypedDict

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langgraph.graph import END, StateGraph

from ..llm_gateway import runnable
from ..prompts import STYLE_DIRECTIVE_SYSTEM_PROMPT, STYLE_DIRECTIVE_USER_TEMPLATE
from ..registry import resolve_binding
from .base import (
    DirectiveSchema,
    StagePlan,
    StyleDirectiveRequest,
    StyleSpec,
    StyleStageTemplate,
    StyleState,
    StyleTaskTemplate,
)
from .toolkit import clamp_excerpt, format_inline, render_lines, summarize_transcript, transcript_to_messages


class _StyleGraphState(TypedDict):  # Payload exchanged inside the LangGraph runtime.
    request: StyleDirectiveRequest
    state: StyleState
    plan: StagePlan | None
    stage_id: str | None
    task_id: str | None


@dataclass(frozen=True)
class StyleGraphBlueprint:  # Bundles a compiled graph with its originating spec.
    graph: object
    spec: StyleSpec


_PROMPT_CACHE: dict[str, ChatPromptTemplate] = {}


def build_style_graph(spec: StyleSpec) -> StyleGraphBlueprint:  # Compiles the LangGraph for a style.
    if not spec.stages:
        raise ValueError(f"Style '{spec.style_id}' has no stages configured")
    graph = StateGraph(_StyleGraphState)
    graph.add_node("route_stage", _route_stage())
    for stage in spec.stages:
        chain = _build_stage_chain(stage)
        graph.add_node(stage.stage_id, _stage_node(spec, stage, chain))
        graph.add_edge(stage.stage_id, END)
    graph.add_conditional_edges("route_stage", _route_decision(spec))
    graph.set_entry_point("route_stage")
    return StyleGraphBlueprint(graph=graph.compile(), spec=spec)


def _route_stage() -> Callable[[_StyleGraphState], _StyleGraphState]:  # Pass-through node for routing.
    def _node(payload: _StyleGraphState) -> _StyleGraphState:
        return payload

    return _node


def _route_decision(spec: StyleSpec) -> Callable[[_StyleGraphState], str]:  # Chooses the next stage node.
    def _decide(payload: _StyleGraphState) -> str:
        stage_id, task_id = _select_next_cursor(payload["state"], spec)
        if not stage_id or not task_id:
            payload["plan"] = None
            payload["state"] = payload["state"].model_copy(update={"done": True})
            return END
        payload["stage_id"] = stage_id
        payload["task_id"] = task_id
        return stage_id

    return _decide


def _build_stage_chain(stage: StyleStageTemplate) -> Callable[[dict], Awaitable[DirectiveSchema]]:  # Creates the runnable for a stage.
    prompt = _prompt_for(stage.prompt_id)
    route, schema = resolve_binding(stage.registry_key)
    return prompt | runnable(route, schema)


def _prompt_for(prompt_id: str) -> ChatPromptTemplate:  # Returns the chat prompt for a stage template.
    cached = _PROMPT_CACHE.get(prompt_id)
    if cached:
        return cached
    if prompt_id != "directive":
        raise KeyError(f"Unknown style prompt id '{prompt_id}'")
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", STYLE_DIRECTIVE_SYSTEM_PROMPT),
            MessagesPlaceholder("transcript"),
            ("human", STYLE_DIRECTIVE_USER_TEMPLATE),
        ]
    )
    _PROMPT_CACHE[prompt_id] = prompt
    return prompt


def _stage_node(
    spec: StyleSpec,
    stage: StyleStageTemplate,
    chain: Callable[[dict], Awaitable[DirectiveSchema]],
) -> Callable[[
    _StyleGraphState
], Awaitable[_StyleGraphState]]:  # LangGraph node that executes a single stage directive call.
    sequence = stage.task_sequence or list(spec.task_catalog.keys())
    if not sequence:
        raise ValueError(f"Stage '{stage.stage_id}' in style '{spec.style_id}' has no task sequence defined")
    limit = min(len(sequence), stage.max_directives)
    task_lookup = spec.task_catalog

    async def _node(payload: _StyleGraphState) -> _StyleGraphState:
        task_id = payload.get("task_id")
        if not task_id:
            payload["plan"] = None
            payload["state"] = payload["state"].model_copy(update={"done": True})
            return payload
        task = task_lookup.get(task_id)
        if not task:
            raise KeyError(f"Unknown task '{task_id}' for style '{spec.style_id}'")
        request = payload["request"]
        variables = _compose_prompt_vars(spec, stage, task, request)
        directive: DirectiveSchema = await chain.ainvoke(variables)
        next_state = _advance_state(payload["state"], stage, spec, limit, task_id)
        plan = StagePlan(
            style_id=spec.style_id,
            stage_id=stage.stage_id,
            task_id=task_id,
            directive=directive,
            state=next_state,
            done=next_state.done,
        )
        payload.update({"plan": plan, "state": next_state})
        return payload

    return _node


def _compose_prompt_vars(
    spec: StyleSpec,
    stage: StyleStageTemplate,
    task: StyleTaskTemplate,
    request: StyleDirectiveRequest,
) -> dict:  # Builds the prompt variables passed to the runnable.
    transcript_messages = transcript_to_messages(request.transcript)
    digest = summarize_transcript(request.transcript)
    highlights = render_lines(request.highlights)
    guidance = render_lines(request.guidance)
    rubric_focus = format_inline(request.rubric_focus) or "Unspecified"
    return {
        "style_label": spec.label,
        "style_summary": spec.summary,
        "style_persona": spec.persona,
        "stage_id": stage.stage_id,
        "stage_goal": stage.goal,
        "stage_tone": stage.tone,
        "stage_persona_hint": stage.persona_hint or spec.persona,
        "competency_id": request.competency_id,
        "competency_title": request.competency_title,
        "rubric_focus": rubric_focus,
        "highlights": highlights,
        "guidance": guidance,
        "task_id": task.task_id,
        "task_objective": task.objective,
        "task_evidence": render_lines(task.evidence_tags),
        "task_rubric": render_lines(task.rubric_focus),
        "task_response_shape": task.response_shape,
        "resume_excerpt": clamp_excerpt(request.resume_excerpt),
        "transcript_digest": digest,
        "transcript": transcript_messages,
    }


def _advance_state(
    state: StyleState,
    stage: StyleStageTemplate,
    spec: StyleSpec,
    limit: int,
    task_id: str,
) -> StyleState:  # Produces the next style state snapshot.
    completed = [*state.completed_tasks, task_id]
    task_cursor = state.task_cursor + 1
    stage_index = state.stage_index
    done = False
    if task_cursor >= limit:
        task_cursor = 0
        stage_index += 1
        if stage_index >= len(spec.stages):
            done = True
    metadata = {**state.metadata, "last_stage": stage.stage_id, "last_task": task_id}
    return state.model_copy(update={
        "completed_tasks": completed,
        "task_cursor": task_cursor,
        "stage_index": stage_index,
        "done": done,
        "metadata": metadata,
    })


def _select_next_cursor(state: StyleState, spec: StyleSpec) -> tuple[str | None, str | None]:  # Computes the next stage/task pair.
    if state.done or not spec.stages:
        return None, None
    stage_index = state.stage_index
    if stage_index >= len(spec.stages):
        return None, None
    stage = spec.stages[stage_index]
    sequence = stage.task_sequence or list(spec.task_catalog.keys())
    if not sequence:
        raise ValueError(f"Stage '{stage.stage_id}' in style '{spec.style_id}' has no configured tasks")
    limit = min(len(sequence), stage.max_directives)
    if limit == 0:
        return None, None
    if state.task_cursor >= limit:
        if stage_index + 1 >= len(spec.stages):
            return None, None
        next_stage = spec.stages[stage_index + 1]
        next_sequence = next_stage.task_sequence or list(spec.task_catalog.keys())
        if not next_sequence:
            raise ValueError(f"Stage '{next_stage.stage_id}' in style '{spec.style_id}' has no configured tasks")
        return next_stage.stage_id, next_sequence[0]
    task_id = sequence[state.task_cursor]
    return stage.stage_id, task_id
