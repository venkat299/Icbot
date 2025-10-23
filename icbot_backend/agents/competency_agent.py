from langchain_core.prompts import ChatPromptTemplate  # Builds prompt pipelines for LangChain.

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

    async def plan(self, request: CompetencyRequest) -> CompetencyPlan:
        payload = {
            "job_description": request.job_description,
            "resume_text": request.resume_text or "",
            "target_roles": ", ".join(request.target_roles) if request.target_roles else "unspecified",
        }  # Normalizes inputs for the prompt.
        result = await self._chain.ainvoke(payload)  # Executes the runnable asynchronously.
        return result  # Returns validated competency plan.
