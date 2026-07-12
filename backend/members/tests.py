import io
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from openpyxl import Workbook
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from members.models import ImportJobStatus, MemberImportJob
from members.services.import_job_service import create_import_job, run_import_job
from members.services.import_service import import_members


ACADEMIC_YEAR = "2nd Year"


class MemberImportServiceTestCase(TestCase):
    def _csv_file(self, content: str, name="members.csv"):
        return SimpleUploadedFile(
            name,
            content.encode("utf-8"),
            content_type="text/csv",
        )

    def test_successful_csv_import(self):
        content = "CPM Number,MC Number\nCPM100,secret100\nCPM101,secret101\n"
        result = import_members(self._csv_file(content), ACADEMIC_YEAR)
        self.assertEqual(result.total_rows, 2)
        self.assertEqual(result.successful, 2)
        self.assertEqual(result.failed_rows, [])
        self.assertEqual(result.duplicates, [])
        self.assertEqual(User.objects.filter(role=UserRole.MEMBER).count(), 2)

    def test_missing_field_detection(self):
        content = "CPM Number,MC Number\n,secret\nCPM102,\n"
        result = import_members(self._csv_file(content), ACADEMIC_YEAR)
        self.assertEqual(result.successful, 0)
        self.assertEqual(len(result.failed_rows), 2)

    def test_duplicate_in_file(self):
        content = "CPM Number,MC Number\nCPM200,secret\nCPM200,secret2\n"
        result = import_members(self._csv_file(content), ACADEMIC_YEAR)
        self.assertEqual(result.successful, 1)
        self.assertEqual(len(result.duplicates), 1)
        self.assertEqual(result.duplicates[0].reason, "Duplicate CPM Number in this file.")

    def test_duplicate_in_database(self):
        User.objects.create_user(cpm_number="CPM300", mc_number="existing", role=UserRole.MEMBER)
        content = "CPM Number,MC Number\nCPM300,newsecret\n"
        result = import_members(self._csv_file(content), ACADEMIC_YEAR)
        self.assertEqual(result.successful, 0)
        self.assertEqual(len(result.duplicates), 1)
        self.assertEqual(result.duplicates[0].reason, "CPM Number already exists in the database.")

    def test_xlsx_import(self):
        workbook = Workbook()
        sheet = workbook.active
        sheet.append(["CPM Number", "MC Number"])
        sheet.append(["CPM400", "secret400"])
        buffer = io.BytesIO()
        workbook.save(buffer)
        buffer.seek(0)
        uploaded = SimpleUploadedFile(
            "members.xlsx",
            buffer.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        result = import_members(uploaded, ACADEMIC_YEAR)
        self.assertEqual(result.successful, 1)
        self.assertTrue(User.objects.filter(cpm_number="CPM400").exists())

    def test_invalid_file_extension(self):
        uploaded = SimpleUploadedFile("members.txt", b"data", content_type="text/plain")
        with self.assertRaises(ValueError):
            import_members(uploaded, ACADEMIC_YEAR)

    def test_password_is_hashed(self):
        content = "CPM Number,MC Number\nCPM500,plain-secret\n"
        import_members(self._csv_file(content), ACADEMIC_YEAR)
        user = User.objects.get(cpm_number="CPM500")
        self.assertTrue(user.check_password("plain-secret"))

    def test_semicolon_delimited_csv(self):
        content = "CPM Number;MC Number\nCPM600;secret600\nCPM601;secret601\n"
        result = import_members(self._csv_file(content), ACADEMIC_YEAR)
        self.assertEqual(result.successful, 2)
        self.assertTrue(User.objects.filter(cpm_number="CPM600").exists())

    def test_csv_with_bom(self):
        content = "\ufeffCPM Number,MC Number\nCPM700,secret700\n"
        result = import_members(self._csv_file(content), ACADEMIC_YEAR)
        self.assertEqual(result.successful, 1)

    def test_cpm_number_normalized_to_uppercase(self):
        content = "CPM Number,MC Number\ncpm800,secret800\n"
        result = import_members(self._csv_file(content), ACADEMIC_YEAR)
        self.assertEqual(result.successful, 1)
        self.assertTrue(User.objects.filter(cpm_number="CPM800").exists())


class MemberAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            cpm_number="ADM900",
            mc_number="admin-pass",
            role=UserRole.ADMIN,
            is_staff=True,
        )
        self.member = User.objects.create_user(
            cpm_number="CPM900",
            mc_number="member-pass",
            role=UserRole.MEMBER,
            academic_year=ACADEMIC_YEAR,
        )

    def _auth_as_admin(self):
        response = self.client.post(
            reverse("auth-login"),
            {"cpm_number": "ADM900", "mc_number": "admin-pass"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access']}"
        )

    def test_import_requires_admin(self):
        response = self.client.post(reverse("members-import"), {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_member_cannot_import(self):
        response = self.client.post(
            reverse("auth-login"),
            {"cpm_number": "CPM900", "mc_number": "member-pass"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access']}"
        )
        response = self.client.post(reverse("members-import"), {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_import_via_api(self):
        self._auth_as_admin()
        content = "CPM Number,MC Number\nCPM801,secret801\n"
        uploaded = SimpleUploadedFile("members.csv", content.encode("utf-8"), content_type="text/csv")
        response = self.client.post(
            reverse("members-import"),
            {"file": uploaded, "academic_year": ACADEMIC_YEAR},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["successful"], 1)

    @patch("members.views.start_import_job_async")
    @patch("members.views.should_import_async", return_value=True)
    def test_large_import_returns_async_job(self, _mock_async, mock_start):
        self._auth_as_admin()
        content = "CPM Number,MC Number\n" + "".join(
            f"CPM9{i:03d},secret{i}\n" for i in range(3)
        )
        uploaded = SimpleUploadedFile("members.csv", content.encode("utf-8"), content_type="text/csv")
        response = self.client.post(
            reverse("members-import"),
            {"file": uploaded, "academic_year": ACADEMIC_YEAR},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertTrue(response.data["data"]["async"])
        job_id = response.data["data"]["job_id"]
        mock_start.assert_called_once_with(job_id)
        run_import_job(job_id)
        job = MemberImportJob.objects.get(pk=job_id)
        self.assertEqual(job.status, ImportJobStatus.COMPLETED)
        self.assertEqual(job.result["successful"], 3)

    def test_import_job_status_endpoint(self):
        self._auth_as_admin()
        content = "CPM Number,MC Number\nCPM850,secret850\n"
        uploaded = SimpleUploadedFile("members.csv", content.encode("utf-8"), content_type="text/csv")
        job = create_import_job(uploaded, ACADEMIC_YEAR, created_by=self.admin)
        run_import_job(job.id)
        response = self.client.get(reverse("members-import-status", kwargs={"job_id": job.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["status"], ImportJobStatus.COMPLETED)
        self.assertEqual(response.data["data"]["result"]["successful"], 1)

    def test_list_members_admin_only(self):
        self._auth_as_admin()
        response = self.client.get(reverse("members-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertGreaterEqual(len(response.data["data"]["results"]), 1)

    def test_member_detail(self):
        self._auth_as_admin()
        response = self.client.get(reverse("members-detail", kwargs={"pk": self.member.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["cpm_number"], "CPM900")
        self.assertNotIn("mc_number", response.data["data"])

    def test_member_list_omits_mc_number(self):
        self._auth_as_admin()
        response = self.client.get(reverse("members-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        first = response.data["data"]["results"][0]
        self.assertNotIn("mc_number", first)

    def test_admin_can_update_member(self):
        self._auth_as_admin()
        response = self.client.patch(
            reverse("members-detail", kwargs={"pk": self.member.pk}),
            {
                "cpm_number": "CPM901",
                "is_active": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.member.refresh_from_db()
        self.assertEqual(self.member.cpm_number, "CPM901")
        self.assertEqual(self.member.mc_number, "member-pass")
        self.assertFalse(self.member.is_active)

    def test_admin_can_reset_member_password_to_import_mc(self):
        from audit.models import AuditLog
        from audit.constants import AuditAction

        self.member.set_password("changed-by-member")
        self.member.has_changed_password = True
        self.member.save(update_fields=["password", "has_changed_password", "updated_at"])

        self._auth_as_admin()
        response = self.client.post(
            reverse("members-reset-password", kwargs={"pk": self.member.pk}),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])

        self.member.refresh_from_db()
        self.assertEqual(self.member.mc_number, "member-pass")
        self.assertFalse(self.member.has_changed_password)
        self.assertTrue(self.member.check_password("member-pass"))

        login_response = self.client.post(
            reverse("auth-login"),
            {"cpm_number": "CPM900", "mc_number": "member-pass"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

        audit = AuditLog.objects.filter(action=AuditAction.MEMBER_PASSWORD_RESET).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.metadata["cpm_number"], "CPM900")

    def test_reset_password_requires_admin(self):
        response = self.client.post(
            reverse("members-reset-password", kwargs={"pk": self.member.pk}),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_delete_member(self):
        self._auth_as_admin()
        response = self.client.delete(reverse("members-detail", kwargs={"pk": self.member.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertFalse(User.objects.filter(pk=self.member.pk).exists())

    def test_cannot_delete_member_during_scheduled_election(self):
        from voting.test_helpers import create_scheduled_election

        create_scheduled_election()
        self._auth_as_admin()
        response = self.client.delete(reverse("members-detail", kwargs={"pk": self.member.pk}))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_clear_all_members_after_election_archived(self):
        from voting.test_helpers import create_archived_election

        create_archived_election(name="Archived Election")
        User.objects.create_user(
            cpm_number="CPM902",
            mc_number="member-pass-2",
            role=UserRole.MEMBER,
            academic_year=ACADEMIC_YEAR,
        )
        self._auth_as_admin()
        response = self.client.post(
            reverse("members-clear-all"),
            {"academic_year": ACADEMIC_YEAR},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["deleted"], 2)
        self.assertEqual(User.objects.filter(role=UserRole.MEMBER).count(), 0)

    def test_cannot_clear_all_members_during_scheduled_election(self):
        from voting.test_helpers import create_scheduled_election

        create_scheduled_election()
        self._auth_as_admin()
        response = self.client.post(reverse("members-clear-all"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_delete_members_after_election_archived(self):
        from voting.test_helpers import create_archived_election

        create_archived_election(name="Archived Election")
        extra = User.objects.create_user(
            cpm_number="CPM902",
            mc_number="member-pass-2",
            role=UserRole.MEMBER,
        )
        self._auth_as_admin()
        response = self.client.post(
            reverse("members-bulk-delete"),
            {"ids": [self.member.pk, extra.pk]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["deleted"], 2)
        self.assertFalse(User.objects.filter(pk__in=[self.member.pk, extra.pk]).exists())

    def test_deletion_status_blocked_during_scheduled_election(self):
        from voting.test_helpers import create_scheduled_election

        create_scheduled_election()
        self._auth_as_admin()
        response = self.client.get(reverse("members-deletion-status"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["data"]["allowed"])

    def test_deletion_status_allowed_after_election_archived(self):
        from voting.test_helpers import create_archived_election

        create_archived_election(name="Archived Election")
        self._auth_as_admin()
        response = self.client.get(reverse("members-deletion-status"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["data"]["allowed"])

    def test_deletion_allowed_when_archived_election_exists(self):
        from voting.test_helpers import create_archived_election

        create_archived_election(name="Archived Election")
        self._auth_as_admin()
        response = self.client.get(reverse("members-deletion-status"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["data"]["allowed"])

    def test_member_cannot_delete(self):
        response = self.client.post(
            reverse("auth-login"),
            {"cpm_number": "CPM900", "mc_number": "member-pass"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access']}"
        )
        response = self.client.delete(reverse("members-detail", kwargs={"pk": self.member.pk}))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
