from __future__ import annotations

import hashlib
import logging
from typing import Iterable

from ..schemas.criterion import CriterionDirective
from ..schemas.interview import RubricCategoryModel, RubricCriterionModel, ScheduledInterviewModel
from ..styles import StyleDirectiveRequest, StyleRuntime


DEFAULT_STYLE_ID = "concept_primer"
logger = logging.getLogger(__name__)


async def generate_criterion_directives(
    interview: ScheduledInterviewModel,
    runtime: StyleRuntime,
    *,
    default_style_id: str = DEFAULT_STYLE_ID,
) -> list[CriterionDirective]:  # Precomputes directives for each rubric criterion.
    directives: list[CriterionDirective] = []
    interactive_coverage: dict[str, bool] = {}
    for competency in interview.competencies:
        style_id = _resolve_style_id(competency.interview_style, default_style_id)
        categories = _find_categories(interview.rubric.evaluation_criteria, competency.name)
        for category in categories:
            for criterion in category.criteria:
                interactive_needed = not interactive_coverage.get(competency.id, False)
                hint: str | None = None
                if interactive_needed:
                    hint = (
                        "Interactive tool request: populate interactive_question with a code, multiple-select, or yes-no task that mirrors the spoken task_brief and fits this criterion."
                    )
                directive = await _build_directive(
                    runtime,
                    style_id,
                    competency.id,
                    competency.name,
                    criterion,
                    interactive_hint=hint,
                )
                if interactive_needed and directive.interactive_question is None:
                    directive = await _build_directive(
                        runtime,
                        style_id,
                        competency.id,
                        competency.name,
                        criterion,
                        interactive_hint=(
                            "MANDATORY interactive tool: the response must include interactive_question (code, multiple-select, or yes-no) aligned with the task_brief so the interviewer can trigger the chat tool."
                        ),
                    )
                if directive.interactive_question is not None:
                    interactive_coverage[competency.id] = True
                directives.append(directive)
    for competency in interview.competencies:
        if not interactive_coverage.get(competency.id, False):
            logger.warning(
                "Interactive tool missing for competency | competency_id=%s name=%s",
                competency.id,
                competency.name,
            )
    return directives


async def _build_directive(
    runtime: StyleRuntime,
    style_id: str,
    competency_id: str,
    competency_name: str,
    criterion: RubricCriterionModel,
    *,
    interactive_hint: str | None = None,
) -> CriterionDirective:  # Generates a single directive/question pair for a criterion.
    guidance = [
        f"Criterion description: {criterion.description}",
        f"Target competency: {competency_name}",
    ]
    if interactive_hint:
        guidance.append(interactive_hint)
    plan = await runtime.next_directive(
        StyleDirectiveRequest(
            style_id=style_id,
            competency_id=competency_id,
            competency_title=competency_name,
            rubric_focus=[criterion.name],
            transcript=[],
            highlights=[],
            guidance=guidance,
            resume_excerpt=None,
            state=None,
        )
    )
    question = plan.directive.task_brief.strip()
    if not question.endswith("?"):
        question = question.rstrip(".") + "?"
    criterion_id = _criterion_id(competency_id, criterion.name)
    interactive = plan.directive.interactive_question
    if interactive:
        prompt = interactive.prompt.strip() or question
        interactive = interactive.model_copy(
            update={
                "prompt": prompt,
                "id": interactive.id or f"{criterion_id}-interactive",
            }
        )
        directive_payload = plan.directive.model_copy(update={"interactive_question": interactive})
    else:
        directive_payload = plan.directive
    return CriterionDirective(
        competency_id=competency_id,
        competency_name=competency_name,
        criterion_id=criterion_id,
        criterion_name=criterion.name,
        description=criterion.description,
        weight=criterion.weight,
        directive=directive_payload,
        question=question,
        interactive_question=interactive,
    )


def _criterion_id(competency_id: str, criterion_name: str) -> str:  # Produces a stable identifier for a criterion.
    key = f"{competency_id}:{criterion_name}".encode("utf-8")
    return hashlib.sha1(key).hexdigest()


def _find_categories(categories: Iterable[RubricCategoryModel], competency_name: str) -> list[RubricCategoryModel]:  # Locates rubric categories matching the competency.
    matches: list[RubricCategoryModel] = []
    for category in categories:
        if category.category.strip().lower() == competency_name.strip().lower():
            matches.append(category)
    return matches


def _resolve_style_id(requested: str | None, default_style_id: str) -> str:  # Determines style id with fallback.
    from ..styles.registry import get_registry

    style = (requested or "").strip() or default_style_id
    registry = get_registry()
    try:
        registry.get(style)
        return style
    except KeyError:
        return default_style_id
