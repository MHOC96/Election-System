import logging
import threading
from typing import Any

from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import close_old_connections, connection
from django.utils import timezone

from members.models import ImportJobStatus, MemberImportJob
from members.services.import_service import (
    ASYNC_IMPORT_ROW_THRESHOLD,
    ImportResult,
    import_members,
    import_result_to_dict,
    parse_member_file,
    validate_import_file,
)

logger = logging.getLogger(__name__)


def should_import_async(row_count: int) -> bool:
    return row_count > ASYNC_IMPORT_ROW_THRESHOLD


def create_import_job(uploaded_file, academic_year: str, *, created_by) -> MemberImportJob:
    validate_import_file(uploaded_file)
    if hasattr(uploaded_file, "seek"):
        uploaded_file.seek(0)

    _, rows = parse_member_file(uploaded_file)
    if hasattr(uploaded_file, "seek"):
        uploaded_file.seek(0)

    job = MemberImportJob(
        academic_year=academic_year,
        original_filename=getattr(uploaded_file, "name", ""),
        total_rows=len(rows),
        created_by=created_by,
        status=ImportJobStatus.PENDING,
    )
    job.file.save(uploaded_file.name, uploaded_file, save=True)
    return job


def _finalize_job(job: MemberImportJob, *, result: ImportResult | None = None, error: str | None = None) -> None:
    job.completed_at = timezone.now()
    if error:
        job.status = ImportJobStatus.FAILED
        job.error_message = error
    else:
        job.status = ImportJobStatus.COMPLETED
        job.result = import_result_to_dict(result) if result else None
    job.save(
        update_fields=[
            "status",
            "result",
            "error_message",
            "completed_at",
        ]
    )
    try:
        job.file.delete(save=False)
    except Exception:
        logger.debug("Could not delete import file for job %s", job.pk, exc_info=True)


def run_import_job(job_id: int) -> None:
    worker_thread = threading.current_thread() is not threading.main_thread()
    if worker_thread:
        close_old_connections()
        connection.ensure_connection()
    try:
        job = MemberImportJob.objects.select_related("created_by").get(pk=job_id)
        if job.status not in (ImportJobStatus.PENDING, ImportJobStatus.RUNNING):
            return

        job.status = ImportJobStatus.RUNNING
        job.started_at = timezone.now()
        job.save(update_fields=["status", "started_at"])

        with job.file.open("rb") as stored_file:
            file_bytes = stored_file.read()

        uploaded = SimpleUploadedFile(
            name=job.original_filename or job.file.name,
            content=file_bytes,
            content_type="application/octet-stream",
        )
        result = import_members(uploaded, job.academic_year)

        _finalize_job(job, result=result)

        if result.successful:
            from dashboard.services.stats_service import invalidate_dashboard_cache

            invalidate_dashboard_cache()
            from audit.constants import AuditAction
            from audit.services.audit_service import log_action

            log_action(
                action=AuditAction.MEMBER_IMPORTED,
                request=None,
                actor=job.created_by,
                metadata={
                    "academic_year": job.academic_year,
                    "total_rows": result.total_rows,
                    "successful": result.successful,
                    "failed_count": len(result.failed_rows),
                    "duplicate_count": len(result.duplicates),
                    "import_job_id": job.id,
                    "async": True,
                },
            )
    except MemberImportJob.DoesNotExist:
        logger.warning("Import job %s not found", job_id)
    except ValueError as exc:
        try:
            job = MemberImportJob.objects.get(pk=job_id)
            _finalize_job(job, error=str(exc))
        except MemberImportJob.DoesNotExist:
            pass
    except Exception as exc:
        logger.exception("Import job %s failed", job_id)
        try:
            job = MemberImportJob.objects.get(pk=job_id)
            _finalize_job(job, error="Import failed unexpectedly. Please try again.")
        except MemberImportJob.DoesNotExist:
            pass
    finally:
        if worker_thread:
            close_old_connections()


def start_import_job_async(job_id: int) -> None:
    thread = threading.Thread(
        target=run_import_job,
        args=(job_id,),
        name=f"member-import-{job_id}",
        daemon=True,
    )
    thread.start()


def job_status_payload(job: MemberImportJob) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "job_id": job.id,
        "status": job.status,
        "total_rows": job.total_rows,
        "async": True,
        "created_at": job.created_at,
        "started_at": job.started_at,
        "completed_at": job.completed_at,
        "error_message": job.error_message or None,
        "result": job.result,
    }
    return payload
