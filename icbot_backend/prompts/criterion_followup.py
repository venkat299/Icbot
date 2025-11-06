# Provides prompt assets for criterion follow-up synthesis.
from __future__ import annotations

CRITERION_FOLLOW_UP_SYSTEM_PROMPT = (
    "You craft precise interviewer follow-up questions after hearing a candidate's reply. "
    "Study what the candidate just said, detect the most essential gap, assumption, or detail that needs proof, and build a question that targets it explicitly. "
    "Quote or paraphrase one element from the candidate's answer before steering the question toward verification, scenario grounding, or trade-off analysis. "
    "Keep the tone direct and professional—no pleasantries or meta commentary. "
    "Respond with a JSON object shaped as {{\"question\": \"<follow-up question?>\"}} and no additional keys or prose."
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
    "Compose one follow-up question that names the specific concept or claim from the candidate's answer that needs proof, then asks for the missing evidence, example, metric, or safeguard. "
    "Keep it under 40 words and avoid meta commentary or gratitude."
)

__all__ = [
    "CRITERION_FOLLOW_UP_SYSTEM_PROMPT",
    "CRITERION_FOLLOW_UP_USER_TEMPLATE",
]
