from django.core.management.base import BaseCommand, CommandError

from accounts.models import User, UserRole


class Command(BaseCommand):
    help = "Create an admin user with CPM Number and MC Number."

    def add_arguments(self, parser):
        parser.add_argument("--cpm", required=True, help="Admin CPM Number")
        parser.add_argument("--mc", required=True, help="Admin MC Number (password)")

    def handle(self, *args, **options):
        cpm_number = options["cpm"].strip().upper()
        mc_number = options["mc"]

        if User.objects.filter(cpm_number=cpm_number).exists():
            raise CommandError(f"User with CPM Number '{cpm_number}' already exists.")

        user = User.objects.create_user(
            cpm_number=cpm_number,
            mc_number=mc_number,
            role=UserRole.ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        self.stdout.write(
            self.style.SUCCESS(f"Admin user '{user.cpm_number}' created successfully.")
        )
