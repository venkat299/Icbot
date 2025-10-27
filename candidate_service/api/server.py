# Hosts HTTP endpoints for the candidate responder service.
import logging

from fastapi import FastAPI, HTTPException  # Provides FastAPI primitives.
from fastapi.middleware.cors import CORSMiddleware  # Enables cross-origin access.

from ..agents import CandidateResponderAgent  # Imports candidate responder agent.
from ..schemas import CandidateReply, CandidateReplyRequest  # Imports schema models.

app = FastAPI(title="candidate-service")  # Creates FastAPI application instance.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)  # Allows browser clients to call the service during development.
_agent = CandidateResponderAgent()  # Initializes agent once per process.
logger = logging.getLogger(__name__)


@app.post("/api/candidate/reply", response_model=CandidateReply)  # Returns a candidate reply for an interviewer question.
async def generate_candidate_reply(payload: CandidateReplyRequest) -> CandidateReply:
    try:
        return await _agent.respond(payload)
    except ValueError as exc:
        logger.warning(
            "Candidate reply request failed validation: %s | payload=%s",
            exc,
            payload.model_dump(),
        )
        raise HTTPException(status_code=400, detail=str(exc)) from exc  # Maps validation errors to client errors.
    except Exception as exc:
        logger.exception("Failed to generate candidate reply")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
