from langchain_core.prompts import ChatPromptTemplate  # Builds prompt pipelines for LangChain.

from ..config import load_app_config  # Accesses rubric configuration.
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

        competency_overview = "\n".join(
            f"- {item.title} | id: {item.competency_id} | style: {item.style_id}" + (
                f" | rationale: {item.rationale}"
                if item.rationale
                else ""
            )
            for item in request.competencies
        )  # Summarizes competency plan for the LLM.

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
                adjusted = criteria
            else:
                factor = 100 / total_weight
                adjusted = [item.model_copy(update={"weight": item.weight * factor}) for item in criteria]
            limited_categories.append(category.model_copy(update={"criteria": adjusted}))

        return model.model_copy(update={"categories": limited_categories})
