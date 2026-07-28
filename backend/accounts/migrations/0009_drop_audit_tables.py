from django.db import connection, migrations


def drop_audit_tables(apps, schema_editor):
    with connection.cursor() as cursor:
        tables = connection.introspection.table_names(cursor)

    if "audit_auditlog" not in tables:
        return

    with connection.cursor() as cursor:
        cursor.execute("DROP TABLE IF EXISTS audit_auditlog CASCADE")


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0008_user_changed_password"),
    ]

    operations = [
        migrations.RunPython(drop_audit_tables, migrations.RunPython.noop),
    ]
