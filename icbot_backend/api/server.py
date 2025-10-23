from fastapi import FastAPI, HTTPException  # Provides HTTP API surface.
from fastapi.middleware.cors import CORSMiddleware  # Enables CORS for local dev.

from ..agents import CompetencyAgent  # Imports competency agent.
from ..schemas.competency import CompetencyPlan, CompetencyRequest  # Uses shared schema types.

app = FastAPI(title="icbot-backend")  # Creates FastAPI application instance.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)  # Allows web clients to access the API during development.
_competency_agent = CompetencyAgent()  # Initializes agent once per process.


@app.post("/api/competencies/generate", response_model=CompetencyPlan)  # Handles competency generation requests.
async def generate_competencies(payload: CompetencyRequest) -> CompetencyPlan:
    try:
        return await _competency_agent.plan(payload)
    except Exception as exc:  # Surface gateway errors to clients.
        raise HTTPException(status_code=500, detail=str(exc)) from exc
