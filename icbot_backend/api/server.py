import logging

from fastapi import FastAPI, HTTPException  # Provides HTTP API surface.
from fastapi.middleware.cors import CORSMiddleware  # Enables CORS for local dev.

from ..agents import CompetencyAgent, RubricAgent, WarmupAgent  # Imports LLM-driven agents.
from ..config import load_app_config  # Loads application configuration.
from ..interview_store import list_interviews, schedule_interview  # Provides interview persistence helpers.
from ..schemas.competency import CompetencyPlan, CompetencyRequest  # Uses shared competency schema types.
from ..schemas.interview import ScheduleInterviewRequest, ScheduledInterviewModel  # Uses interview scheduling schemas.
from ..schemas.rubric import RubricModel, RubricRequest  # Uses rubric schema types.
from ..schemas.warmup import (  # Uses warm-up schema types.
    WarmupFollowUp,
    WarmupFollowUpRequest,
    WarmupRequest,
    WarmupTurn,
)
from ..schemas import FeatureFlagsModel  # Uses config schema types.

app = FastAPI(title="icbot-backend")  # Creates FastAPI application instance.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)  # Allows web clients to access the API during development.
_competency_agent = CompetencyAgent()  # Initializes competency agent once per process.
_rubric_agent = RubricAgent()  # Initializes rubric agent once per process.
_warmup_agent = WarmupAgent()  # Initializes warm-up agent once per process.
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


@app.post("/api/warmup/opening", response_model=WarmupTurn)  # Handles warm-up stage requests.
async def generate_warmup(payload: WarmupRequest) -> WarmupTurn:
    try:
        return await _warmup_agent.opening(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to generate warm-up exchange")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/warmup/followup", response_model=WarmupFollowUp)  # Handles adaptive follow-up generation.
async def generate_warmup_followup(payload: WarmupFollowUpRequest) -> WarmupFollowUp:
    try:
        return await _warmup_agent.follow_up(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to generate warm-up follow-up")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/interviews", response_model=ScheduledInterviewModel, status_code=201)  # Persists scheduled interview payloads.
async def create_interview(payload: ScheduleInterviewRequest) -> ScheduledInterviewModel:
    try:
        return schedule_interview(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to schedule interview")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/interviews", response_model=list[ScheduledInterviewModel])  # Returns stored interview schedule list.
async def get_interviews() -> list[ScheduledInterviewModel]:
    try:
        return list_interviews()
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/config/features", response_model=FeatureFlagsModel)  # Returns frontend feature toggles.
async def get_feature_flags() -> FeatureFlagsModel:
    config = load_app_config()
    return FeatureFlagsModel.model_validate(config.features.model_dump())
