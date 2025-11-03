from __future__ import annotations

from io import BytesIO

from fpdf import FPDF  # Generates PDF exports.
from fpdf.errors import FPDFException  # Handles rendering exceptions.
import re

from ..schemas.report import InterviewReport  # Leverages structured report payload.

TEXT_PRIMARY = (17, 24, 39)
TEXT_SECONDARY = (75, 85, 99)
TEXT_MUTED = (107, 114, 128)
SUCCESS_TEXT = (21, 128, 61)
WARNING_TEXT = (161, 98, 7)
SUCCESS_BG = (220, 252, 231)
SUCCESS_BORDER = (187, 247, 208)
WARNING_BG = (254, 243, 199)
WARNING_BORDER = (253, 230, 138)
BORDER_COLOR = (229, 231, 235)
PAGE_GLOW = (249, 250, 251)
CARD_FILL = (255, 255, 255)


class _ReportPdf(FPDF):  # Minimal PDF helper to render interview report sections.
    def header(self) -> None:  # Renders persistent header.
        self.set_fill_color(*PAGE_GLOW)
        self.set_draw_color(*BORDER_COLOR)
        self.set_line_width(0.3)
        self.rect(self.l_margin, 8, self.epw, 16, "F")
        self.set_y(10)
        self.set_text_color(*TEXT_PRIMARY)
        self.set_font("Helvetica", "B", 16)
        self.cell(0, 8, "Interview Report", new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(*TEXT_MUTED)
        self.set_font("Helvetica", "", 10)
        self.cell(0, 5, "AI Interview Chatbot", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def footer(self) -> None:  # Renders footer with pagination.
        self.set_y(-15)
        self.set_draw_color(*BORDER_COLOR)
        self.set_line_width(0.2)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.set_y(-12)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*TEXT_MUTED)
        page_label = f"Page {self.page_no()}"
        self.cell(0, 8, page_label, align="C")


def render_report_pdf(report: InterviewReport) -> bytes:  # Builds a PDF for the provided report payload.
    pdf = _ReportPdf()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_draw_color(*BORDER_COLOR)
    pdf.set_text_color(*TEXT_SECONDARY)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_fill_color(*CARD_FILL)
    _render_overview(pdf, report)
    _render_session(pdf, report)
    _render_competencies(pdf, report)
    _render_metadata(pdf, report)
    buffer = BytesIO()
    pdf.output(buffer)  # type: ignore[arg-type]
    return buffer.getvalue()


def _sanitize_text(value: str, limit: int = 90) -> str:  # Breaks long tokens to fit PDF width.
    normalized = (
        value.replace("•", "-")
        .replace("–", "-")
        .replace("—", "-")
        .replace("’", "'")
        .replace("“", '"')
        .replace("”", '"')
        .encode("ascii", "ignore").decode("ascii")
    )
    parts: list[str] = []
    for token in re.split(r"(\s+)", normalized):
        if not token or token.isspace():
            parts.append(token)
            continue
        if len(token) <= limit:
            parts.append(token)
            continue
        chunks = [token[i : i + limit] for i in range(0, len(token), limit)]
        parts.append(" ".join(chunks))
    return "".join(parts)


def _cell(
    pdf: _ReportPdf,
    line_height: float,
    text: str,
    *,
    fill: bool = False,
    text_color: tuple[int, int, int] | None = None,
) -> None:  # Writes sanitized text within page width.
    content = _sanitize_text(text)
    width = getattr(pdf, "epw", pdf.w - pdf.l_margin - pdf.r_margin)
    pdf.set_x(pdf.l_margin)
    if text_color:
        pdf.set_text_color(*text_color)
    try:
        pdf.multi_cell(width, line_height, content, border=0, align="L", fill=fill)
    except FPDFException:
        fallback = " \n".join(content) or ""
        pdf.multi_cell(width, line_height, fallback, border=0, align="L", fill=fill)
    if text_color:
        pdf.set_text_color(*TEXT_SECONDARY)


def _section_title(pdf: _ReportPdf, title: str) -> None:  # Renders a themed section heading.
    pdf.set_text_color(*TEXT_PRIMARY)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 9, title, new_x="LMARGIN", new_y="NEXT")
    y = pdf.get_y()
    pdf.set_draw_color(*BORDER_COLOR)
    pdf.set_line_width(0.2)
    pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
    pdf.ln(3)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*TEXT_SECONDARY)


def _subheading(pdf: _ReportPdf, title: str) -> None:  # Renders subsection titles.
    pdf.set_text_color(*TEXT_PRIMARY)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 7, title, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*TEXT_SECONDARY)


def _label_value(
    pdf: _ReportPdf,
    label: str,
    value: str,
    *,
    emphasize: bool = False,
) -> None:  # Writes a label/value pair with styled typography.
    pdf.set_text_color(*TEXT_MUTED)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(0, 4, _sanitize_text(label), new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    color = TEXT_PRIMARY if emphasize else TEXT_SECONDARY
    _cell(pdf, 5, value, text_color=color)


def _render_overview(pdf: _ReportPdf, report: InterviewReport) -> None:  # Writes the overview section.
    _section_title(pdf, "Overview")
    _label_value(pdf, "Report ID", report.report_id, emphasize=True)
    _label_value(pdf, "Generated", report.generated_at.isoformat())
    _label_value(pdf, "Generated By", report.generated_by, emphasize=True)
    pdf.ln(2)

    candidate = report.candidate
    resume = candidate.resume_summary
    _subheading(pdf, "Candidate")
    _label_value(pdf, "Name", f"{candidate.name} ({candidate.email})", emphasize=True)
    headline = resume.headline or ""
    if headline:
        _label_value(pdf, "Experience Headline", headline)
    if resume.highlights:
        _label_value(pdf, "Highlights", "; ".join(resume.highlights[:3]))
    pdf.ln(2)

    position = report.position
    _subheading(pdf, "Position")
    _label_value(pdf, "Role", f"{position.job_title} | Req {position.requisition_id}", emphasize=True)
    _label_value(pdf, "Hiring Manager", position.hiring_manager)
    _label_value(pdf, "Mission", position.job_description_summary.mission)
    pdf.ln(3)


def _render_session(pdf: _ReportPdf, report: InterviewReport) -> None:  # Writes summary of session flow.
    _section_title(pdf, "Session Summary")
    outcome = report.session_summary.warmup_outcome
    _label_value(pdf, "Warm-up Comfort", f"{outcome.comfort_score:.2f} | Ready: {outcome.ready_signal}")
    _label_value(pdf, "Warm-up Notes", outcome.notes)
    pdf.ln(1)
    for entry in report.session_summary.competency_progress:
        pdf.set_font("Helvetica", "B", 10)
        _cell(pdf, 6, f"• {entry.title} ({entry.interview_style})", text_color=TEXT_PRIMARY)
        pdf.set_font("Helvetica", "", 10)
        _cell(pdf, 5, f"Questions: {entry.question_count} | Minutes: {entry.time_spent_minutes}")
        for highlight in entry.transcript_highlights[:3]:
            _cell(pdf, 5, f"- {highlight}")
        pdf.ln(1)
    pdf.ln(1)
    evaluation = report.overall_evaluation
    _subheading(pdf, "Overall Evaluation")
    summary_line = f"Status: {evaluation.status.replace('_', ' ')} | Score: {evaluation.overall_score} | Confidence: {evaluation.confidence:.2f}"
    _cell(pdf, 6, summary_line, text_color=TEXT_PRIMARY)
    if evaluation.strengths:
        pdf.set_fill_color(*SUCCESS_BG)
        pdf.set_draw_color(*SUCCESS_BORDER)
        _cell(pdf, 6, "Strengths", fill=True, text_color=SUCCESS_TEXT)
        for item in evaluation.strengths[:5]:
            _cell(pdf, 5, f"- {item}", fill=True, text_color=SUCCESS_TEXT)
        pdf.set_fill_color(*CARD_FILL)
        pdf.set_draw_color(*BORDER_COLOR)
        pdf.ln(1)
    if evaluation.risks:
        pdf.set_fill_color(*WARNING_BG)
        pdf.set_draw_color(*WARNING_BORDER)
        _cell(pdf, 6, "Risks", fill=True, text_color=WARNING_TEXT)
        for item in evaluation.risks[:5]:
            _cell(pdf, 5, f"- {item}", fill=True, text_color=WARNING_TEXT)
        pdf.set_fill_color(*CARD_FILL)
        pdf.set_draw_color(*BORDER_COLOR)
    pdf.ln(2)


def _render_competencies(pdf: _ReportPdf, report: InterviewReport) -> None:  # Writes competency breakdowns.
    _section_title(pdf, "Competency Results")
    for competency in report.competency_results:
        pdf.set_font("Helvetica", "B", 10)
        title_line = f"{competency.title} – {competency.rating.replace('_', ' ')} ({competency.score})"
        _cell(pdf, 6, title_line, text_color=TEXT_PRIMARY)
        pdf.set_font("Helvetica", "", 10)
        _cell(pdf, 5, competency.summary)
        for criterion in competency.criteria[:5]:
            _cell(pdf, 5, f"- {criterion.name}: {criterion.score}/{criterion.max_score}")
            for evidence in criterion.evidence[:2]:
                _cell(pdf, 5, f"  · {evidence}")
        pdf.ln(1)
    if report.recommendations:
        _subheading(pdf, "Recommendations")
        for item in report.recommendations[:6]:
            _cell(pdf, 5, f"- {item}")
        pdf.ln(2)


def _render_metadata(pdf: _ReportPdf, report: InterviewReport) -> None:  # Writes transcript and metadata.
    _section_title(pdf, "Transcript Highlights")
    for excerpt in report.transcript_digest[:6]:
        highlight = f"{excerpt.timestamp} [{excerpt.stage}] {excerpt.speaker}: {excerpt.excerpt}"
        _cell(pdf, 5, highlight)
    pdf.ln(2)
    _subheading(pdf, "LLM Metadata")
    if not report.llm_metadata:
        _cell(pdf, 5, "No LLM metadata recorded.")
        return
    for label, meta in report.llm_metadata.items():
        details = f"{meta.model} via {meta.route} at {meta.timestamp.isoformat()}"
        _label_value(pdf, label, details)
