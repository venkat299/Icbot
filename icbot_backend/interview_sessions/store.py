from __future__ import annotations

from functools import lru_cache
from threading import Lock
from typing import Dict

from .models import InterviewSessionState


class SessionStore:  # In-memory repository for interview sessions.
    def __init__(self) -> None:
        self._sessions: Dict[str, InterviewSessionState] = {}
        self._lock = Lock()

    def save(self, state: InterviewSessionState) -> None:  # Inserts or updates a session state.
        with self._lock:
            self._sessions[state.session_id] = state

    def get(self, session_id: str) -> InterviewSessionState:  # Retrieves a stored session.
        with self._lock:
            try:
                return self._sessions[session_id]
            except KeyError as exc:
                raise KeyError(f"Unknown session '{session_id}'") from exc

    def delete(self, session_id: str) -> None:  # Removes a session when completed.
        with self._lock:
            self._sessions.pop(session_id, None)


@lru_cache(maxsize=1)
def get_session_store() -> SessionStore:  # Provides a singleton session store.
    return SessionStore()
