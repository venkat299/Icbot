from langchain_core.prompts import ChatPromptTemplate  # Builds prompt pipelines for LangChain.

from ..config import load_app_config, load_styles_config  # Accesses rubric and style configuration.
from ..llm_gateway import runnable  # Provides JSON-enforced runnable.
from ..prompts import RUBRIC_SYSTEM_PROMPT, RUBRIC_USER_TEMPLATE  # Supplies prompt templates.
from ..registry import resolve_binding  # Resolves LLM route and schema bindings.
from ..schemas.rubric import RubricCategory, RubricModel, RubricRequest  # Imports request/response models.


class RubricAgent:  # Produces interview rubrics with LLM support.
    def __init__(self) -> None:
        route, schema = resolve_binding("rubric.generate")
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", RUBRIC_SYSTEM_PROMPT),
                ("human", RUBRIC_USER_TEMPLATE),
            ]
        )  # Builds LangChain chat prompt.
        self._chain = prompt | runnable(route, schema)  # Composes prompt with gateway runnable.

    async def design(self, request: RubricRequest) -> RubricModel:
        if not request.competencies:
            raise ValueError("At least one competency is required to design a rubric")

        app_config = load_app_config()
        max_criteria = app_config.rubric.max_criteria_per_competency

        styles_catalog = load_styles_config().catalog

        competency_overview = "\n".join(
            _summarize_competency(item.title, item.competency_id, item.style_id, item.rationale, styles_catalog)
            for item in request.competencies
        )  # Summarizes competency plan with style context for the LLM.

        payload = {
            "job_description": request.job_description,
            "resume_text": request.resume_text or "Not provided",
            "competency_overview": competency_overview,
            "max_criteria": max_criteria,
        }  # Normalizes prompt variables.
        model = await self._chain.ainvoke(payload)
        return self._enforce_limits(model, max_criteria)

    def _enforce_limits(self, model: RubricModel, max_criteria: int) -> RubricModel:
        limited_categories: list[RubricCategory] = []
        for category in model.categories:
            criteria = category.criteria[:max_criteria]
            total_weight = sum(item.weight for item in criteria)
            if total_weight <= 0:
                adjusted_weights = criteria
            else:
                factor = 100 / total_weight
                adjusted_weights = [item.model_copy(update={"weight": item.weight * factor}) for item in criteria]

            normalized = []
            for item in adjusted_weights:
                levels = dict(item.scoring_levels or {})
                if "Level 0" not in levels:
                    levels["Level 0"] = "Performs below Level 1 expectations."
                for level in ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"]:
                    levels.setdefault(level, f"No guidance provided for {level}.")
                ordered_levels = {level: levels[level] for level in ["Level 0", "Level 1", "Level 2", "Level 3", "Level 4", "Level 5"]}
                normalized.append(item.model_copy(update={"scoring_levels": ordered_levels}))

            limited_categories.append(category.model_copy(update={"criteria": normalized}))

        return model.model_copy(update={"categories": limited_categories})


def _summarize_competency(
    title: str,
    competency_id: str,
    style_id: str,
    rationale: str | None,
    styles_catalog,
) -> str:  # Builds a style-aware competency summary for rubric generation.
    style = styles_catalog.get(style_id)
    if not style:
        base = f"- {title} | id: {competency_id} | style: {style_id}"
        return f"{base}{' | rationale: ' + rationale if rationale else ''}"
    stage = style.stages[0] if style.stages else None
    tasks = []
    for task_key in stage.task_sequence if stage else []:
        task = style.task_catalog.get(task_key)
        if task:
            tasks.append(f"{task.task_id}: {task.objective}")
    task_summary = "; ".join(tasks) if tasks else "Tasks unavailable"
    base = (
        f"- {title} | id: {competency_id} | style: {style.label} ({style_id}) | persona: {style.persona}"
        f" | stage_goal: {stage.goal if stage else 'N/A'} | task_focus: {task_summary}"
    )
    if rationale:
        base += f" | rationale: {rationale}"
    return base
