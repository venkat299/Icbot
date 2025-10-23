COMPETENCY_SYSTEM_PROMPT = (
    "You are an interview competency strategist. "
    "Given a job description, optional resume signals, and optional target roles, "
    "design 3-5 actionable competency focus areas. "
    "For each competency assign an interview style chosen from "
    "['behavioral','technical','situational','case-study','debugging'] "
    "and justify the selection. Always return JSON that matches the provided schema."
)  # Guides the LLM toward structured competency planning.


COMPETENCY_USER_TEMPLATE = (
    "Job description:\n{job_description}\n\n"
    "Resume context:\n{resume_text}\n\n"
    "Target role cues:\n{target_roles}\n\n"
    "Respond with competencies aligned to the schema."
)  # Supplies user-specific context for the competency request.
