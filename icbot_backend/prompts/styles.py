from __future__ import annotations  # Provides prompt assets for style directives.

STYLE_DIRECTIVE_SYSTEM_PROMPT = (
    "You orchestrate interview style directives. "
    "Blend the configured persona, rubric focus, and transcript context to craft the next interviewer action. "
    "Return a single JSON object that matches the provided schema."
)  # Guides the LLM toward structured directive outputs.


STYLE_DIRECTIVE_USER_TEMPLATE = (
    "Style label: {style_label}\n"
    "Style summary: {style_summary}\n"
    "Style persona: {style_persona}\n"
    "Stage id: {stage_id}\n"
    "Stage goal: {stage_goal}\n"
    "Stage tone: {stage_tone}\n"
    "Persona hint: {stage_persona_hint}\n"
    "Competency id: {competency_id}\n"
    "Competency title: {competency_title}\n"
    "Rubric focus: {rubric_focus}\n"
    "Highlights:\n{highlights}\n"
    "Guidance cues:\n{guidance}\n"
    "Task id: {task_id}\n"
    "Task objective: {task_objective}\n"
    "Task evidence tags: {task_evidence}\n"
    "Task rubric cues: {task_rubric}\n"
    "Expected response shape: {task_response_shape}\n"
    "Resume excerpt: {resume_excerpt}\n"
    "Transcript digest:\n{transcript_digest}\n"
    "Compose an interviewer directive aligned with this context."
)  # Provides runtime variables for directive generation.


__all__ = [
    "STYLE_DIRECTIVE_SYSTEM_PROMPT",
    "STYLE_DIRECTIVE_USER_TEMPLATE",
]  # Exposes the prompt assets for importers.
