import logging

from django.db import close_old_connections, connection

logger = logging.getLogger(__name__)

VIEW_NAME = "dashboard_live_vote_counts"
INDEX_NAME = "dashboard_live_vote_counts_uidx"


def materialized_view_available() -> bool:
    if connection.vendor != "postgresql":
        return False
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT 1
            FROM pg_matviews
            WHERE schemaname = ANY (current_schemas(false))
              AND matviewname = %s
            LIMIT 1
            """,
            [VIEW_NAME],
        )
        return cursor.fetchone() is not None


def refresh_live_stats_view() -> None:
    if not materialized_view_available():
        return

    with connection.cursor() as cursor:
        cursor.execute(f"REFRESH MATERIALIZED VIEW {VIEW_NAME}")


def fetch_candidate_vote_counts(
    election_id: int,
    academic_year: str | None = None,
) -> dict[int, int]:
    if not materialized_view_available():
        return {}

    sql = f"""
        SELECT candidate_id, SUM(vote_count)::int
        FROM {VIEW_NAME}
        WHERE election_id = %s
    """
    params: list = [election_id]
    if academic_year:
        sql += " AND member_academic_year = %s"
        params.append(academic_year)
    sql += " GROUP BY candidate_id"

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        return {row[0]: row[1] for row in cursor.fetchall()}
