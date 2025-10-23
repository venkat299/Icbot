from langchain_core.prompts import ChatPromptTemplate  # Builds prompt pipelines for LangChain.

from ..config import load_app_config  # Accesses flow configuration.
from ..flow.graph import FlowBlueprint, build_flow_blueprint  # Builds dynamic flow graph post-plan.
from ..llm_gateway import runnable  # Provides JSON-enforced runnable.
from ..prompts import COMPETENCY_SYSTEM_PROMPT, COMPETENCY_USER_TEMPLATE  # Supplies prompt templates.
from ..registry import resolve_binding  # Resolves LLM route and schema bindings.
from ..schemas.competency import CompetencyPlan, CompetencyRequest  # Imports request/response models.


class CompetencyAgent:  # Produces competency plans using the configured LLM route.
    def __init__(self) -> None:
        route, schema = resolve_binding("competency.generate")
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", COMPETENCY_SYSTEM_PROMPT),
                ("human", COMPETENCY_USER_TEMPLATE),
            ]
        )  # Builds LangChain chat prompt.
        self._chain = prompt | runnable(route, schema)  # Composes prompt with gateway runnable.
        self._blueprint: FlowBlueprint | None = None

    async def plan(self, request: CompetencyRequest) -> CompetencyPlan:
        flow_config = load_app_config().flow
        payload = {
            "job_description": request.job_description,
            "resume_text": request.resume_text or "",
            "target_roles": ", ".join(request.target_roles) if request.target_roles else "unspecified",
            "min_competencies": flow_config.competency.min,
            "max_competencies": flow_config.competency.max,
        }  # Normalizes inputs and communicates flow constraints.
        plan = await self._chain.ainvoke(payload)  # Executes the runnable asynchronously.

        blueprint = build_flow_blueprint(plan, flow_config)
        self._blueprint = blueprint
        return blueprint.plan  # Returns enriched plan with dynamic stage metadata.

    @property
    def blueprint(self) -> FlowBlueprint | None:  # Exposes the most recent flow blueprint.
        return self._blueprint
