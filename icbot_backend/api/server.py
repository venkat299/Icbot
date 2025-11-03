import logging

from fastapi import FastAPI, HTTPException, Request  # Provides HTTP API surface.
from fastapi.responses import StreamingResponse  # Streams file responses.
from fastapi.exception_handlers import request_validation_exception_handler  # Reuses default validation response.
from fastapi.exceptions import RequestValidationError  # Signals request body validation errors.
from fastapi.middleware.cors import CORSMiddleware  # Enables CORS for local dev.

from ..agents import CompetencyAgent, CompetencyStageAgent, RubricAgent, WarmupAgent  # Imports LLM-driven agents.
from ..config import load_app_config  # Loads application configuration.
from ..interview_sessions import (
    InterviewSessionEvent,
    InterviewSessionManager,
    InterviewSessionResponse,
)  # Coordinates interview flow sessions.
from ..interview_store import delete_interview, list_interviews, schedule_interview  # Provides interview persistence helpers.
from ..schemas import StagePlan, StyleSummary  # Uses shared style plan schema.
from ..schemas.competency import CompetencyPlan, CompetencyRequest  # Uses shared competency schema types.
from ..schemas.competency_stage import CompetencyStageRequest  # Uses competency stage request schema.
from ..schemas.interview import ScheduleInterviewRequest, ScheduledInterviewModel  # Uses interview scheduling schemas.
from ..schemas.report import InterviewReport  # Uses interview report schema.
from ..schemas.rubric import RubricModel, RubricRequest  # Uses rubric schema types.
from ..schemas.warmup import (  # Uses warm-up schema types.
    WarmupFollowUp,
    WarmupFollowUpRequest,
    WarmupRequest,
    WarmupTurn,
)
from ..schemas import UiCandidateConfigModel, UiCandidateLevelModel, UiConfigModel  # Uses config schema types.
from ..styles.toolkit import list_style_summaries  # Lists available style summaries.
from ..reporting import build_interview_report, render_report_pdf  # Builds reports and PDF exports.

app = FastAPI(title="icbot-backend")  # Creates FastAPI application instance.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)  # Allows web clients to access the API during development.
_competency_agent = CompetencyAgent()  # Initializes competency agent once per process.
_competency_stage_agent = CompetencyStageAgent()  # Initializes competency stage agent once per process.
_rubric_agent = RubricAgent()  # Initializes rubric agent once per process.
_warmup_agent = WarmupAgent()  # Initializes warm-up agent once per process.
_session_manager = InterviewSessionManager()  # Coordinates interview runtime sessions.
logger = logging.getLogger(__name__)

@app.exception_handler(RequestValidationError)
async def log_request_validation_error(request: Request, exc: RequestValidationError):  # Logs inbound request validation issues before returning response.
    logger.warning(
        "Request validation failed: method=%s | path=%s | errors=%s | body=%s",
        request.method,
        request.url.path,
        exc.errors(),
        exc.body,
    )
    return await request_validation_exception_handler(request, exc)


def _get_interview_or_404(interview_id: str) -> ScheduledInterviewModel:  # Retrieves a scheduled interview or raises 404.
    for interview in list_interviews():
        if interview.id == interview_id:
            return interview
    raise HTTPException(status_code=404, detail=f"Interview '{interview_id}' not found")


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


@app.post(
    "/api/interviews/{interview_id}/sessions",
    response_model=InterviewSessionResponse,
    status_code=201,
)  # Creates a new interview session and returns the warm-up prompt.
async def create_interview_session(interview_id: str) -> InterviewSessionResponse:
    interview = _get_interview_or_404(interview_id)
    try:
        return await _session_manager.start(interview)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to start interview session")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post(
    "/api/interview_sessions/{session_id}/advance",
    response_model=InterviewSessionResponse,
)  # Applies an event to an existing session and returns the next step.
async def advance_interview_session(session_id: str, payload: InterviewSessionEvent) -> InterviewSessionResponse:
    try:
        return await _session_manager.advance(session_id, payload)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        logger.warning("Interview session advance validation failed: %s | session_id=%s | payload=%s", exc, session_id, payload.model_dump())
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to advance interview session")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post(
    "/api/interview_sessions/{session_id}/complete",
    response_model=ScheduledInterviewModel,
)
async def complete_interview_session(session_id: str) -> ScheduledInterviewModel:  # Finalizes an interview session and persists results.
    try:
        return await _session_manager.end_session(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to complete interview session")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/competency/stage", response_model=StagePlan)  # Produces next directive for a competency stage.
async def generate_competency_stage(payload: CompetencyStageRequest) -> StagePlan:
    try:
        return await _competency_stage_agent.directive(payload)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        logger.warning("Competency stage request failed validation: %s | payload=%s", exc, payload.model_dump())
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to generate competency stage directive")
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


@app.get("/api/config/ui", response_model=UiConfigModel)  # Returns UI defaults.
async def get_ui_config() -> UiConfigModel:
    config = load_app_config()
    candidate_cfg = config.candidate
    ordered_levels = sorted(candidate_cfg.levels.items(), key=lambda item: item[1].index)
    level_models = [
        UiCandidateLevelModel(id=level_id, label=settings.label, index=settings.index)
        for level_id, settings in ordered_levels
    ]
    payload = UiConfigModel(
        default_view_mode=config.ui.default_view_mode,
        tts_enabled=config.ui.tts_enabled,
        auto_candidate_reply=config.ui.auto_candidate_reply,
        candidate_levels=UiCandidateConfigModel(default_level=candidate_cfg.default_level, levels=level_models),
    )
    return payload


@app.get("/api/styles", response_model=list[StyleSummary])  # Returns configured interview styles.
async def list_styles() -> list[StyleSummary]:
    try:
        return list_style_summaries()
    except Exception as exc:
        logger.exception("Failed to list interview styles")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.delete("/api/interviews/{interview_id}", status_code=204)  # Removes a scheduled interview.
async def remove_interview(interview_id: str) -> None:
    try:
        delete_interview(interview_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to delete interview")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/interviews/{interview_id}/report", response_model=InterviewReport)  # Returns structured interview report.
async def get_interview_report(interview_id: str) -> InterviewReport:
    interview = _get_interview_or_404(interview_id)
    try:
        return build_interview_report(interview)
    except Exception as exc:
        logger.exception("Failed to build interview report")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/interviews/{interview_id}/report.pdf")  # Streams interview report as a PDF document.
async def export_interview_report_pdf(interview_id: str) -> StreamingResponse:
    interview = _get_interview_or_404(interview_id)
    try:
        report = build_interview_report(interview)
        payload = render_report_pdf(report)
    except Exception as exc:
        logger.exception("Failed to export interview report PDF")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    filename = f"{report.report_id}.pdf"
    return StreamingResponse(
        iter([payload]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
