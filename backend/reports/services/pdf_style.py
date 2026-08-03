"""Shared styling utilities for election PDF exports."""

from __future__ import annotations

from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle

PAGE_SIZE = landscape(A4)
PAGE_WIDTH, PAGE_HEIGHT = PAGE_SIZE

# Brand palette aligned with the web app
BRAND_PRIMARY = colors.HexColor("#2f6fed")
BRAND_PRIMARY_DARK = colors.HexColor("#1e4fc2")
BRAND_PRIMARY_LIGHT = colors.HexColor("#dbeafe")
BRAND_SLATE_900 = colors.HexColor("#0f172a")
BRAND_SLATE_700 = colors.HexColor("#334155")
BRAND_SLATE_500 = colors.HexColor("#64748b")
BRAND_SLATE_200 = colors.HexColor("#e2e8f0")
BRAND_SLATE_50 = colors.HexColor("#f8fafc")
BRAND_WHITE = colors.white
BRAND_SUCCESS_BG = colors.HexColor("#ecfdf5")
BRAND_SUCCESS_TEXT = colors.HexColor("#047857")
BRAND_WARNING_BG = colors.HexColor("#fffbeb")
BRAND_WARNING_TEXT = colors.HexColor("#b45309")
BRAND_DANGER_BG = colors.HexColor("#fef2f2")
BRAND_DANGER_TEXT = colors.HexColor("#b91c1c")
BRAND_MUTED_BG = colors.HexColor("#f1f5f9")

ORG_NAME = "EC Election System"
ORG_TAGLINE = "Executive Committee Election Management"

MARGINS = dict(leftMargin=42, rightMargin=42, topMargin=54, bottomMargin=52)


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "PdfTitle",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=BRAND_SLATE_900,
            spaceAfter=2,
        ),
        "subtitle": ParagraphStyle(
            "PdfSubtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=BRAND_SLATE_500,
            spaceAfter=10,
        ),
        "meta_label": ParagraphStyle(
            "PdfMetaLabel",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=BRAND_SLATE_500,
        ),
        "meta_value": ParagraphStyle(
            "PdfMetaValue",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=12,
            textColor=BRAND_SLATE_900,
        ),
        "summary_label": ParagraphStyle(
            "PdfSummaryLabel",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=BRAND_SLATE_500,
            alignment=TA_CENTER,
        ),
        "summary_value": ParagraphStyle(
            "PdfSummaryValue",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=16,
            textColor=BRAND_PRIMARY_DARK,
            alignment=TA_CENTER,
        ),
        "cell": ParagraphStyle(
            "PdfCell",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=BRAND_SLATE_700,
        ),
        "cell_bold": ParagraphStyle(
            "PdfCellBold",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11,
            textColor=BRAND_SLATE_900,
        ),
        "cell_small": ParagraphStyle(
            "PdfCellSmall",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=9,
            textColor=BRAND_SLATE_500,
        ),
        "group_heading": ParagraphStyle(
            "PdfGroupHeading",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=BRAND_PRIMARY_DARK,
            spaceBefore=16,
            spaceAfter=2,
        ),
        "group_subtitle": ParagraphStyle(
            "PdfGroupSubtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=BRAND_SLATE_500,
            spaceAfter=6,
        ),
        "section_note": ParagraphStyle(
            "PdfSectionNote",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=8,
            leading=10,
            textColor=BRAND_SLATE_500,
            spaceBefore=6,
            spaceAfter=4,
        ),
        "empty": ParagraphStyle(
            "PdfEmpty",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=10,
            leading=13,
            textColor=BRAND_SLATE_500,
            alignment=TA_CENTER,
            spaceBefore=8,
            spaceAfter=8,
        ),
    }


def draw_page_frame(canvas, doc, report_title: str) -> None:
    canvas.saveState()
    generated = datetime.utcnow().strftime("%d %b %Y, %H:%M UTC")

    canvas.setFillColor(BRAND_PRIMARY)
    canvas.rect(0, PAGE_HEIGHT - 30, PAGE_WIDTH, 30, fill=1, stroke=0)

    canvas.setFillColor(BRAND_WHITE)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(MARGINS["leftMargin"], PAGE_HEIGHT - 20, ORG_NAME)

    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(PAGE_WIDTH - MARGINS["rightMargin"], PAGE_HEIGHT - 20, ORG_TAGLINE)

    canvas.setStrokeColor(BRAND_SLATE_200)
    canvas.setLineWidth(0.6)
    canvas.line(
        MARGINS["leftMargin"],
        40,
        PAGE_WIDTH - MARGINS["rightMargin"],
        40,
    )

    canvas.setFillColor(BRAND_SLATE_500)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(MARGINS["leftMargin"], 26, f"Generated {generated}")
    canvas.drawCentredString(PAGE_WIDTH / 2, 26, report_title)
    canvas.drawRightString(
        PAGE_WIDTH - MARGINS["rightMargin"],
        26,
        f"Page {doc.page}",
    )

    canvas.restoreState()


def _paragraph(text: str, style: ParagraphStyle) -> Paragraph:
    safe = str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return Paragraph(safe, style)


def build_title_block(title: str, report_type: str) -> list:
    styles = _styles()
    readable_type = report_type.replace("_", " ").title()
    return [
        _paragraph(title, styles["title"]),
        _paragraph(f"{readable_type} · Confidential institutional report", styles["subtitle"]),
    ]


def build_meta_block(data: dict) -> list:
    styles = _styles()
    election = data.get("election") or {}
    election_name = election.get("name", "N/A")
    election_status = str(election.get("status", "N/A")).replace("_", " ").title()
    academic_year = data.get("academic_year", "")

    # Build meta columns — always show election, status, report date
    label_cells = [
        _paragraph("Election", styles["meta_label"]),
        _paragraph("Status", styles["meta_label"]),
        _paragraph("Report date", styles["meta_label"]),
    ]
    value_cells = [
        _paragraph(election_name, styles["meta_value"]),
        _paragraph(election_status, styles["meta_value"]),
        _paragraph(datetime.utcnow().strftime("%d %B %Y"), styles["meta_value"]),
    ]
    col_widths = [3.4 * inch, 2.2 * inch, 2.2 * inch]

    # Add academic year column if present
    if academic_year:
        label_cells.append(_paragraph("Academic year", styles["meta_label"]))
        value_cells.append(_paragraph(academic_year, styles["meta_value"]))
        col_widths = [2.6 * inch, 1.8 * inch, 1.8 * inch, 1.6 * inch]

    meta_table = Table(
        [label_cells, value_cells],
        colWidths=col_widths,
    )
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), BRAND_SLATE_50),
                ("BOX", (0, 0), (-1, -1), 0.6, BRAND_SLATE_200),
                ("LINEBELOW", (0, 0), (-1, 0), 0.4, BRAND_SLATE_200),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    return [meta_table, Spacer(1, 14)]


def build_summary_cards(metrics: list[tuple[str, str]]) -> list:
    if not metrics:
        return []

    styles = _styles()
    labels = [_paragraph(label, styles["summary_label"]) for label, _ in metrics]
    values = [_paragraph(value, styles["summary_value"]) for _, value in metrics]
    col_width = min(2.3 * inch, (PAGE_WIDTH - 84) / max(len(metrics), 1))

    card = Table([labels, values], colWidths=[col_width] * len(metrics))
    card.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), BRAND_WHITE),
                ("BOX", (0, 0), (-1, -1), 0.8, BRAND_SLATE_200),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, BRAND_SLATE_200),
                ("TOPPADDING", (0, 0), (-1, 0), 8),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 10),
                ("TOPPADDING", (0, 1), (-1, 1), 2),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    return [card, Spacer(1, 14)]


def _status_cell_style(status: str) -> tuple[colors.Color, colors.Color]:
    normalized = str(status).strip().lower()
    if normalized in {"complete", "yes", "winner"}:
        return BRAND_SUCCESS_BG, BRAND_SUCCESS_TEXT
    if normalized == "partial":
        return BRAND_WARNING_BG, BRAND_WARNING_TEXT
    if normalized in {"no vote", "no"}:
        return BRAND_DANGER_BG, BRAND_DANGER_TEXT
    return BRAND_WHITE, BRAND_SLATE_700


def build_data_table(
    headers: list[str],
    rows: list[list],
    *,
    status_column: int | None = None,
    highlight_rows: set[int] | None = None,
    compact_columns: set[int] | None = None,
    column_weights: list[float] | None = None,
) -> Table:
    styles = _styles()
    compact_columns = compact_columns or set()

    header_cells = [_paragraph(header, styles["cell_bold"]) for header in headers]
    body_rows = []
    for row in rows:
        cells = []
        for index, value in enumerate(row):
            style = styles["cell_small"] if index in compact_columns else styles["cell"]
            cells.append(_paragraph(value, style))
        body_rows.append(cells)

    table_data = [header_cells, *body_rows] if body_rows else [header_cells]
    col_count = len(headers)
    usable_width = PAGE_WIDTH - MARGINS["leftMargin"] - MARGINS["rightMargin"]
    if column_weights and len(column_weights) == col_count:
        weight_total = sum(column_weights)
        col_widths = [usable_width * (weight / weight_total) for weight in column_weights]
    else:
        col_widths = [usable_width / max(col_count, 1)] * col_count
    table = Table(table_data, colWidths=col_widths, repeatRows=1)

    table_style = [
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY_DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), BRAND_WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, 0), 1, BRAND_PRIMARY),
        ("GRID", (0, 0), (-1, -1), 0.35, BRAND_SLATE_200),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [BRAND_WHITE, BRAND_SLATE_50]),
    ]

    if highlight_rows:
        for row_index in highlight_rows:
            table_style.append(
                ("BACKGROUND", (0, row_index + 1), (-1, row_index + 1), BRAND_SUCCESS_BG)
            )
            table_style.append(
                ("TEXTCOLOR", (0, row_index + 1), (-1, row_index + 1), BRAND_SUCCESS_TEXT)
            )

    if status_column is not None:
        for row_index, row in enumerate(rows):
            if status_column >= len(row):
                continue
            bg, fg = _status_cell_style(row[status_column])
            table_style.append(
                ("BACKGROUND", (status_column, row_index + 1), (status_column, row_index + 1), bg)
            )
            table_style.append(
                ("TEXTCOLOR", (status_column, row_index + 1), (status_column, row_index + 1), fg)
            )
            table_style.append(
                ("FONTNAME", (status_column, row_index + 1), (status_column, row_index + 1), "Helvetica-Bold")
            )

    table.setStyle(TableStyle(table_style))
    return table


# ── Grouped table builder ────────────────────────────────────────
#
# Renders multiple position sections, each with a position heading,
# optional subtitle, and its own sub-table, avoiding repeated
# position names in every row.


def _build_group_section(
    group: dict,
    headers: list[str],
    *,
    column_weights: list[float] | None = None,
    status_column: int | None = None,
) -> list:
    """Build elements for a single position group: heading + subtitle + table."""
    styles = _styles()
    elements = []

    # Position heading
    position_title = group.get("title", "Unknown Position")
    elements.append(_paragraph(position_title, styles["group_heading"]))

    # Optional subtitle with contextual info (candidate count, vote totals, etc.)
    subtitle = group.get("subtitle")
    if subtitle:
        elements.append(_paragraph(subtitle, styles["group_subtitle"]))

    rows = group.get("rows", [])
    highlight_rows = group.get("highlight_rows") or set()

    if not rows:
        elements.append(_paragraph("No candidates for this position.", styles["empty"]))
        return elements

    # Build sub-table
    header_cells = [_paragraph(h, styles["cell_bold"]) for h in headers]
    body_rows = []
    for row in rows:
        cells = [_paragraph(str(val), styles["cell"]) for val in row]
        body_rows.append(cells)

    table_data = [header_cells, *body_rows]
    col_count = len(headers)
    usable_width = PAGE_WIDTH - MARGINS["leftMargin"] - MARGINS["rightMargin"]
    if column_weights and len(column_weights) == col_count:
        weight_total = sum(column_weights)
        col_widths = [usable_width * (w / weight_total) for w in column_weights]
    else:
        col_widths = [usable_width / max(col_count, 1)] * col_count

    table = Table(table_data, colWidths=col_widths, repeatRows=1)

    table_style = [
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), BRAND_WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, 0), 0.8, BRAND_PRIMARY_DARK),
        ("GRID", (0, 0), (-1, -1), 0.3, BRAND_SLATE_200),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [BRAND_WHITE, BRAND_SLATE_50]),
    ]

    # Highlight winner rows
    if highlight_rows:
        for row_index in highlight_rows:
            table_style.append(
                ("BACKGROUND", (0, row_index + 1), (-1, row_index + 1), BRAND_SUCCESS_BG)
            )
            table_style.append(
                ("TEXTCOLOR", (0, row_index + 1), (-1, row_index + 1), BRAND_SUCCESS_TEXT)
            )
            table_style.append(
                ("FONTNAME", (0, row_index + 1), (-1, row_index + 1), "Helvetica-Bold")
            )

    # Status column styling
    if status_column is not None:
        for row_index, row in enumerate(rows):
            if status_column >= len(row):
                continue
            cell_value = str(row[status_column]).strip()
            if cell_value:
                bg, fg = _status_cell_style(cell_value)
                table_style.append(
                    ("BACKGROUND", (status_column, row_index + 1), (status_column, row_index + 1), bg)
                )
                table_style.append(
                    ("TEXTCOLOR", (status_column, row_index + 1), (status_column, row_index + 1), fg)
                )
                table_style.append(
                    ("FONTNAME", (status_column, row_index + 1), (status_column, row_index + 1), "Helvetica-Bold")
                )

    table.setStyle(TableStyle(table_style))
    elements.append(table)
    elements.append(Spacer(1, 8))

    # Optional footer note under the table
    footer_note = group.get("footer_note")
    if footer_note:
        elements.append(_paragraph(footer_note, styles["section_note"]))

    return elements


def build_grouped_pdf_elements(
    report_type: str,
    title: str,
    data: dict,
    *,
    position_groups: list[dict],
    group_headers: list[str],
    summary_metrics: list[tuple[str, str]] | None = None,
    column_weights: list[float] | None = None,
    status_column: int | None = None,
    highlight_field: str | None = None,
) -> list:
    """Build PDF elements with data grouped under position headings."""
    elements = build_title_block(title, report_type)
    elements.extend(build_meta_block(data))

    if summary_metrics:
        elements.extend(build_summary_cards(summary_metrics))

    if not position_groups:
        elements.append(_paragraph("No records available for this report.", _styles()["empty"]))
        return elements

    for group in position_groups:
        elements.extend(
            _build_group_section(
                group,
                group_headers,
                column_weights=column_weights,
                status_column=status_column,
            )
        )

    return elements


# ── Flat-table PDF builder (turnout, participation) ──────────────

def build_pdf_elements(
    report_type: str,
    title: str,
    headers: list[str],
    rows: list[list],
    data: dict,
    *,
    summary_metrics: list[tuple[str, str]] | None = None,
    status_column: int | None = None,
    highlight_rows: set[int] | None = None,
    compact_columns: set[int] | None = None,
    column_weights: list[float] | None = None,
    footer_note: str | None = None,
) -> list:
    elements = build_title_block(title, report_type)
    elements.extend(build_meta_block(data))
    if summary_metrics:
        elements.extend(build_summary_cards(summary_metrics))

    if rows:
        elements.append(
            build_data_table(
                headers,
                rows,
                status_column=status_column,
                highlight_rows=highlight_rows,
                compact_columns=compact_columns,
                column_weights=column_weights,
            )
        )
        if footer_note:
            styles = _styles()
            elements.append(_paragraph(footer_note, styles["section_note"]))
    else:
        elements.append(_paragraph("No records available for this report.", _styles()["empty"]))

    return elements
