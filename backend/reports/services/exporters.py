import csv
import io
from datetime import datetime

from django.http import HttpResponse
from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

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


def export_pdf(
    report_type: str,
    title: str,
    headers: list[str],
    rows: list[list],
    data: dict,
    extra_lines: list[str] | None = None,
) -> HttpResponse:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))
    styles = getSampleStyleSheet()
    elements = [Paragraph(title, styles["Title"]), Spacer(1, 12)]

    for line in _election_header_lines(data):
        elements.append(Paragraph(line, styles["Normal"]))
    if extra_lines:
        for line in extra_lines:
            elements.append(Paragraph(line, styles["Normal"]))
    elements.append(Spacer(1, 12))

    table_data = [headers, *rows]
    table = Table(table_data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ]
        )
    )
    elements.append(table)
    doc.build(elements)
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
            row["percentage"],
            "Yes" if row["is_winner"] else "No",
        ]
        for row in data["rows"]
    ]
    extra_lines = [f"Total Votes: {data['total_votes']}"]
    if fmt == "csv":
        return export_csv("results", headers, rows, data)
    if fmt == "xlsx":
        return export_xlsx("results", "Results", headers, rows, data, [[f"Total Votes: {data['total_votes']}"]])
    return export_pdf("results", data["title"], headers, rows, data, extra_lines)


def export_candidates(fmt: str, data: dict) -> HttpResponse:
    headers = ["Full Name", "Academic Year", "Position", "Photo URL"]
    rows = [
        [row["full_name"], row["academic_year"], row["position"], row["photo_url"]]
        for row in data["rows"]
    ]
    if fmt == "csv":
        return export_csv("candidates", headers, rows, data)
    if fmt == "xlsx":
        return export_xlsx("candidates", "Candidates", headers, rows, data)
    return export_pdf("candidates", data["title"], headers, rows, data)


def export_turnout(fmt: str, data: dict) -> HttpResponse:
    summary = data["summary"]
    headers = ["Position", "Votes Cast", "Turnout %", "Remaining Voters"]
    rows = [
        [
            row["position"],
            row["votes_cast"],
            row["turnout_percentage"],
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
    return export_pdf("turnout", data["title"], headers, rows, data, extra)


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
    return export_pdf("participation", data["title"], headers, rows, data)
