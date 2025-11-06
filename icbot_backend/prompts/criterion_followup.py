from __future__ import annotations  # Rotating follow-up prompt variants.

from random import SystemRandom
from typing import Final

_SYSTEM_PROMPT_PREFIX: Final[str] = (
    "You craft precise interviewer follow-up questions after hearing a candidate's reply. "
    "Study what the candidate just said, detect the most essential gap, assumption, or detail needing proof, and build a question that targets it explicitly. "
)

_SYSTEM_PROMPT_SUFFIX: Final[str] = (
    "Keep the tone direct and professional—no pleasantries or meta commentary. "
    "Respond with a JSON object shaped as {{\"question\": \"<follow-up question?>\"}} and no additional keys or prose."
)

_REFERENCE_VARIANTS: Final[tuple[str, ...]] = (
    "Reiterate the candidate's pivotal assertion in their wording before interrogating its proof.",
    "Remind them of the exact metric they quoted before requesting verification.",
    "Point back to the scenario they described verbatim before probing for evidence.",
    "Refresh the candidate's claimed safeguard by name before challenging its effectiveness.",
    "Call out the specific improvement percentage they mentioned before asking how it was measured.",
    "Highlight the tool or approach the candidate credited before questioning its validation.",
    "Surface the timeline milestone they referenced before asking who confirmed it.",
    "Echo the customer outcome they cited before seeking supporting data.",
    "Repeat their risk mitigation promise as stated before demanding evidence it works.",
    "Mirror the performance gain language they used before pressing for concrete metrics.",
)

CRITERION_FOLLOW_UP_SYSTEM_PROMPTS: Final[tuple[str, ...]] = tuple(
    _SYSTEM_PROMPT_PREFIX + variant + " " + _SYSTEM_PROMPT_SUFFIX for variant in _REFERENCE_VARIANTS
)

_CRITERION_FOLLOW_UP_USER_TEMPLATE_BASE: Final[str] = (
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
    "<<FOLLOWUP_INSTRUCTION>>"
)

CRITERION_FOLLOW_UP_USER_INSTRUCTIONS: Final[tuple[str, ...]] = (
    "Ask in under 40 words for data, examples, or safeguards that prove that point.",
    "Request within 40 words the metric, log, or control that substantiates the quote.",
    "Demand no more than 40 words describing the evidence, benchmark, or fallback for that statement.",
    "Press in ≤40 words for the numbers, artifacts, or validation run backing that element.",
    "Seek within 40 words the experiment, audit, or contingency that verifies the highlighted claim.",
    "Probe in under 40 words for the measurable proof, scenario, or safety net supporting that line.",
    "Insist in ≤40 words on the KPI, example, or mitigation that confirms that reference.",
    "Invite within 40 words the documented outcome, monitoring, or fail-safe proving that assertion.",
    "Call in ≤40 words for the quantitative check, user signal, or guardrail tied to that statement.",
    "Require in under 40 words the validation artifact, comparative result, or buffer justifying that claim.",
)

_RNG: Final[SystemRandom] = SystemRandom()
_INSTRUCTION_TOKEN: Final[str] = "<<FOLLOWUP_INSTRUCTION>>"


def pick_criterion_follow_up_prompts() -> tuple[str, str]:  # Returns randomized criterion follow-up prompts.
    system_index = _RNG.randrange(len(CRITERION_FOLLOW_UP_SYSTEM_PROMPTS))
    instruction_index = _RNG.randrange(len(CRITERION_FOLLOW_UP_USER_INSTRUCTIONS))
    system_prompt = CRITERION_FOLLOW_UP_SYSTEM_PROMPTS[system_index]
    instruction = CRITERION_FOLLOW_UP_USER_INSTRUCTIONS[instruction_index]
    user_template = _CRITERION_FOLLOW_UP_USER_TEMPLATE_BASE.replace(_INSTRUCTION_TOKEN, instruction)
    return system_prompt, user_template


__all__ = [
    "CRITERION_FOLLOW_UP_SYSTEM_PROMPTS",
    "CRITERION_FOLLOW_UP_USER_INSTRUCTIONS",
    "pick_criterion_follow_up_prompts",
]
