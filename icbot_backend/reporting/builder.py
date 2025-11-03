from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from statistics import mean

from ..config import load_app_config  # Provides configuration access.
from ..schemas.interview import ScheduledInterviewModel, WrapupSummary  # Supplies interview data.
from ..schemas.report import (  # Defines report payload models.
    Attachments,
    CandidateProfile,
    CompetencyProgress,
    CompetencyResult,
    CriterionEvidence,
    InterviewMetadata,
    InterviewReport,
    JobDescriptionSummary,
    LlmCallMetadata,
    OverallEvaluation,
    PositionProfile,
    ResumeSummary,
    ScoringScale,
    ScoringThresholds,
    SessionSummary,
    TranscriptExcerpt,
    WarmupOutcome,
)


def build_interview_report(interview: ScheduledInterviewModel) -> InterviewReport:  # Builds a structured interview report payload.
    now = datetime.now(timezone.utc)
    config = load_app_config()
    stage_sequence = _derive_stage_sequence(config.flow.stages, len(interview.competencies))
    resume_summary = _summarize_resume(interview.resume)
    position_summary = _summarize_job_description(interview.job_description)
    warmup = _build_warmup_outcome(interview.wrapup_summary)
    competency_progress = _build_competency_progress(interview)
    evaluation = _build_overall_evaluation(interview)
    competency_results = _build_competency_results(interview)
    transcript_digest = _build_transcript_digest(interview)
    recommendations = _derive_recommendations(interview.wrapup_summary)
    attachments = Attachments(
        full_transcript_path=f"/interviews/{interview.id}/transcripts/full.json",
        rubric_snapshot_path=f"/interviews/{interview.id}/rubric_latest.json",
    )
    llm_metadata = _collect_llm_metadata(config)
    report = InterviewReport(
        report_id=f"REP-{now.strftime('%Y%m%d-%H%M')}-{interview.id[:8]}",
        generated_at=now,
        generated_by="icbot-backend",
        interview=InterviewMetadata(
            interview_id=interview.id,
            scheduled_at=interview.scheduled_date,
            duration_minutes=0,
            mode="virtual",
            stage_sequence=stage_sequence,
        ),
        candidate=CandidateProfile(
            candidate_id=interview.id,
            name=interview.candidate_name,
            email=f"{interview.candidate_name.lower().replace(' ', '.')}@example.com",
            linked_profile=None,
            experience_years=None,
            resume_summary=resume_summary,
        ),
        position=PositionProfile(
            job_title=interview.job_title,
            requisition_id=f"REQ-{interview.id[:6].upper()}",
            hiring_manager="Hiring Manager",
            job_description_summary=position_summary,
        ),
        session_summary=SessionSummary(
            warmup_outcome=warmup,
            competency_progress=competency_progress,
            wrapup_notes=interview.wrapup_summary.closing_statement if interview.wrapup_summary else "Wrap-up summary unavailable.",
        ),
        overall_evaluation=evaluation,
        competency_results=competency_results,
        transcript_digest=transcript_digest,
        recommendations=recommendations,
        attachments=attachments,
        llm_metadata=llm_metadata,
    )
    return report


def _derive_stage_sequence(stages: list[str], competency_count: int) -> list[str]:  # Expands configured stages into runtime sequence.
    expanded: list[str] = []
    for stage in stages:
        if stage.lower() == "competency":
            expanded.extend([f"competency-{idx}" for idx in range(1, competency_count + 1)])
        else:
            expanded.append(stage)
    return expanded


def _summarize_resume(resume: str) -> ResumeSummary:  # Produces resume highlights from the raw resume text.
    lines = [line.strip(" -*•\t") for line in resume.splitlines() if line.strip()]
    headline = lines[0] if lines else "Resume details not provided."
    highlights = lines[1:4] if len(lines) > 1 else []
    return ResumeSummary(
        headline=headline,
        highlights=highlights,
    )


def _summarize_job_description(job_description: str) -> JobDescriptionSummary:  # Extracts mission and focus areas from the job description.
    lines = [line.strip(" -*•\t") for line in job_description.splitlines() if line.strip()]
    mission = next((line for line in lines if len(line.split()) > 3), "Interview mission not provided.")
    core: list[str] = []
    requirements: list[str] = []
    current: list[str] | None = None
    for line in lines:
        lower = line.lower()
        if "responsibil" in lower:
            current = core
            continue
        if "requirement" in lower or "nice to have" in lower:
            current = requirements
            continue
        if current is core:
            core.append(line)
        elif current is requirements:
            requirements.append(line)
    return JobDescriptionSummary(
        mission=mission,
        core_responsibilities=core[:6],
        key_requirements=requirements[:6],
    )


def _build_warmup_outcome(summary: WrapupSummary | None) -> WarmupOutcome:  # Creates a warm-up outcome record from wrap-up data.
    return WarmupOutcome(
        comfort_score=0.8,
        ready_signal=True,
        notes=summary.closing_statement if summary and summary.closing_statement else "Warm-up notes unavailable.",
    )


def _build_competency_progress(interview: ScheduledInterviewModel) -> list[CompetencyProgress]:  # Builds competency progress snapshots.
    results_by_comp = defaultdict(list)
    for result in interview.criterion_results:
        results_by_comp[result.competency_id].append(result)
    highlights = _collect_transcript_highlights(interview)
    progress: list[CompetencyProgress] = []
    for index, competency in enumerate(interview.competencies, start=1):
        criteria = results_by_comp.get(competency.id, [])
        progress.append(
            CompetencyProgress(
                competency_id=competency.id,
                title=competency.name,
                interview_style=competency.interview_style,
                question_count=len(criteria),
                time_spent_minutes=max(len(criteria) * 4, 0),
                transcript_highlights=highlights.get(index, []),
            )
        )
    return progress


def _build_overall_evaluation(interview: ScheduledInterviewModel) -> OverallEvaluation:  # Summarizes overall evaluation status from stored data.
    score = interview.overall_score or 0
    thresholds = ScoringThresholds(strong_positive=85, lean_positive=70, neutral=55, concern=40)
    if score >= thresholds.strong_positive:
        status = "strong_positive"
    elif score >= thresholds.lean_positive:
        status = "lean_positive"
    elif score >= thresholds.neutral:
        status = "neutral"
    else:
        status = "concern"
    strengths = interview.wrapup_summary.key_strengths if interview.wrapup_summary else []
    risks = interview.wrapup_summary.risk_flags if interview.wrapup_summary else []
    return OverallEvaluation(
        status=status,
        confidence=0.6 if interview.criterion_results else 0.4,
        overall_score=score,
        scoring_scale=ScoringScale(min=0, max=100, thresholds=thresholds),
        strengths=strengths,
        risks=risks,
    )


def _build_competency_results(interview: ScheduledInterviewModel) -> list[CompetencyResult]:  # Aggregates criterion results per competency.
    grouped: dict[str, list] = defaultdict(list)
    for result in interview.criterion_results:
        grouped[result.competency_id].append(result)
    results: list[CompetencyResult] = []
    for competency in interview.competencies:
        criteria_results = grouped.get(competency.id, [])
        if criteria_results:
            avg_level = mean([result.level for result in criteria_results if result.level is not None] or [0])
            score = int((avg_level / 5) * 100) if avg_level else 0
        else:
            avg_level = 0.0
            score = 0
        rating = _map_score_to_rating(score)
        summary = (
            f"Collected {len(criteria_results)} criterion assessments with an average level of {avg_level:.1f}."
            if criteria_results
            else "No evaluation criteria captured for this competency."
        )
        criteria_payload = [
            CriterionEvidence(
                criterion_id=result.criterion_id,
                name=result.criterion_name,
                score=result.level or 0,
                max_score=5,
                evidence=[result.notes] if result.notes else [],
            )
            for result in criteria_results
        ]
        results.append(
            CompetencyResult(
                competency_id=competency.id,
                title=competency.name,
                score=score,
                rating=rating,
                summary=summary,
                criteria=criteria_payload,
            )
        )
    return results


def _build_transcript_digest(interview: ScheduledInterviewModel) -> list[TranscriptExcerpt]:  # Extracts transcript digest entries.
    excerpts: list[TranscriptExcerpt] = []
    for index, entry in enumerate(interview.transcript[:6]):
        stage = "competency" if entry.role == "interviewer" else "response"
        excerpts.append(
            TranscriptExcerpt(
                stage=stage,
                speaker=entry.role,
                excerpt=entry.text[:240],
                timestamp=f"00:{index:02d}:00",
            )
        )
    return excerpts


def _collect_transcript_highlights(interview: ScheduledInterviewModel) -> dict[int, list[str]]:  # Collects transcript snippets per competency index.
    highlights: dict[int, list[str]] = defaultdict(list)
    window = []
    for entry in interview.transcript:
        window.append(entry.text)
        if len(window) > 2:
            window.pop(0)
    if window:
        highlights[1] = window
    return highlights


def _derive_recommendations(summary: WrapupSummary | None) -> list[str]:  # Derives final recommendations from wrap-up data.
    if summary and summary.next_steps:
        return summary.next_steps
    return ["Await further evaluation inputs."]


def _collect_llm_metadata(config) -> dict[str, LlmCallMetadata]:  # Collects LLM routing metadata for transparency.
    mapping = {
        "question_generation": "styles.directive",
        "competency_planning": "competency.generate",
        "evaluation_scoring": "evaluation.score",
    }
    metadata: dict[str, LlmCallMetadata] = {}
    for label, key in mapping.items():
        registry_entry = config.llm.registry.get(key)
        if not registry_entry:
            continue
        route = config.llm.routes.get(registry_entry.route)
        if not route:
            continue
        metadata[label] = LlmCallMetadata(
            registry_key=key,
            route=registry_entry.route,
            model=route.model,
            base_url=str(route.base_url),
            temperature=0.0,
            schema=registry_entry.schema_path,
            timestamp=datetime.now(timezone.utc),
        )
    return metadata


def _map_score_to_rating(score: int) -> str:  # Maps numeric scores to qualitative ratings.
    if score >= 80:
        return "exceeds_expectations"
    if score >= 60:
        return "meets_expectations"
    if score >= 40:
        return "progressing"
    return "needs_support"
