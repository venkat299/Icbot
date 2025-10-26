# Hosts HTTP endpoints for the candidate responder service.
import logging

from fastapi import FastAPI, HTTPException  # Provides FastAPI primitives.

from ..agents import CandidateResponderAgent  # Imports candidate responder agent.
from ..schemas import CandidateReply, CandidateReplyRequest  # Imports schema models.

app = FastAPI(title="candidate-service")  # Creates FastAPI application instance.
_agent = CandidateResponderAgent()  # Initializes agent once per process.
logger = logging.getLogger(__name__)


@app.post("/api/candidate/reply", response_model=CandidateReply)  # Returns a candidate reply for an interviewer question.
async def generate_candidate_reply(payload: CandidateReplyRequest) -> CandidateReply:
    try:
        return await _agent.respond(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc  # Maps validation errors to client errors.
    except Exception as exc:
        logger.exception("Failed to generate candidate reply")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
