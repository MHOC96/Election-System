from django.db import migrations, models


def backfill_candidate_elections(apps, schema_editor):
    Candidate = apps.get_model("candidates", "Candidate")
    Election = apps.get_model("voting", "Election")
    Vote = apps.get_model("voting", "Vote")

    default_election = (
        Election.objects.exclude(status="ARCHIVED").order_by("-created_at").first()
    )

    for candidate in Candidate.objects.filter(election_id__isnull=True).iterator():
        vote = Vote.objects.filter(candidate_id=candidate.id).order_by("-created_at").first()
        if vote:
            candidate.election_id = vote.election_id
        elif default_election:
            candidate.election_id = default_election.id
        else:
            candidate.delete()
            continue
        candidate.save(update_fields=["election_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("candidates", "0009_election_query_indexes"),
        ("voting", "0008_vote_unique_per_election"),
    ]

    operations = [
        migrations.RunPython(backfill_candidate_elections, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="candidate",
            name="election",
            field=models.ForeignKey(
                on_delete=models.CASCADE,
                related_name="candidates",
                to="voting.election",
            ),
        ),
    ]
