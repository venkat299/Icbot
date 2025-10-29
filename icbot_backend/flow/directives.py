from __future__ import annotations

import hashlib
from typing import Iterable

from ..schemas.criterion import CriterionDirective
from ..schemas.interview import RubricCategoryModel, RubricCriterionModel, ScheduledInterviewModel
from ..styles import StyleDirectiveRequest, StyleRuntime


async def generate_criterion_directives(
    interview: ScheduledInterviewModel,
    runtime: StyleRuntime,
    *,
    style_id: str = "concept_primer",
) -> list[CriterionDirective]:  # Precomputes directives for each rubric criterion.
    directives: list[CriterionDirective] = []
    for competency in interview.competencies:
        categories = _find_categories(interview.rubric.evaluation_criteria, competency.name)
        for category in categories:
            for criterion in category.criteria:
                directive = await _build_directive(runtime, style_id, competency.id, competency.name, criterion)
                directives.append(directive)
    return directives


async def _build_directive(
    runtime: StyleRuntime,
    style_id: str,
    competency_id: str,
    competency_name: str,
    criterion: RubricCriterionModel,
) -> CriterionDirective:  # Generates a single directive/question pair for a criterion.
    guidance = [
        f"Criterion description: {criterion.description}",
        f"Target competency: {competency_name}",
    ]
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
    return CriterionDirective(
        competency_id=competency_id,
        competency_name=competency_name,
        criterion_id=_criterion_id(competency_id, criterion.name),
        criterion_name=criterion.name,
        description=criterion.description,
        weight=criterion.weight,
        directive=plan.directive,
        question=question,
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
