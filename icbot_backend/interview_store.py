from __future__ import annotations
import json
from datetime import datetime, timezone
from typing import Iterable
from uuid import uuid4

from pydantic import TypeAdapter  # Validates persisted payloads.

from .config import PROJECT_ROOT  # Leverages shared project paths.
from .schemas.interview import ScheduleInterviewRequest, ScheduledInterviewModel  # Uses scheduling schemas.

_STORE_PATH = PROJECT_ROOT / "scheduled_interviews.json"  # Points to persisted interview JSON.
_ADAPTER = TypeAdapter(list[ScheduledInterviewModel])  # Parses stored interview arrays.


def _read_store() -> list[ScheduledInterviewModel]:  # Loads scheduled interviews from disk.
    if not _STORE_PATH.exists():
        return []
    try:
        raw = _STORE_PATH.read_text(encoding="utf-8")
        data = json.loads(raw) if raw.strip() else []
        return _ADAPTER.validate_python(data)
    except json.JSONDecodeError as exc:  # Guards against corrupt persistence payloads.
        raise ValueError("Scheduled interviews store is corrupted.") from exc


def _write_store(interviews: Iterable[ScheduledInterviewModel]) -> None:  # Persists interviews to disk.
    payload = [item.model_dump(mode="json") for item in interviews]
    _STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    _STORE_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def list_interviews() -> list[ScheduledInterviewModel]:  # Returns all persisted interviews.
    return _read_store()


def schedule_interview(payload: ScheduleInterviewRequest) -> ScheduledInterviewModel:  # Persists a new interview entry.
    interviews = _read_store()
    interview = ScheduledInterviewModel(
        id=uuid4().hex,
        job_title=payload.job_title,
        candidate_name=payload.candidate_name,
        job_description=payload.job_description,
        resume=payload.resume,
        competencies=payload.competencies,
        rubric=payload.rubric,
        scheduled_date=datetime.now(timezone.utc),
        status="scheduled",
    )
    interviews.append(interview)
    _write_store(interviews)
    return interview
