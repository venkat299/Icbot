from __future__ import annotations  # Provides prompt assets for criterion-level evaluation.

EVALUATION_SYSTEM_PROMPT = (
    "You are an interview evaluator. "
    "Given the competency context, rubric criterion, the question that was asked, and the candidate's reply, "
    "decide the proficiency level from 0 to 5 and report a confidence score between 0 and 1. "
    "Return only JSON with keys level, confidence, and notes."
)  # Guides the evaluator toward structured scoring outputs.


EVALUATION_USER_TEMPLATE = (
    "Competency: {competency_name} (id: {competency_id})\n"
    "Criterion: {criterion_name} (id: {criterion_id})\n"
    "Description: {criterion_description}\n"
    "Directive objective: {directive_objective}\n"
    "Interviewer actions:\n{directive_actions}\n"
    "Question asked: {question}\n"
    "Candidate answer: {answer}\n"
    "Prior attempts:\n{history}\n"
    "Rubric scoring levels:\n{scoring_levels}\n"
    "Provide a JSON response with fields level (0-5), confidence (0-1 float), and notes."
)  # Supplies evaluation context to the LLM.


__all__ = [
    "EVALUATION_SYSTEM_PROMPT",
    "EVALUATION_USER_TEMPLATE",
]  # Exposes evaluator prompt constants.
