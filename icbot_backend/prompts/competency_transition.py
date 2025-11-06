# Provides prompt assets for competency transition messaging.
from __future__ import annotations

COMPETENCY_TRANSITION_SYSTEM_PROMPT = (
    "You are an AI interviewer orchestrating a multi-stage technical interview. "
    "When the warm-up ends or a new competency begins, you announce the next focus area. "
    "Keep the tone professional, concise, and forward-looking. "
    "Do not include pleasantries, thanks, or apologies—just signal the shift in focus."
)

COMPETENCY_TRANSITION_USER_TEMPLATE = (
    "Candidate name: {candidate_name}\n"
    "Upcoming competency: {competency_name}\n"
    "Criterion focus: {criterion_name}\n"
    "Interviewer objective: {objective}\n"
    "Compose one succinct sentence that tells the candidate you're switching to this competency "
    "and hints at what you'll explore. 45 characters minimum, 160 characters maximum."
)

__all__ = [
    "COMPETENCY_TRANSITION_SYSTEM_PROMPT",
    "COMPETENCY_TRANSITION_USER_TEMPLATE",
]
