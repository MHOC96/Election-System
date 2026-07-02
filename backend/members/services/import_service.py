import csv
import io
import re
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field

from django.contrib.auth.hashers import make_password
from django.db import transaction
from openpyxl import load_workbook

from accounts.models import User, UserRole

ALLOWED_EXTENSIONS = {".csv", ".xlsx"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
MAX_IMPORT_ROWS = 10_000
CPM_MAX_LENGTH = 50
MC_MAX_LENGTH = 100

CPM_COLUMN_ALIASES = {
    "cpm number",
    "cpm_number",
    "cpm",
    "cpm no",
    "cpm no.",
    "cpmnumber",
}
MC_COLUMN_ALIASES = {
    "mc number",
    "mc_number",
    "mc",
    "mc no",
    "mc no.",
    "mcnumber",
    "password",
}

DUPLICATE_REASONS = {
    "duplicate_in_file": "Duplicate CPM Number in this file.",
    "already_exists": "CPM Number already exists in the database.",
}

CSV_ENCODINGS = ("utf-8-sig", "utf-8", "cp1252", "latin-1")


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
    normalized = str(value).strip().lower()
    normalized = re.sub(r"[\s_-]+", " ", normalized)
    return normalized.strip()


def _normalize_cpm(value) -> str:
    return str(value).strip().upper()


def _cell_value(value) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.lower() in {"none", "null", "n/a", "-"}:
        return ""
    return text


def _decode_csv_bytes(raw: bytes) -> str:
    last_error: UnicodeDecodeError | None = None
    for encoding in CSV_ENCODINGS:
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError as exc:
            last_error = exc
    if last_error is not None:
        raise ValueError(
            "Could not read CSV file. Save it as UTF-8 or try exporting again from Excel."
        ) from last_error
    raise ValueError("Could not read CSV file.")


def _detect_csv_dialect(sample: str) -> csv.Dialect:
    try:
        return csv.Sniffer().sniff(sample, delimiters=",;\t|")
    except csv.Error:
        return csv.excel


def _parse_csv(file_obj) -> tuple[list[str], list[dict]]:
    raw = file_obj.read()
    if isinstance(raw, str):
        content = raw
    else:
        content = _decode_csv_bytes(raw)

    if not content.strip():
        raise ValueError("File is empty or missing a header row.")

    sample = content[:4096]
    dialect = _detect_csv_dialect(sample)
    reader = csv.DictReader(io.StringIO(content), dialect=dialect)
    if not reader.fieldnames:
        raise ValueError("File is empty or missing a header row.")

    headers = [_normalize_header(name) for name in reader.fieldnames if name]
    if not headers:
        raise ValueError("File is empty or missing a header row.")

    header_map = {
        original: normalized
        for original, normalized in zip(reader.fieldnames, [_normalize_header(name) for name in reader.fieldnames])
        if original and normalized
    }

    rows: list[dict] = []
    for raw_row in reader:
        normalized: dict[str, str] = {}
        for original_key, normalized_key in header_map.items():
            normalized[normalized_key] = _cell_value(raw_row.get(original_key))

        if not any(normalized.values()):
            continue

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

    headers = [_normalize_header(cell) for cell in header_row if cell is not None]
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
        if any(row_dict.values()):
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
        raise ValueError(
            f"Missing required columns: {labels}. "
            "Your file must include CPM Number and MC Number columns."
        )


def _validate_cpm(cpm_number: str) -> str | None:
    if len(cpm_number) > CPM_MAX_LENGTH:
        return f"CPM Number must be {CPM_MAX_LENGTH} characters or fewer."
    if not re.fullmatch(r"[A-Z0-9][A-Z0-9 ./-]*", cpm_number):
        return "CPM Number contains invalid characters."
    return None


def _validate_mc(mc_number: str) -> str | None:
    if len(mc_number) > MC_MAX_LENGTH:
        return f"MC Number must be {MC_MAX_LENGTH} characters or fewer."
    if not mc_number:
        return "Missing MC Number."
    return None


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

    if len(rows) > MAX_IMPORT_ROWS:
        raise ValueError(f"File exceeds the maximum of {MAX_IMPORT_ROWS:,} data rows.")

    result = ImportResult(total_rows=len(rows))
    seen_cpms: dict[str, int] = {}
    valid_rows: list[tuple[int, str, str]] = []

    for index, row in enumerate(rows, start=2):
        cpm_raw = _resolve_column_key(row, CPM_COLUMN_ALIASES)
        mc_raw = _resolve_column_key(row, MC_COLUMN_ALIASES)

        if not cpm_raw and not mc_raw:
            continue

        if not cpm_raw:
            result.failed_rows.append(
                RowError(row=index, cpm_number=None, reason="Missing CPM Number.")
            )
            continue

        if not mc_raw:
            result.failed_rows.append(
                RowError(row=index, cpm_number=_normalize_cpm(cpm_raw), reason="Missing MC Number.")
            )
            continue

        cpm_number = _normalize_cpm(cpm_raw)
        cpm_error = _validate_cpm(cpm_number)
        if cpm_error:
            result.failed_rows.append(
                RowError(row=index, cpm_number=cpm_number, reason=cpm_error)
            )
            continue

        mc_error = _validate_mc(mc_raw)
        if mc_error:
            result.failed_rows.append(
                RowError(row=index, cpm_number=cpm_number, reason=mc_error)
            )
            continue

        if cpm_number in seen_cpms:
            result.duplicates.append(
                DuplicateEntry(
                    row=index,
                    cpm_number=cpm_number,
                    reason=DUPLICATE_REASONS["duplicate_in_file"],
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

    pending_users: list[tuple[int, str, str]] = []
    for row_num, cpm_number, mc_number in valid_rows:
        if cpm_number in existing_cpms:
            result.duplicates.append(
                DuplicateEntry(
                    row=row_num,
                    cpm_number=cpm_number,
                    reason=DUPLICATE_REASONS["already_exists"],
                )
            )
            continue

        pending_users.append((row_num, cpm_number, mc_number))

    users_to_create: list[User] = []
    if pending_users:
        mc_numbers = [mc_number for _, _, mc_number in pending_users]
        with ThreadPoolExecutor(max_workers=4) as executor:
            hashed_passwords = list(executor.map(make_password, mc_numbers))

        for (_, cpm_number, mc_number), hashed_password in zip(
            pending_users, hashed_passwords, strict=True
        ):
            users_to_create.append(
                User(
                    cpm_number=cpm_number,
                    mc_number=mc_number,
                    password=hashed_password,
                    role=UserRole.MEMBER,
                    is_active=True,
                )
            )

    if users_to_create:
        with transaction.atomic():
            User.objects.bulk_create(users_to_create, batch_size=500)

    result.successful = len(users_to_create)
    return result
