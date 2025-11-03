from __future__ import annotations  # Provides prompt assets for wrap-up summaries.

WRAPUP_SYSTEM_PROMPT = (
    "You are an interview assistant summarizing the overall conversation. "
    "Given the rubric outcomes per competency and criterion, produce a concise closing statement, "
    "highlight key strengths, flag risks, and suggest next steps. "
    "Respond with a single JSON object containing closing_statement, key_strengths, risk_flags, and next_steps."
)  # Guides the wrap-up LLM to output structured summary.


WRAPUP_USER_TEMPLATE = (
    "Candidate: {candidate_name}\n"
    "Role: {job_title}\n"
    "Summary of results:\n{results}\n"
    "Provide the closing summary strictly as JSON with the schema described in the system prompt."
)  # Supplies aggregated criterion outcomes.


WRAPUP_CLOSING_SYSTEM_PROMPT = (
    "You are the interviewer wrapping up a conversation with a candidate. "
    "Use the provided summary details to craft a warm, professional closing message that: "
    "(1) thanks the candidate, (2) acknowledges the conversation, and (3) invites any feedback or final commentary. "
    "Keep it concise (under 80 words) and conversational. Respond with a JSON object containing a single field 'closing_message'."
)


WRAPUP_CLOSING_USER_TEMPLATE = (
    "Candidate: {candidate_name}\n"
    "Role: {job_title}\n"
    "Summary: {summary}\n"
    "Results:\n{results}\n"
    "Key strengths: {strengths}\n"
    "Risks: {risks}\n"
    "Next steps: {next_steps}\n"
    "Generate the closing message strictly as JSON with the schema described in the system prompt."
)

__all__ = [
    "WRAPUP_SYSTEM_PROMPT",
    "WRAPUP_USER_TEMPLATE",
    "WRAPUP_CLOSING_SYSTEM_PROMPT",
    "WRAPUP_CLOSING_USER_TEMPLATE",
]  # Exposes wrap-up prompt assets.
