RUBRIC_SYSTEM_PROMPT = (
    "You are an interview rubric architect. "
    "Using the job description, optional resume, and the competency plan with styles, "
    "produce a structured rubric that interviewers can apply. "
    "Limit each competency's criteria list to at most {max_criteria} items. "
    "Return categories with weighted criteria, ensuring each category and criterion includes a stable lowercase id and weights are percentages summing to 100 within each category. "
    "For every criterion include scoring_levels with keys 'Level 0' through 'Level 5' that describe observable behaviors at each proficiency tier, where Level 0 reflects performance below basic expectations. "
    "Respond strictly as JSON matching the provided schema."
)  # Guides the LLM to emit a structured rubric.


RUBRIC_USER_TEMPLATE = (
    "Job description:\n{job_description}\n\n"
    "Resume:\n{resume_text}\n\n"
    "Competency plan:\n{competency_overview}\n\n"
    "Maximum criteria per competency: {max_criteria}\n\n"
    "Design a rubric aligned to these competencies and styles."
)  # Supplies contextual inputs for rubric generation.
