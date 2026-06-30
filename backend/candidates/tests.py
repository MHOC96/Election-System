from io import BytesIO
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from candidates.models import AcademicYear, Candidate
from positions.models import Position


class CandidateAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            cpm_number="ADM200",
            mc_number="admin-pass",
            role=UserRole.ADMIN,
            is_staff=True,
        )
        self.member = User.objects.create_user(
            cpm_number="CPM200",
            mc_number="member-pass",
            role=UserRole.MEMBER,
        )
        self.position = Position.objects.create(name="President")
        self.photo_url = "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg"

    def _login(self, cpm_number, mc_number):
        response = self.client.post(
            reverse("auth-login"),
            {"cpm_number": cpm_number, "mc_number": mc_number},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access']}"
        )

    def test_admin_can_create_candidate(self):
        self._login("ADM200", "admin-pass")
        response = self.client.post(
            reverse("candidates-list-create"),
            {
                "full_name": "Jane Doe",
                "academic_year": AcademicYear.SECOND_YEAR,
                "photo_url": self.photo_url,
                "position": self.position.pk,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["full_name"], "Jane Doe")

    def test_invalid_academic_year_rejected(self):
        self._login("ADM200", "admin-pass")
        response = self.client.post(
            reverse("candidates-list-create"),
            {
                "full_name": "Jane Doe",
                "academic_year": "1st Year",
                "photo_url": self.photo_url,
                "position": self.position.pk,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_cloudinary_url_rejected(self):
        self._login("ADM200", "admin-pass")
        response = self.client.post(
            reverse("candidates-list-create"),
            {
                "full_name": "Jane Doe",
                "academic_year": AcademicYear.THIRD_YEAR,
                "photo_url": "https://example.com/photo.jpg",
                "position": self.position.pk,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_can_list_candidates(self):
        Candidate.objects.create(
            full_name="John Smith",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url=self.photo_url,
            position=self.position,
        )
        self._login("CPM200", "member-pass")
        response = self.client.get(reverse("candidates-list-create"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]["results"]), 1)

    def test_member_cannot_create_candidate(self):
        self._login("CPM200", "member-pass")
        response = self.client.post(
            reverse("candidates-list-create"),
            {
                "full_name": "Jane Doe",
                "academic_year": AcademicYear.SECOND_YEAR,
                "photo_url": self.photo_url,
                "position": self.position.pk,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_by_position(self):
        Candidate.objects.create(
            full_name="Alice",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url=self.photo_url,
            position=self.position,
        )
        self._login("ADM200", "admin-pass")
        response = self.client.get(
            reverse("position-candidates", kwargs={"position_id": self.position.pk})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]["results"]), 1)

    def test_position_delete_blocked_with_candidates(self):
        Candidate.objects.create(
            full_name="Bob",
            academic_year=AcademicYear.THIRD_YEAR,
            photo_url=self.photo_url,
            position=self.position,
        )
        self._login("ADM200", "admin-pass")
        response = self.client.delete(
            reverse("positions-detail", kwargs={"pk": self.position.pk})
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("candidates.views.upload_candidate_photo")
    def test_photo_upload_admin_only(self, mock_upload):
        mock_upload.return_value = {
            "photo_url": self.photo_url,
            "public_id": "election/candidates/sample",
            "format": "jpg",
            "bytes": 1234,
        }
        image = Image.new("RGB", (100, 100), color="red")
        buffer = BytesIO()
        image.save(buffer, format="JPEG")
        buffer.seek(0)
        uploaded = SimpleUploadedFile(
            "photo.jpg",
            buffer.read(),
            content_type="image/jpeg",
        )

        self._login("ADM200", "admin-pass")
        response = self.client.post(
            reverse("candidates-upload-photo"),
            {"photo": uploaded},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["photo_url"], self.photo_url)


class CandidateModelTestCase(TestCase):
    def test_full_name_stripped(self):
        position = Position.objects.create(name="Secretary")
        candidate = Candidate.objects.create(
            full_name="  Alice Lee  ",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
            position=position,
        )
        self.assertEqual(candidate.full_name, "Alice Lee")
