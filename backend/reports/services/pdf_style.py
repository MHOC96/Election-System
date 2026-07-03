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

    meta_table = Table(
        [
            [
                _paragraph("Election", styles["meta_label"]),
                _paragraph("Status", styles["meta_label"]),
                _paragraph("Report date", styles["meta_label"]),
            ],
            [
                _paragraph(election_name, styles["meta_value"]),
                _paragraph(election_status, styles["meta_value"]),
                _paragraph(datetime.utcnow().strftime("%d %B %Y"), styles["meta_value"]),
            ],
        ],
        colWidths=[3.4 * inch, 2.2 * inch, 2.2 * inch],
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
    if normalized == "complete" or normalized == "yes":
        return BRAND_SUCCESS_BG, BRAND_SUCCESS_TEXT
    if normalized == "partial":
        return BRAND_WARNING_BG, BRAND_WARNING_TEXT
    if normalized in {"no vote", "no"}:
        return colors.HexColor("#fef2f2"), colors.HexColor("#b91c1c")
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
    else:
        elements.append(_paragraph("No records available for this report.", _styles()["empty"]))

    return elements
