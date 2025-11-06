from __future__ import annotations  # Builds interview report PDFs via HTML rendering.

import html
from datetime import datetime

try:
    from weasyprint import HTML  # type: ignore[import]
except Exception as exc:  # pragma: no cover - triggered when WeasyPrint is missing.
    HTML = None  # type: ignore[assignment]
    _IMPORT_ERROR = exc
else:
    _IMPORT_ERROR = None

from ..schemas.report import InterviewReport  # Reuses structured report payload.

STYLE_CLASSIC = """
@page { margin: 2mm; }
body { font-family: "Inter", Arial, sans-serif; background: #ffffff; color: #0f172a; margin: 0; padding: 0; }
.page { width: 100%; margin: 0; padding: 0; box-sizing: border-box; }
h1 { margin: 0; font-size: 28px; letter-spacing: -0.02em; }
h2 { border-bottom: 1px solid #e2e8f0; padding: 0 32px 8px; margin: 32px 0 0; font-size: 20px; }
h3 { margin-top: 20px; font-size: 16px; color: #0f172a; }
.header { padding: 32px 32px 16px 32px; }
.section { margin-top: 24px; padding: 0; page-break-inside: avoid; }
.section > p { padding: 0 32px; }
.section > .card { margin-top: 16px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 16px; }
.card { background: linear-gradient(160deg, rgba(15,23,42,0.02), rgba(15,23,42,0.05)); border-radius: 14px; padding: 16px 18px; break-inside: avoid; page-break-inside: avoid; }
.card.section { margin: 24px 0 0; border-radius: 0; padding: 24px 32px; }
.card.section + .card.section { margin-top: 16px; }
.pill { display: inline-block; padding: 4px 10px; border-radius: 999px; background: rgba(34,197,94,0.2); color: #166534; font-size: 12px; font-weight: 600; margin-right: 10px; }
.muted { color: #64748b; font-size: 13px; }
.transcript-full { display: flex; flex-direction: column; gap: 14px; margin-top: 12px; }
.transcript-turn { display: flex; gap: 18px; align-items: flex-start; }
.transcript-role { min-width: 120px; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #475569; font-weight: 600; }
.transcript-body { margin: 0; font-size: 13px; line-height: 1.6; color: #0f172a; }
ul { padding-left: 20px; margin: 8px 0; }
li { margin-bottom: 4px; }
.subtle { color: #475569; font-size: 14px; }
.badge-success { background: rgba(34,197,94,0.15); color: #166534; }
.badge-warning { background: rgba(249,115,22,0.15); color: #9a3412; }
.table { width: 100%; border-collapse: collapse; margin-top: 12px; table-layout: fixed; }
.table th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; padding: 8px 12px; color: #475569; border-bottom: 1px solid #e2e8f0; }
.table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-size: 13px; word-break: break-word; white-space: normal; }
code { font-size: 12px; padding: 2px 6px; background: rgba(15,23,42,0.08); border-radius: 6px; display: inline-block; word-break: break-word; }
"""

STYLE_MODERN = """
@page { margin: 2mm; }
body { font-family: "Inter", Arial, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #fdf2f8 0%, #f1f5f9 45%, #ecfeff 100%); color: #0f172a; }
.page { width: 100%; margin: 0; padding: 32px 32px 48px 32px; box-sizing: border-box; }
.hero { background: linear-gradient(145deg, rgba(244,114,182,0.26), rgba(14,165,233,0.18)); border-radius: 32px; padding: 36px 42px; box-shadow: 0 28px 80px rgba(148,163,184,0.28); }
.hero-title { font-size: 32px; font-weight: 600; margin: 6px 0 0 0; }
.hero-meta { font-size: 13px; color: #475569; margin: 0; }
.badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px; background: rgba(56,189,248,0.16); color: #0f172a; font-size: 12px; font-weight: 600; letter-spacing: 0.3em; text-transform: uppercase; }
.grid { display: grid; gap: 18px; margin-top: 24px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.panel { background: rgba(255,255,255,0.78); border-radius: 24px; padding: 22px 24px; border: 1px solid rgba(226,232,240,0.7); box-shadow: 0 18px 46px rgba(148,163,184,0.18); }
.section-title { font-size: 20px; font-weight: 600; margin: 0; }
.section-subtitle { font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; margin: 0 0 12px 0; color: #64748b; }
.metric { font-size: 26px; font-weight: 600; margin: 4px 0; }
.metric-sub { font-size: 13px; color: #475569; margin: 0; }
.list { list-style: none; padding: 0; margin: 10px 0 0 0; font-size: 13px; color: #475569; }
.list li { margin-bottom: 6px; display: flex; gap: 10px; align-items: flex-start; }
.pill { display: inline-block; padding: 4px 12px; border-radius: 999px; background: rgba(59,130,246,0.12); color: #1e293b; font-size: 12px; margin-right: 8px; }
.table { width: 100%; border-collapse: collapse; margin-top: 16px; table-layout: fixed; font-size: 13px; color: #475569; }
.table th { text-align: left; text-transform: uppercase; font-size: 11px; letter-spacing: 0.25em; padding: 8px 10px; color: #0f172a; border-bottom: 1px solid rgba(148,163,184,0.25); }
.table td { padding: 10px; border-bottom: 1px solid rgba(226,232,240,0.6); word-break: break-word; }
.gradient-card { background: linear-gradient(160deg, rgba(56,189,248,0.18), rgba(6,182,212,0.1)); border-radius: 24px; padding: 24px; border: 1px solid rgba(125,211,252,0.25); box-shadow: 0 24px 64px rgba(2,132,199,0.18); }
.transcript { display: grid; gap: 16px; margin-top: 16px; }
.transcript-entry { background: rgba(255,255,255,0.85); border-radius: 18px; padding: 18px; border: 1px solid rgba(226,232,240,0.7); box-shadow: 0 12px 32px rgba(148,163,184,0.16); }
.transcript-meta { display: flex; justify-content: space-between; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px; }
.transcript-text { font-size: 13px; color: #475569; margin: 0; }
.full-transcript { margin-top: 20px; display: grid; gap: 14px; }
.full-transcript-entry { display: flex; gap: 16px; align-items: flex-start; background: rgba(255,255,255,0.88); border-radius: 16px; padding: 16px; border: 1px solid rgba(226,232,240,0.6); box-shadow: 0 10px 28px rgba(148,163,184,0.14); }
.full-transcript-role { min-width: 110px; font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase; color: #0f172a; font-weight: 600; }
.full-transcript-text { margin: 0; font-size: 13px; color: #475569; line-height: 1.6; }
.llm-grid { display: grid; gap: 14px; margin-top: 18px; grid-template-columns: repeat(auto-fit, minmax(240px,1fr)); }
.llm-card { background: rgba(15,23,42,0.04); border-radius: 18px; padding: 18px; border: 1px solid rgba(148,163,184,0.25); }
.muted { color: #64748b; font-size: 13px; }
"""

def render_report_pdf(report: InterviewReport, *, variant: str = "classic") -> bytes:  # Builds a PDF for the provided report payload.
    if HTML is None:
        raise RuntimeError("PDF rendering requires weasyprint; install the package to enable this feature.") from _IMPORT_ERROR
    html_body = render_report_html(report, variant=variant)
    return HTML(string=html_body).write_pdf()


def render_report_html(report: InterviewReport, *, variant: str = "classic") -> str:  # Formats the report payload into an HTML document.
    if variant == "modern":
        return _render_modern_html(report)
    return _render_classic_html(report)


def _render_classic_html(report: InterviewReport) -> str:
    builder: list[str] = []
    builder.append("<!DOCTYPE html>")
    builder.append("<html lang='en'>")
    builder.append("<head>")
    builder.append("<meta charset='utf-8' />")
    builder.append("<title>Interview Report</title>")
    builder.append("<style>")
    builder.append(STYLE_CLASSIC)
    builder.append("</style>")
    builder.append("</head>")
    builder.append("<body>")
    builder.append("<div class='page'>")
    builder.append("<header class='header'>")
    builder.append("<span class='pill badge-success'>Interview Report</span>")
    builder.append(f"<h1>{_escape(report.candidate.name)} — {_escape(report.position.job_title)}</h1>")
    builder.append(f"<p class='muted'>Report ID {_escape(report.report_id)} · Generated { _escape(_iso(report.generated_at)) } · Analyst {_escape(report.generated_by)}</p>")
    builder.append("</header>")
    _append_overview(builder, report)
    _append_session(builder, report)
    _append_competencies(builder, report)
    _append_transcript(builder, report)
    _append_metadata(builder, report)
    builder.append("</div>")
    builder.append("</body>")
    builder.append("</html>")
    return "".join(builder)


def _append_overview(builder: list[str], report: InterviewReport) -> None:  # Adds overview and metadata tiles.
    interview = report.interview
    candidate = report.candidate
    resume = candidate.resume_summary
    position = report.position
    builder.append("<section class='section'>")
    builder.append("<h2>Snapshot</h2>")
    builder.append("<div class='grid'>")
    builder.append("<div class='card'>")
    builder.append("<h3>Interview</h3>")
    builder.append(f"<p class='metric'>{_escape(interview.mode.title())}</p>")
    builder.append(f"<p class='subtle'>Scheduled {_escape(_iso(interview.scheduled_at))}<br />Duration {interview.duration_minutes} min</p>")
    if interview.stage_sequence:
        builder.append(f"<p class='muted'>Stages: {_escape(', '.join(interview.stage_sequence))}</p>")
    builder.append("</div>")

    builder.append("<div class='card'>")
    builder.append("<h3>Candidate</h3>")
    builder.append(f"<p class='metric'>{_escape(candidate.name)}</p>")
    builder.append(f"<p class='subtle'>{_escape(candidate.email)}</p>")
    if candidate.experience_years is not None:
        builder.append(f"<p class='muted'>Experience {candidate.experience_years:.1f} years</p>")
    if candidate.linked_profile:
        builder.append(f"<p class='muted'>Profile {_escape(candidate.linked_profile)}</p>")
    builder.append("</div>")

    builder.append("<div class='card'>")
    builder.append("<h3>Role</h3>")
    builder.append(f"<p class='metric'>{_escape(position.job_title)}</p>")
    builder.append(f"<p class='subtle'>Requisition {_escape(position.requisition_id)}<br />Hiring Manager {_escape(position.hiring_manager)}</p>")
    builder.append(f"<p class='muted'>{_escape(position.job_description_summary.mission)}</p>")
    builder.append("</div>")
    builder.append("</div>")

    builder.append("<div class='grid'>")
    if resume.highlights:
        builder.append("<div class='card'>")
        builder.append("<h3>Highlights</h3>")
        builder.append(_bullet_list(resume.highlights))
        builder.append("</div>")
    if resume.education:
        builder.append("<div class='card'>")
        builder.append("<h3>Education</h3>")
        builder.append(_bullet_list(f"{e.institution} — {e.credential} ({e.graduated})" for e in resume.education))
        builder.append("</div>")
    if resume.notable_projects:
        builder.append("<div class='card'>")
        builder.append("<h3>Projects</h3>")
        builder.append(_bullet_list(f"{p.name}: {p.description}" for p in resume.notable_projects))
        builder.append("</div>")
    builder.append("</div>")
    builder.append("</section>")


def _append_session(builder: list[str], report: InterviewReport) -> None:  # Adds warm-up and evaluation summary.
    summary = report.session_summary
    warmup = summary.warmup_outcome
    evaluation = report.overall_evaluation
    builder.append("<section class='section'>")
    builder.append("<h2>Session Summary</h2>")
    builder.append("<div class='grid'>")
    builder.append("<div class='card'>")
    builder.append("<h3>Warm-up</h3>")
    builder.append(f"<p class='muted'>{_escape(warmup.notes)}</p>")
    builder.append("</div>")

    builder.append("<div class='card'>")
    builder.append("<h3>Overall Evaluation</h3>")
    builder.append(f"<p class='metric'>{evaluation.overall_score}</p>")
    builder.append(f"<p class='subtle'>{_escape(evaluation.status.replace('_', ' ').title())} · Confidence {evaluation.confidence:.2f}</p>")
    thresholds = evaluation.scoring_scale.thresholds
    builder.append(
        f"<p class='muted'>Scale {evaluation.scoring_scale.min}-{evaluation.scoring_scale.max} · Strong≥{thresholds.strong_positive} · Lean≥{thresholds.lean_positive}</p>"
    )
    builder.append("</div>")
    builder.append("</div>")

    builder.append("<div class='grid'>")
    builder.append("<div class='card'>")
    builder.append("<h3>Strengths</h3>")
    builder.append(_bullet_list(evaluation.strengths, empty="None noted."))
    builder.append("</div>")
    builder.append("<div class='card'>")
    builder.append("<h3>Risks</h3>")
    builder.append(_bullet_list(evaluation.risks, empty="No major concerns recorded."))
    builder.append("</div>")
    builder.append("</div>")

    if summary.competency_progress:
        builder.append("<div class='card section'>")
        builder.append("<h3>Progress by Competency</h3>")
        builder.append("<table class='table'>")
        builder.append("<thead><tr><th>Competency</th><th>Style</th><th>Questions</th><th>Time (min)</th></tr></thead>")
        builder.append("<tbody>")
        for row in summary.competency_progress:
            builder.append("<tr>")
            builder.append(f"<td>{_escape(row.title)}</td>")
            builder.append(f"<td>{_escape(row.interview_style)}</td>")
            builder.append(f"<td>{row.question_count}</td>")
            builder.append(f"<td>{row.time_spent_minutes}</td>")
            builder.append("</tr>")
        builder.append("</tbody></table>")
        builder.append("</div>")

    builder.append("<div class='card section'>")
    builder.append("<h3>Wrap-up Notes</h3>")
    builder.append(f"<p>{_escape(summary.wrapup_notes)}</p>")
    builder.append("</div>")
    builder.append("</section>")


def _append_competencies(builder: list[str], report: InterviewReport) -> None:  # Adds competency-level scoring.
    builder.append("<section class='section'>")
    builder.append("<h2>Competency Results</h2>")
    if not report.competency_results:
        builder.append("<p class='muted'>No competency results recorded.</p>")
        builder.append("</section>")
        return
    for competency in report.competency_results:
        builder.append("<div class='card'>")
        builder.append(
            f"<h3>{_escape(competency.title)} · { _escape(competency.rating.replace('_', ' ').title()) } "
            f"<span class='pill'>{competency.score}</span></h3>"
        )
        builder.append(f"<p class='muted'>{_escape(competency.summary)}</p>")
        if competency.criteria:
            builder.append("<table class='table'>")
            builder.append("<thead><tr><th>Criterion</th><th>Score</th><th>Evidence</th></tr></thead>")
            builder.append("<tbody>")
            for criterion in competency.criteria:
                builder.append("<tr>")
                builder.append(f"<td>{_escape(criterion.name)}</td>")
                builder.append(f"<td>{criterion.score}/{criterion.max_score}</td>")
                builder.append(f"<td>{_escape(' | '.join(criterion.evidence) or '—')}</td>")
                builder.append("</tr>")
            builder.append("</tbody></table>")
        builder.append("</div>")
    if report.recommendations:
        builder.append("<div class='card section'>")
        builder.append("<h3>Recommendations</h3>")
        builder.append(_bullet_list(report.recommendations))
        builder.append("</div>")
    builder.append("</section>")


def _append_transcript(builder: list[str], report: InterviewReport) -> None:  # Adds transcript digest and full log.
    builder.append("<section class='section'>")
    builder.append("<h2>Transcript</h2>")
    if not report.transcript_full:
        builder.append("<p class='muted'>Transcript excerpts are not available.</p>")
        builder.append("</section>")
        return
    builder.append("<div class='card section'>")
    builder.append("<h3>Full Transcript</h3>")
    builder.append("<div class='transcript-full'>")
    for turn in report.transcript_full:
        text = _escape(turn.text).replace("\n", "<br />")
        builder.append("<div class='transcript-turn'>")
        builder.append(f"<span class='transcript-role'>{_escape(turn.role.title())}</span>")
        builder.append(f"<p class='transcript-body'>{text}</p>")
        builder.append("</div>")
    builder.append("</div></div>")
    builder.append("</section>")


def _append_metadata(builder: list[str], report: InterviewReport) -> None:  # Adds attachment paths and LLM metadata.
    builder.append("<section class='section'>")
    builder.append("<h2>Artifacts</h2>")
    attachments = report.attachments
    builder.append("<div class='card'>")
    builder.append(f"<p><strong>Transcript:</strong> <code>{_escape(attachments.full_transcript_path)}</code></p>")
    builder.append(f"<p><strong>Rubric Snapshot:</strong> <code>{_escape(attachments.rubric_snapshot_path)}</code></p>")
    builder.append("</div>")
    builder.append("<div class='card section'>")
    builder.append("<h3>LLM Routes</h3>")
    if not report.llm_metadata:
        builder.append("<p class='muted'>No LLM metadata recorded.</p>")
    else:
        builder.append("<table class='table'>")
        builder.append("<thead><tr><th>Label</th><th>Model</th><th>Endpoint</th><th>Timestamp</th><th>Temperature</th></tr></thead>")
        builder.append("<tbody>")
        for label, meta in report.llm_metadata.items():
            builder.append("<tr>")
            builder.append(f"<td>{_escape(label)}</td>")
            builder.append(f"<td>{_escape(meta.model)}</td>")
            builder.append(f"<td>{_escape(meta.route)} @ {_escape(meta.base_url)}</td>")
            builder.append(f"<td>{_escape(_iso(meta.timestamp))}</td>")
            builder.append(f"<td>{meta.temperature:.2f}</td>")
            builder.append("</tr>")
        builder.append("</tbody></table>")
    builder.append("</div>")
    builder.append("</section>")


def _render_modern_html(report: InterviewReport) -> str:  # Builds pastel, modern-styled report markup.
    builder: list[str] = []
    builder.append("<!DOCTYPE html><html lang='en'><head><meta charset='utf-8' />")
    builder.append("<title>Interview Report</title><style>")
    builder.append(STYLE_MODERN)
    builder.append("</style></head><body><div class='page'>")
    builder.append("<section class='hero'>")
    builder.append("<span class='badge'>Aurora Report</span>")
    builder.append(f"<h1 class='hero-title'>{_escape(report.candidate.name)} / {_escape(report.position.job_title)}</h1>")
    builder.append(f"<p class='hero-meta'>Report ID {_escape(report.report_id)} · Generated {_escape(_iso(report.generated_at))} · Analyst {_escape(report.generated_by)}</p>")
    builder.append("</section>")

    interview = report.interview
    candidate = report.candidate
    resume = candidate.resume_summary
    position = report.position

    builder.append("<div class='grid' style='margin-top:28px;'>")
    builder.append("<div class='panel'>")
    builder.append("<p class='section-subtitle'>Interview Snapshot</p>")
    builder.append(f"<h2 class='section-title'>{_escape(interview.mode.title())}</h2>")
    builder.append(f"<p class='metric-sub'>Scheduled {_escape(_iso(interview.scheduled_at))}</p>")
    builder.append(f"<p class='metric-sub'>Duration {interview.duration_minutes} minutes</p>")
    builder.append(f"<p class='muted'>Stages: {_escape(', '.join(interview.stage_sequence) or 'n/a')}</p>")
    builder.append("</div>")

    builder.append("<div class='panel'>")
    builder.append("<p class='section-subtitle'>Role Context</p>")
    builder.append(f"<h2 class='section-title'>{_escape(position.job_title)}</h2>")
    builder.append(f"<p class='metric-sub'>Requisition {_escape(position.requisition_id)}</p>")
    builder.append(f"<p class='metric-sub'>Hiring Manager {_escape(position.hiring_manager)}</p>")
    builder.append(f"<p class='muted'>{_escape(position.job_description_summary.mission)}</p>")
    builder.append("</div>")

    builder.append("<div class='panel'>")
    builder.append("<p class='section-subtitle'>Candidate Profile</p>")
    builder.append(f"<h2 class='section-title'>{_escape(candidate.name)}</h2>")
    builder.append(f"<p class='metric-sub'>{_escape(candidate.email)}</p>")
    if candidate.experience_years is not None:
        builder.append(f"<p class='metric-sub'>Experience {candidate.experience_years:.1f} years</p>")
    builder.append(f"<p class='muted'>{_escape(resume.headline)}</p>")
    if resume.highlights:
        builder.append("<div style='margin-top:12px;'>")
        for item in resume.highlights[:4]:
            builder.append(f"<span class='pill'>{_escape(item)}</span>")
        builder.append("</div>")
    builder.append("</div></div>")

    evaluation = report.overall_evaluation
    builder.append("<section class='gradient-card' style='margin-top:32px;'>")
    builder.append("<p class='section-subtitle'>Evaluation Pulse</p>")
    builder.append("<div style='display:flex;flex-wrap:wrap;gap:18px;align-items:flex-end;'>")
    builder.append(f"<div><p class='section-title'>Score {evaluation.overall_score}</p><p class='muted'>{_escape(evaluation.status.replace('_',' ').title())}</p></div>")
    builder.append(f"<div><p class='section-title'>{(evaluation.confidence*100):.0f}%</p><p class='muted'>Confidence</p></div>")
    thresholds = evaluation.scoring_scale.thresholds
    builder.append(f"<div><p class='muted'>Scale {evaluation.scoring_scale.min}-{evaluation.scoring_scale.max} · Strong≥{thresholds.strong_positive} · Lean≥{thresholds.lean_positive}</p></div>")
    builder.append("</div>")
    builder.append("<div class='grid' style='margin-top:24px;'>")
    builder.append("<div class='panel'>")
    builder.append("<p class='section-subtitle'>Strengths</p>")
    builder.append(_bullet_list(evaluation.strengths, empty="Strengths not captured."))
    builder.append("</div>")
    builder.append("<div class='panel'>")
    builder.append("<p class='section-subtitle'>Risks</p>")
    builder.append(_bullet_list(evaluation.risks, empty="No concerns recorded."))
    builder.append("</div>")
    builder.append("</div></section>")

    summary = report.session_summary
    builder.append("<div class='panel' style='margin-top:28px;'>")
    builder.append("<p class='section-subtitle'>Session Flow</p>")
    builder.append(f"<p class='muted'>{_escape(summary.wrapup_notes)}</p>")
    builder.append("<table class='table'><thead><tr><th>Competency</th><th>Style</th><th>Questions</th><th>Minutes</th></tr></thead><tbody>")
    for entry in summary.competency_progress:
        builder.append(
            "<tr>"
            f"<td>{_escape(entry.title)}</td>"
            f"<td>{_escape(entry.interview_style)}</td>"
            f"<td>{entry.question_count}</td>"
            f"<td>{entry.time_spent_minutes}</td>"
            "</tr>"
        )
    if not summary.competency_progress:
        builder.append("<tr><td colspan='4'>No competency progression recorded.</td></tr>")
    builder.append("</tbody></table></div>")

    builder.append("<div class='panel' style='margin-top:28px;'>")
    builder.append("<p class='section-subtitle'>Competency Landscape</p>")
    for competency in report.competency_results:
        builder.append("<div style='margin-bottom:20px;'>")
        builder.append(
            f"<p class='section-title'>{_escape(competency.title)} · {competency.score}"
            f"<span class='pill'>{_escape(competency.rating.replace('_',' ').title())}</span></p>"
        )
        builder.append(f"<p class='muted'>{_escape(competency.summary)}</p>")
        builder.append("<table class='table'><thead><tr><th>Criterion</th><th>Score</th><th>Evidence</th></tr></thead><tbody>")
        for criterion in competency.criteria:
            evidence = " | ".join(criterion.evidence) or "—"
            builder.append(
                "<tr>"
                f"<td>{_escape(criterion.name)}</td>"
                f"<td>{criterion.score}/{criterion.max_score}</td>"
                f"<td>{_escape(evidence)}</td>"
                "</tr>"
            )
        builder.append("</tbody></table></div>")
    if not report.competency_results:
        builder.append("<p class='muted'>Competency scores are not available.</p>")
    if report.recommendations:
        builder.append("<div class='panel' style='margin-top:16px;background:rgba(16,185,129,0.12);border-color:rgba(16,185,129,0.24);'>")
        builder.append("<p class='section-subtitle'>Recommendations</p>")
        builder.append(_bullet_list(report.recommendations))
        builder.append("</div>")
    builder.append("</div>")

    builder.append("<div class='panel' style='margin-top:28px;'>")
    builder.append("<p class='section-subtitle'>Conversation Canvas</p>")
    if report.transcript_full:
        builder.append("<div class='full-transcript'>")
        for turn in report.transcript_full:
            text = _escape(turn.text).replace("\n", "<br />")
            builder.append("<div class='full-transcript-entry'>")
            builder.append(f"<span class='full-transcript-role'>{_escape(turn.role.title())}</span>")
            builder.append(f"<p class='full-transcript-text'>{text}</p>")
            builder.append("</div>")
        builder.append("</div>")
    else:
        builder.append("<p class='muted'>Transcript excerpts are not available.</p>")
    builder.append("</div>")

    builder.append("<div class='panel' style='margin-top:28px;'>")
    builder.append("<p class='section-subtitle'>Artifacts & LLM Meta</p>")
    attachments = report.attachments
    builder.append(f"<p class='muted'><strong>Transcript:</strong> {_escape(attachments.full_transcript_path)}</p>")
    builder.append(f"<p class='muted'><strong>Rubric Snapshot:</strong> {_escape(attachments.rubric_snapshot_path)}</p>")
    builder.append("<div class='llm-grid'>")
    if report.llm_metadata:
        for label, meta in report.llm_metadata.items():
            builder.append("<div class='llm-card'>")
            builder.append(f"<p class='section-title' style='font-size:15px;margin-bottom:4px;'>{_escape(label.replace('_',' ').title())}</p>")
            builder.append(f"<p class='muted'>{_escape(meta.model)} · {_escape(meta.route)}</p>")
            builder.append(f"<p class='muted'>{_escape(meta.base_url)}</p>")
            builder.append(f"<p class='muted'>Temperature {meta.temperature:.2f} · {_escape(_iso(meta.timestamp))}</p>")
            builder.append("</div>")
    else:
        builder.append("<p class='muted'>LLM metadata not recorded.</p>")
    builder.append("</div></div></div></body></html>")
    return "".join(builder)


def _bullet_list(items: object, empty: str = "No entries recorded.") -> str:  # Renders items as an unordered list.
    sequence = list(items) if not isinstance(items, list) else items
    if not sequence:
        return f"<p class='muted'>{_escape(empty)}</p>"
    entries = "".join(f"<li>{_escape(str(item))}</li>" for item in sequence)
    return f"<ul>{entries}</ul>"


def _escape(value: str) -> str:  # Escapes HTML entities.
    return html.escape(value, quote=True)


def _iso(value: datetime) -> str:  # Formats datetime in ISO 8601.
    return value.isoformat()
