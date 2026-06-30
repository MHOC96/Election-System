import io

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from openpyxl import Workbook
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from members.services.import_service import import_members


class MemberImportServiceTestCase(TestCase):
    def _csv_file(self, content: str, name="members.csv"):
        return SimpleUploadedFile(
            name,
            content.encode("utf-8"),
            content_type="text/csv",
        )

    def test_successful_csv_import(self):
        content = "CPM Number,MC Number\nCPM100,secret100\nCPM101,secret101\n"
        result = import_members(self._csv_file(content))
        self.assertEqual(result.total_rows, 2)
        self.assertEqual(result.successful, 2)
        self.assertEqual(result.failed_rows, [])
        self.assertEqual(result.duplicates, [])
        self.assertEqual(User.objects.filter(role=UserRole.MEMBER).count(), 2)

    def test_missing_field_detection(self):
        content = "CPM Number,MC Number\n,secret\nCPM102,\n"
        result = import_members(self._csv_file(content))
        self.assertEqual(result.successful, 0)
        self.assertEqual(len(result.failed_rows), 2)

    def test_duplicate_in_file(self):
        content = "CPM Number,MC Number\nCPM200,secret\nCPM200,secret2\n"
        result = import_members(self._csv_file(content))
        self.assertEqual(result.successful, 1)
        self.assertEqual(len(result.duplicates), 1)
        self.assertEqual(result.duplicates[0].reason, "duplicate_in_file")

    def test_duplicate_in_database(self):
        User.objects.create_user(cpm_number="CPM300", mc_number="existing", role=UserRole.MEMBER)
        content = "CPM Number,MC Number\nCPM300,newsecret\n"
        result = import_members(self._csv_file(content))
        self.assertEqual(result.successful, 0)
        self.assertEqual(len(result.duplicates), 1)
        self.assertEqual(result.duplicates[0].reason, "already_exists")

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
        result = import_members(uploaded)
        self.assertEqual(result.successful, 1)
        self.assertTrue(User.objects.filter(cpm_number="CPM400").exists())

    def test_invalid_file_extension(self):
        uploaded = SimpleUploadedFile("members.txt", b"data", content_type="text/plain")
        with self.assertRaises(ValueError):
            import_members(uploaded)

    def test_password_is_hashed(self):
        content = "CPM Number,MC Number\nCPM500,plain-secret\n"
        import_members(self._csv_file(content))
        user = User.objects.get(cpm_number="CPM500")
        self.assertTrue(user.check_password("plain-secret"))


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
            {"file": uploaded},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["successful"], 1)

    def test_list_members_admin_only(self):
        self._auth_as_admin()
        response = self.client.get(reverse("members-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data["results"]), 1)

    def test_member_detail(self):
        self._auth_as_admin()
        response = self.client.get(reverse("members-detail", kwargs={"pk": self.member.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["cpm_number"], "CPM900")

    def test_admin_can_update_member(self):
        self._auth_as_admin()
        response = self.client.patch(
            reverse("members-detail", kwargs={"pk": self.member.pk}),
            {
                "cpm_number": "CPM901",
                "mc_number": "new-member-pass",
                "is_active": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.member.refresh_from_db()
        self.assertEqual(self.member.cpm_number, "CPM901")
        self.assertEqual(self.member.mc_number, "new-member-pass")
        self.assertFalse(self.member.is_active)
        self.assertTrue(self.member.check_password("new-member-pass"))

    def test_admin_can_delete_member(self):
        self._auth_as_admin()
        response = self.client.delete(reverse("members-detail", kwargs={"pk": self.member.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertFalse(User.objects.filter(pk=self.member.pk).exists())

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
