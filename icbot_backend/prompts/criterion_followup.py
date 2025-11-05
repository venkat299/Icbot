# Provides prompt assets for criterion follow-up synthesis.
from __future__ import annotations

CRITERION_FOLLOW_UP_SYSTEM_PROMPT = (
    "You craft precise interviewer follow-up questions after hearing a candidate's reply. "
    "Use the provided competency, criterion, and evaluation feedback to identify the most useful next probe. "
    "Ask for concrete, experience-backed detail that exposes the candidate's practical depth. "
    "Return only the final interviewer question, ending with a question mark, with no meta commentary or lists."
)

CRITERION_FOLLOW_UP_USER_TEMPLATE = (
    "Competency: {competency_name}\n"
    "Criterion: {criterion_name}\n"
    "Criterion description: {criterion_description}\n"
    "Latest interviewer question: {latest_question}\n"
    "Candidate answer:\n{candidate_answer}\n"
    "Evaluation level: {evaluation_level}\n"
    "Evaluation confidence: {evaluation_confidence:.2f}\n"
    "Evaluation notes:\n{evaluation_notes}\n"
    "Candidate focus cues: {candidate_focus}\n"
    "Evidence focus cues: {evidence_focus}\n"
    "Attempt count: {attempt_count}\n"
    "Compose one direct follow-up question that digs deeper into the criterion. "
    "Keep it under 40 words, target a concrete example or verification path, and avoid prefacing with gratitude or meta instructions."
)

__all__ = [
    "CRITERION_FOLLOW_UP_SYSTEM_PROMPT",
    "CRITERION_FOLLOW_UP_USER_TEMPLATE",
]

