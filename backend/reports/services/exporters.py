import io
from datetime import datetime
from itertools import groupby

from django.http import HttpResponse
from reportlab.platypus import SimpleDocTemplate

from reports.services.pdf_style import (
    MARGINS,
    PAGE_SIZE,
    build_grouped_pdf_elements,
    build_pdf_elements,
    draw_page_frame,
)

SUPPORTED_FORMATS = {"pdf"}


def _filename(report_type: str, data: dict | None = None) -> str:
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    election_name = "election"
    if data:
        election = data.get("election") or {}
        raw_name = election.get("name")
        if raw_name:
            election_name = "".join(
                char if char.isalnum() or char in ("-", "_") else "_"
                for char in str(raw_name).strip().replace(" ", "_")
            )
    return f"{report_type}_{election_name}_{timestamp}.pdf"


def _truncate_text(value: str, max_length: int = 56) -> str:
    text = str(value)
    if len(text) <= max_length:
        return text
    return f"{text[: max_length - 3]}..."


def _build_pdf_response(
    report_type: str,
    title: str,
    data: dict,
    *,
    # Flat-table mode (turnout, participation)
    headers: list[str] | None = None,
    rows: list[list] | None = None,
    summary_metrics: list[tuple[str, str]] | None = None,
    status_column: int | None = None,
    highlight_rows: set[int] | None = None,
    compact_columns: set[int] | None = None,
    column_weights: list[float] | None = None,
    footer_note: str | None = None,
    # Grouped-table mode (results, candidates)
    position_groups: list[dict] | None = None,
    group_headers: list[str] | None = None,
    group_column_weights: list[float] | None = None,
    group_status_column: int | None = None,
    group_highlight_field: str | None = None,
) -> HttpResponse:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=PAGE_SIZE, **MARGINS)

    if position_groups is not None:
        elements = build_grouped_pdf_elements(
            report_type,
            title,
            data,
            position_groups=position_groups,
            group_headers=group_headers or [],
            summary_metrics=summary_metrics,
            column_weights=group_column_weights,
            status_column=group_status_column,
            highlight_field=group_highlight_field,
        )
    else:
        elements = build_pdf_elements(
            report_type,
            title,
            headers or [],
            rows or [],
            data,
            summary_metrics=summary_metrics,
            status_column=status_column,
            highlight_rows=highlight_rows,
            compact_columns=compact_columns,
            column_weights=column_weights,
            footer_note=footer_note,
        )

    def on_page(canvas, document):
        draw_page_frame(canvas, document, title)

    doc.build(elements, onFirstPage=on_page, onLaterPages=on_page)
    buffer.seek(0)

    response = HttpResponse(buffer.read(), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{_filename(report_type, data)}"'
    return response


# ── Results (grouped by position) ────────────────────────────────

def export_results(fmt: str, data: dict) -> HttpResponse:
    # Build position groups from flat rows
    groups: list[dict] = []
    current_position: str | None = None
    current_rows: list[dict] = []

    for row in data["rows"]:
        if row["position"] != current_position:
            if current_position is not None:
                groups.append({"position": current_position, "rows": current_rows})
            current_position = row["position"]
            current_rows = []
        current_rows.append(row)
    if current_position is not None:
        groups.append({"position": current_position, "rows": current_rows})

    total_positions = len(groups)
    total_candidates = len(data["rows"])
    total_winners = sum(1 for row in data["rows"] if row["is_winner"])

    position_groups = []
    for group in groups:
        group_votes = sum(r["votes"] for r in group["rows"])
        candidate_count = len(group["rows"])
        winners = [r["candidate"] for r in group["rows"] if r["is_winner"]]
        winner_text = f" · Winner: {', '.join(winners)}" if winners else ""

        position_groups.append({
            "title": group["position"],
            "subtitle": (
                f"{candidate_count} candidate{'s' if candidate_count != 1 else ''}"
                f" · {group_votes} vote{'s' if group_votes != 1 else ''}"
                f"{winner_text}"
            ),
            "rows": [
                [
                    str(r["rank"]),
                    r["candidate"],
                    str(r["votes"]),
                    f"{r['percentage']}%",
                    "Winner" if r["is_winner"] else "",
                ]
                for r in group["rows"]
            ],
            "highlight_rows": {
                idx for idx, r in enumerate(group["rows"]) if r["is_winner"]
            },
        })

    return _build_pdf_response(
        "results",
        data["title"],
        data,
        summary_metrics=[
            ("Total votes cast", str(data["total_votes"])),
            ("Positions", str(total_positions)),
            ("Candidates", str(total_candidates)),
            ("Winners declared", str(total_winners)),
        ],
        position_groups=position_groups,
        group_headers=["Rank", "Candidate", "Votes", "Percentage", "Status"],
        group_column_weights=[0.6, 2.8, 0.8, 1.0, 0.8],
        group_status_column=4,
        group_highlight_field="is_winner",
    )


# ── Candidates (grouped by position) ────────────────────────────

def export_candidates(fmt: str, data: dict) -> HttpResponse:
    grouped = []
    total_positions = 0
    for position, items in groupby(data["rows"], key=lambda r: r["position"]):
        rows_for_position = list(items)
        total_positions += 1

        # Count academic year breakdown
        year_counts: dict[str, int] = {}
        for r in rows_for_position:
            year = r["academic_year"]
            year_counts[year] = year_counts.get(year, 0) + 1
        year_breakdown = " · ".join(f"{y}: {c}" for y, c in sorted(year_counts.items()))

        candidate_count = len(rows_for_position)
        grouped.append({
            "title": position,
            "subtitle": (
                f"{candidate_count} candidate{'s' if candidate_count != 1 else ''}"
                f" · {year_breakdown}"
            ),
            "rows": [
                [
                    r["full_name"],
                    r["academic_year"],
                    _truncate_text(r["photo_url"]),
                ]
                for r in rows_for_position
            ],
        })

    return _build_pdf_response(
        "candidates",
        data["title"],
        data,
        summary_metrics=[
            ("Total candidates", str(len(data["rows"]))),
            ("Positions", str(total_positions)),
        ],
        position_groups=grouped,
        group_headers=["Full Name", "Academic Year", "Photo URL"],
        group_column_weights=[2.2, 1.2, 3.0],
    )


# ── Turnout (flat table — one row per position) ─────────────────

def export_turnout(fmt: str, data: dict) -> HttpResponse:
    summary = data["summary"]
    headers = ["Position", "Total Members", "Votes Cast", "Turnout %", "Remaining Voters"]
    rows = [
        [
            row["position"],
            str(summary["total_members"]),
            str(row["votes_cast"]),
            f"{row['turnout_percentage']}%",
            str(row["remaining_voters"]),
        ]
        for row in data["rows"]
    ]

    # Build footer note with member ballot breakdown
    footer = (
        f"Member ballot breakdown: "
        f"{summary['members_completed_ballot']} completed all positions, "
        f"{summary['members_partial_ballot']} voted partially, "
        f"{summary['members_no_votes']} did not vote at all."
    )

    return _build_pdf_response(
        "turnout",
        data["title"],
        data,
        headers=headers,
        rows=rows,
        summary_metrics=[
            ("Total members", str(summary["total_members"])),
            ("Total votes cast", str(summary["votes_cast"])),
            ("Average turnout", f"{summary['turnout_percentage']}%"),
            ("Full ballot completion", f"{summary['full_ballot_completion_percentage']}%"),
            ("Completed ballot", str(summary["members_completed_ballot"])),
            ("No vote", str(summary["members_no_votes"])),
        ],
        column_weights=[2.4, 1.0, 1.0, 1.0, 1.2],
        footer_note=footer,
    )


# ── Participation (flat table) ───────────────────────────────────

def export_participation(fmt: str, data: dict) -> HttpResponse:
    headers = [
        "CPM Number",
        "Positions Voted",
        "Total Positions",
        "Completion %",
        "Status",
        "Voted Positions",
    ]
    total_members = len(data["rows"])
    rows = []
    complete = 0
    partial = 0
    no_vote = 0
    for row in data["rows"]:
        status = row["participation_status"]
        if status == "Complete":
            complete += 1
        elif status == "Partial":
            partial += 1
        else:
            no_vote += 1

        total_pos = row["total_positions"]
        voted = row["positions_voted"]
        pct = f"{round((voted / total_pos) * 100)}%" if total_pos > 0 else "0%"

        rows.append([
            row["cpm_number"],
            str(voted),
            str(total_pos),
            pct,
            status,
            row["voted_positions"] if row["voted_positions"] else "—",
        ])

    # Compute overall participation rate
    participation_rate = f"{round((complete / total_members) * 100)}%" if total_members > 0 else "0%"

    footer = (
        f"Note: 'Complete' means the member voted for all {data['rows'][0]['total_positions'] if data['rows'] else 0} "
        f"available positions. 'Partial' means at least one position was voted on. "
        f"'No Vote' means the member did not cast any ballot."
    )

    return _build_pdf_response(
        "participation",
        data["title"],
        data,
        headers=headers,
        rows=rows,
        summary_metrics=[
            ("Total members", str(total_members)),
            ("Complete ballots", str(complete)),
            ("Partial ballots", str(partial)),
            ("No vote", str(no_vote)),
            ("Full completion rate", participation_rate),
        ],
        status_column=4,
        compact_columns={5},
        column_weights=[1.1, 0.9, 0.9, 0.9, 0.9, 3.0],
        footer_note=footer,
    )
