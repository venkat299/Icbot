import logging

from fastapi import FastAPI, HTTPException  # Provides HTTP API surface.
from fastapi.middleware.cors import CORSMiddleware  # Enables CORS for local dev.

from ..agents import CompetencyAgent, RubricAgent  # Imports LLM-driven agents.
from ..schemas.competency import CompetencyPlan, CompetencyRequest  # Uses shared competency schema types.
from ..schemas.rubric import RubricModel, RubricRequest  # Uses rubric schema types.

app = FastAPI(title="icbot-backend")  # Creates FastAPI application instance.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)  # Allows web clients to access the API during development.
_competency_agent = CompetencyAgent()  # Initializes competency agent once per process.
_rubric_agent = RubricAgent()  # Initializes rubric agent once per process.
logger = logging.getLogger(__name__)


@app.post("/api/competencies/generate", response_model=CompetencyPlan)  # Handles competency generation requests.
async def generate_competencies(payload: CompetencyRequest) -> CompetencyPlan:
    try:
        return await _competency_agent.plan(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # Surface gateway errors to clients.
        logger.exception("Failed to generate competencies")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/rubrics/generate", response_model=RubricModel)  # Handles rubric generation requests.
async def generate_rubric(payload: RubricRequest) -> RubricModel:
    if not payload.competencies:
        raise HTTPException(status_code=400, detail="At least one competency is required.")
    try:
        return await _rubric_agent.design(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to generate rubric")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
