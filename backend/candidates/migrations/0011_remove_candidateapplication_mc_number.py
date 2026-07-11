from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("candidates", "0010_candidate_election_required"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="candidateapplication",
            name="mc_number",
        ),
    ]
