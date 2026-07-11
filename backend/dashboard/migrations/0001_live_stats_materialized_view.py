from django.db import migrations

VIEW_NAME = "dashboard_live_vote_counts"
INDEX_NAME = "dashboard_live_vote_counts_uidx"

CREATE_VIEW_SQL = f"""
CREATE MATERIALIZED VIEW {VIEW_NAME} AS
SELECT
    v.election_id,
    v.candidate_id,
    c.position_id,
    c.full_name AS candidate_name,
    p.name AS position_name,
    p.academic_year AS position_academic_year,
    p.max_winners,
    m.academic_year AS member_academic_year,
    COUNT(*)::bigint AS vote_count
FROM voting_vote v
INNER JOIN candidates_candidate c ON c.id = v.candidate_id
INNER JOIN positions_position p ON p.id = c.position_id
INNER JOIN accounts_user m ON m.id = v.member_id
GROUP BY
    v.election_id,
    v.candidate_id,
    c.position_id,
    c.full_name,
    p.name,
    p.academic_year,
    p.max_winners,
    m.academic_year
WITH NO DATA;
"""

CREATE_INDEX_SQL = f"""
CREATE UNIQUE INDEX {INDEX_NAME}
ON {VIEW_NAME} (election_id, candidate_id, member_academic_year);
"""

REFRESH_SQL = f"REFRESH MATERIALIZED VIEW {VIEW_NAME};"

DROP_VIEW_SQL = f"DROP MATERIALIZED VIEW IF EXISTS {VIEW_NAME};"


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("voting", "0009_unique_scheduled_election"),
        ("candidates", "0011_remove_candidateapplication_mc_number"),
        ("positions", "0008_position_max_winners_alter_position_academic_year"),
        ("accounts", "0006_user_has_changed_password"),
    ]

    operations = [
        migrations.RunSQL(
            sql=[CREATE_VIEW_SQL, CREATE_INDEX_SQL, REFRESH_SQL],
            reverse_sql=DROP_VIEW_SQL,
        ),
    ]
