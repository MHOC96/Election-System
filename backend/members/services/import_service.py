import csv
import io
from dataclasses import dataclass, field

from django.contrib.auth.hashers import make_password
from django.db import transaction
from openpyxl import load_workbook

from accounts.models import User, UserRole

ALLOWED_EXTENSIONS = {".csv", ".xlsx"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
CPM_COLUMN_ALIASES = {"cpm number", "cpm_number", "cpm", "cpm no", "cpm no."}
MC_COLUMN_ALIASES = {"mc number", "mc_number", "mc", "mc no", "mc no."}

@dataclass
class RowError:
    row: int
    cpm_number: str | None
    reason: str


@dataclass
class DuplicateEntry:
    row: int
    cpm_number: str
    reason: str


@dataclass
class ImportResult:
    total_rows: int = 0
    successful: int = 0
    failed_rows: list[RowError] = field(default_factory=list)
    duplicates: list[DuplicateEntry] = field(default_factory=list)


def _normalize_header(value) -> str:
    if value is None:
        return ""
    return str(value).strip().lower()


def _normalize_cpm(value) -> str:
    return str(value).strip().upper()


def _cell_value(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _parse_csv(file_obj) -> tuple[list[str], list[dict]]:
    content = file_obj.read()
    if isinstance(content, bytes):
        content = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    if not reader.fieldnames:
        raise ValueError("File is empty or missing a header row.")

    headers = [_normalize_header(name) for name in reader.fieldnames]
    header_map = dict(zip(reader.fieldnames, headers))

    rows = []
    for raw_row in reader:
        normalized = {}
        for original_key, normalized_key in header_map.items():
            normalized[normalized_key] = _cell_value(raw_row.get(original_key))
        rows.append(normalized)
    return headers, rows


def _parse_xlsx(file_obj) -> tuple[list[str], list[dict]]:
    workbook = load_workbook(file_obj, read_only=True, data_only=True)
    sheet = workbook.active
    row_iter = sheet.iter_rows(values_only=True)

    try:
        header_row = next(row_iter)
    except StopIteration as exc:
        raise ValueError("File is empty or missing a header row.") from exc

    headers = [_normalize_header(cell) for cell in header_row]
    rows = []
    for values in row_iter:
        if not values or all(cell is None or str(cell).strip() == "" for cell in values):
            continue
        row_dict = {}
        for index, header in enumerate(headers):
            if not header:
                continue
            value = values[index] if index < len(values) else None
            row_dict[header] = _cell_value(value)
        rows.append(row_dict)
    workbook.close()
    return headers, rows


def _resolve_column_key(row: dict, aliases: set[str]) -> str:
    for key, value in row.items():
        if key in aliases:
            return value
    return ""


def _validate_columns(headers: list[str]) -> None:
    header_set = set(headers)
    missing = []
    if not header_set.intersection(CPM_COLUMN_ALIASES):
        missing.append("CPM Number")
    if not header_set.intersection(MC_COLUMN_ALIASES):
        missing.append("MC Number")
    if missing:
        labels = ", ".join(missing)
        raise ValueError(f"Missing required columns: {labels}")

def validate_import_file(uploaded_file) -> None:
    if uploaded_file.size > MAX_FILE_SIZE_BYTES:
        raise ValueError("File exceeds the 5 MB size limit.")

    name = uploaded_file.name.lower()
    if not any(name.endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise ValueError("Invalid file type. Only CSV and XLSX files are allowed.")


def parse_member_file(uploaded_file) -> tuple[list[str], list[dict]]:
    validate_import_file(uploaded_file)
    name = uploaded_file.name.lower()
    if name.endswith(".csv"):
        return _parse_csv(uploaded_file)
    if name.endswith(".xlsx"):
        return _parse_xlsx(uploaded_file)
    raise ValueError("Invalid file type. Only CSV and XLSX files are allowed.")


def import_members(uploaded_file) -> ImportResult:
    headers, rows = parse_member_file(uploaded_file)
    _validate_columns(headers)

    result = ImportResult(total_rows=len(rows))
    seen_cpms: dict[str, int] = {}
    valid_rows: list[tuple[int, str, str]] = []

    for index, row in enumerate(rows, start=2):
        cpm_raw = _resolve_column_key(row, CPM_COLUMN_ALIASES)
        mc_raw = _resolve_column_key(row, MC_COLUMN_ALIASES)
        if not cpm_raw and not mc_raw:
            result.failed_rows.append(
                RowError(row=index, cpm_number=None, reason="Empty row.")
            )
            continue

        if not cpm_raw:
            result.failed_rows.append(
                RowError(row=index, cpm_number=None, reason="Missing CPM Number.")
            )
            continue

        if not mc_raw:
            result.failed_rows.append(
                RowError(row=index, cpm_number=cpm_raw, reason="Missing MC Number.")
            )
            continue

        cpm_number = _normalize_cpm(cpm_raw)

        if cpm_number in seen_cpms:
            result.duplicates.append(
                DuplicateEntry(
                    row=index,
                    cpm_number=cpm_number,
                    reason="duplicate_in_file",
                )
            )
            continue

        seen_cpms[cpm_number] = index
        valid_rows.append((index, cpm_number, mc_raw))

    if not valid_rows:
        return result

    cpm_numbers = [cpm for _, cpm, _ in valid_rows]
    existing_cpms = set(
        User.objects.filter(cpm_number__in=cpm_numbers).values_list("cpm_number", flat=True)
    )

    users_to_create: list[User] = []
    for row_num, cpm_number, mc_number in valid_rows:
        if cpm_number in existing_cpms:
            result.duplicates.append(
                DuplicateEntry(
                    row=row_num,
                    cpm_number=cpm_number,
                    reason="already_exists",
                )
            )
            continue

        users_to_create.append(
            User(
                cpm_number=cpm_number,
                mc_number=mc_number,
                password=make_password(mc_number),
                role=UserRole.MEMBER,
                is_active=True,
            )
        )

    if users_to_create:
        with transaction.atomic():
            User.objects.bulk_create(users_to_create, batch_size=500)

    result.successful = len(users_to_create)
    return result
