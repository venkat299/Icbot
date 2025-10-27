# Coordinates competency stage directives with style runtime.
from __future__ import annotations

from ..schemas.competency_stage import CompetencyStageRequest
from ..styles import StagePlan, StyleDirectiveRequest, StyleRuntime, TranscriptTurn


class CompetencyStageAgent:  # Produces stage directives for competency interviews.
    def __init__(self, runtime: StyleRuntime | None = None) -> None:  # Injects style runtime dependency.
        self._runtime = runtime or StyleRuntime()

    async def directive(self, request: CompetencyStageRequest) -> StagePlan:  # Returns the next directive for a competency.
        payload = StyleDirectiveRequest(
            style_id=_trim_identifier(request.style_id),
            competency_id=_trim_identifier(request.competency_id),
            competency_title=_trim_text(request.competency_title),
            rubric_focus=_compact(request.rubric_focus),
            transcript=_normalize_transcript(request.transcript),
            highlights=_compact(request.highlights),
            guidance=_compact(request.guidance),
            resume_excerpt=_trim(request.resume_excerpt),
            state=request.state,
        )
        return await self._runtime.next_directive(payload)


def _compact(values: list[str]) -> list[str]:  # Removes blank strings while preserving order.
    return [value.strip() for value in values if value and value.strip()]


def _normalize_transcript(turns: list[TranscriptTurn]) -> list[TranscriptTurn]:  # Trims transcript text and drops empty entries.
    cleaned: list[TranscriptTurn] = []
    for turn in turns:
        text = turn.text.strip()
        if not text:
            continue
        if text == turn.text:
            cleaned.append(turn)
        else:
            cleaned.append(turn.model_copy(update={"text": text}))
    return cleaned


def _trim(value: str | None) -> str | None:  # Normalizes optional resume excerpts.
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _trim_identifier(value: str) -> str:  # Trims identifiers and validates they are non-empty.
    stripped = value.strip()
    if not stripped:
        raise ValueError("Identifier cannot be blank.")
    return stripped


def _trim_text(value: str) -> str:  # Normalizes titles and ensures they remain non-empty.
    stripped = value.strip()
    if not stripped:
        raise ValueError("Competency title cannot be blank.")
    return stripped
