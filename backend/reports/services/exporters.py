import csv
import io
from datetime import datetime

from django.http import HttpResponse
from openpyxl import Workbook
from reportlab.platypus import SimpleDocTemplate

from reports.services.pdf_style import (
    MARGINS,
    PAGE_SIZE,
    build_pdf_elements,
    draw_page_frame,
)

SUPPORTED_FORMATS = {"csv", "xlsx", "pdf"}


def _filename(report_type: str, fmt: str) -> str:
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    return f"{report_type}_{timestamp}.{fmt}"


def _election_header_lines(data: dict) -> list[str]:
    election = data.get("election")
    if not election:
        return ["Election: N/A"]
    return [
        f"Election: {election.get('name', 'N/A')}",
        f"Status: {election.get('status', 'N/A')}",
    ]


def export_csv(report_type: str, headers: list[str], rows: list[list], data: dict) -> HttpResponse:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    for line in _election_header_lines(data):
        writer.writerow([line])
    writer.writerow([])
    writer.writerow(headers)
    for row in rows:
        writer.writerow(row)

    response = HttpResponse(buffer.getvalue(), content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{_filename(report_type, "csv")}"'
    return response


def export_xlsx(
    report_type: str,
    sheet_title: str,
    headers: list[str],
    rows: list[list],
    data: dict,
    extra_rows: list[list] | None = None,
) -> HttpResponse:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = sheet_title[:31]

    for line in _election_header_lines(data):
        sheet.append([line])
    sheet.append([])

    if extra_rows:
        for row in extra_rows:
            sheet.append(row)
        sheet.append([])

    sheet.append(headers)
    for row in rows:
        sheet.append(row)

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    response = HttpResponse(
        buffer.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{_filename(report_type, "xlsx")}"'
    return response


def _truncate_text(value: str, max_length: int = 56) -> str:
    text = str(value)
    if len(text) <= max_length:
        return text
    return f"{text[: max_length - 3]}..."


def export_pdf(
    report_type: str,
    title: str,
    headers: list[str],
    rows: list[list],
    data: dict,
    extra_lines: list[str] | None = None,
    *,
    summary_metrics: list[tuple[str, str]] | None = None,
    status_column: int | None = None,
    highlight_rows: set[int] | None = None,
    compact_columns: set[int] | None = None,
    column_weights: list[float] | None = None,
) -> HttpResponse:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=PAGE_SIZE, **MARGINS)

    if summary_metrics is None and extra_lines:
        summary_metrics = []
        for line in extra_lines:
            if ":" in line:
                label, value = line.split(":", 1)
                summary_metrics.append((label.strip(), value.strip()))
            else:
                summary_metrics.append((line, ""))

    elements = build_pdf_elements(
        report_type,
        title,
        headers,
        rows,
        data,
        summary_metrics=summary_metrics,
        status_column=status_column,
        highlight_rows=highlight_rows,
        compact_columns=compact_columns,
        column_weights=column_weights,
    )

    def on_page(canvas, document):
        draw_page_frame(canvas, document, title)

    doc.build(elements, onFirstPage=on_page, onLaterPages=on_page)
    buffer.seek(0)

    response = HttpResponse(buffer.read(), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{_filename(report_type, "pdf")}"'
    return response


def export_results(fmt: str, data: dict) -> HttpResponse:
    headers = ["Position", "Rank", "Candidate", "Votes", "Percentage", "Winner"]
    rows = [
        [
            row["position"],
            row["rank"],
            row["candidate"],
            row["votes"],
            f"{row['percentage']}%",
            "Yes" if row["is_winner"] else "No",
        ]
        for row in data["rows"]
    ]
    extra_lines = [f"Total Votes: {data['total_votes']}"]
    if fmt == "csv":
        return export_csv("results", headers, rows, data)
    if fmt == "xlsx":
        return export_xlsx("results", "Results", headers, rows, data, [[f"Total Votes: {data['total_votes']}"]])
    winner_rows = {index for index, row in enumerate(data["rows"]) if row["is_winner"]}
    return export_pdf(
        "results",
        data["title"],
        headers,
        rows,
        data,
        extra_lines,
        summary_metrics=[("Total votes cast", str(data["total_votes"]))],
        status_column=5,
        highlight_rows=winner_rows,
        column_weights=[2.2, 0.7, 2.2, 0.9, 1, 0.9],
    )


def export_candidates(fmt: str, data: dict) -> HttpResponse:
    headers = ["Full Name", "Academic Year", "Position", "Photo URL"]
    rows = [
        [
            row["full_name"],
            row["academic_year"],
            row["position"],
            row["photo_url"] if fmt != "pdf" else _truncate_text(row["photo_url"]),
        ]
        for row in data["rows"]
    ]
    if fmt == "csv":
        return export_csv("candidates", headers, rows, data)
    if fmt == "xlsx":
        return export_xlsx("candidates", "Candidates", headers, rows, data)
    return export_pdf(
        "candidates",
        data["title"],
        headers,
        rows,
        data,
        summary_metrics=[("Total candidates", str(len(data["rows"])))],
        compact_columns={3},
        column_weights=[2, 1.1, 1.6, 2.8],
    )


def export_turnout(fmt: str, data: dict) -> HttpResponse:
    summary = data["summary"]
    headers = ["Position", "Votes Cast", "Turnout %", "Remaining Voters"]
    rows = [
        [
            row["position"],
            row["votes_cast"],
            f"{row['turnout_percentage']}%",
            row["remaining_voters"],
        ]
        for row in data["rows"]
    ]
    extra = [
        f"Total Members: {summary['total_members']}",
        f"Votes Cast: {summary['votes_cast']}",
        f"Average Turnout %: {summary['turnout_percentage']}",
        f"Full Ballot Completion %: {summary['full_ballot_completion_percentage']}",
        f"Complete: {summary['members_completed_ballot']} | Partial: {summary['members_partial_ballot']} | No Vote: {summary['members_no_votes']}",
    ]
    if fmt == "csv":
        buffer_rows = [[line] for line in extra] + [[]] + [headers] + rows
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        for line in _election_header_lines(data):
            writer.writerow([line])
        writer.writerow([])
        for row in buffer_rows:
            writer.writerow(row)
        response = HttpResponse(buffer.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{_filename("turnout", "csv")}"'
        return response
    if fmt == "xlsx":
        return export_xlsx(
            "turnout",
            "Turnout",
            headers,
            rows,
            data,
            extra_rows=[[line] for line in extra],
        )
    return export_pdf(
        "turnout",
        data["title"],
        headers,
        rows,
        data,
        extra,
        summary_metrics=[
            ("Total members", str(summary["total_members"])),
            ("Votes cast", str(summary["votes_cast"])),
            ("Average turnout", f"{summary['turnout_percentage']}%"),
            ("Full ballot completion", f"{summary['full_ballot_completion_percentage']}%"),
        ],
        column_weights=[2.4, 1.1, 1.1, 1.4],
    )


def export_participation(fmt: str, data: dict) -> HttpResponse:
    headers = [
        "CPM Number",
        "Positions Voted",
        "Total Positions",
        "Status",
        "Voted Positions",
    ]
    rows = [
        [
            row["cpm_number"],
            row["positions_voted"],
            row["total_positions"],
            row["participation_status"],
            row["voted_positions"],
        ]
        for row in data["rows"]
    ]
    if fmt == "csv":
        return export_csv("participation", headers, rows, data)
    if fmt == "xlsx":
        return export_xlsx("participation", "Participation", headers, rows, data)
    complete = sum(1 for row in data["rows"] if row["participation_status"] == "Complete")
    partial = sum(1 for row in data["rows"] if row["participation_status"] == "Partial")
    no_vote = sum(1 for row in data["rows"] if row["participation_status"] == "No Vote")
    return export_pdf(
        "participation",
        data["title"],
        headers,
        rows,
        data,
        summary_metrics=[
            ("Members", str(len(data["rows"]))),
            ("Complete ballots", str(complete)),
            ("Partial ballots", str(partial)),
            ("No vote", str(no_vote)),
        ],
        status_column=3,
        compact_columns={4},
        column_weights=[1.2, 1, 1, 1.1, 3.2],
    )
