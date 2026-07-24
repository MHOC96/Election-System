from io import BytesIO
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from candidates.models import AcademicYear, ApplicationStatus, Candidate
from positions.models import Position
from voting.test_helpers import create_draft_election


class CandidateAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.election = create_draft_election()
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
        self.declaration_url = "https://res.cloudinary.com/demo/raw/upload/v1/declaration.pdf"

    def _login(self, cpm_number, mc_number):
        response = self.client.post(
            reverse("auth-login"),
            {"cpm_number": cpm_number, "mc_number": mc_number},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access']}"
        )

    def test_admin_cannot_create_candidate_without_scheduled_election(self):
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
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Candidate.objects.count(), 0)

    def test_admin_create_assigns_ongoing_election_when_scheduled(self):
        from voting.models import Election, ElectionStatus

        election = Election.objects.create(name="2026 EC", status=ElectionStatus.SCHEDULED)
        self._login("ADM200", "admin-pass")
        response = self.client.post(
            reverse("candidates-list-create"),
            {
                "full_name": "Jane Doe",
                "academic_year": AcademicYear.SECOND_YEAR,
                "photo_url": self.photo_url,
                "declaration_file": self.declaration_url,
                "position": self.position.pk,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            Candidate.objects.get(pk=response.data["data"]["id"]).election_id,
            election.id,
        )

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
            election=self.election,
        )
        self._login("CPM200", "member-pass")
        response = self.client.get(reverse("candidates-list-create"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]["results"]), 1)

    def test_list_scoped_to_ongoing_election(self):
        from voting.models import Election, ElectionStatus

        archived = Election.objects.create(
            name="2024 Election",
            status=ElectionStatus.ARCHIVED,
        )
        ongoing = Election.objects.create(
            name="2026 Election",
            status=ElectionStatus.SCHEDULED,
        )
        Candidate.objects.create(
            full_name="Old Candidate",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url=self.photo_url,
            position=self.position,
            election=archived,
        )
        Candidate.objects.create(
            full_name="Current Candidate",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url=self.photo_url,
            position=self.position,
            election=ongoing,
        )
        self._login("ADM200", "admin-pass")
        response = self.client.get(reverse("candidates-list-create"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item["full_name"] for item in response.data["data"]["results"]]
        self.assertEqual(names, ["Current Candidate"])

    def test_list_supports_pagination(self):
        from voting.models import Election, ElectionStatus

        election = Election.objects.create(name="Paged Election", status=ElectionStatus.SCHEDULED)
        for index in range(3):
            Candidate.objects.create(
                full_name=f"Candidate {index}",
                academic_year=AcademicYear.SECOND_YEAR,
                photo_url=self.photo_url,
                position=self.position,
                election=election,
            )
        self._login("ADM200", "admin-pass")
        response = self.client.get(
            reverse("candidates-list-create"),
            {"page_size": 2, "page": 1},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        self.assertEqual(data["count"], 3)
        self.assertEqual(len(data["results"]), 2)
        self.assertIsNotNone(data["next"])

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
            election=self.election,
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
            election=self.election,
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

    def test_clear_all_candidates_disabled(self):
        Candidate.objects.create(
            full_name="Alice",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url=self.photo_url,
            position=self.position,
            election=self.election,
        )
        self._login("ADM200", "admin-pass")
        response = self.client.post(reverse("candidates-clear-all"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Candidate.objects.count(), 1)

    def test_clear_all_skips_candidates_with_votes_disabled(self):
        from voting.models import Vote

        candidate = Candidate.objects.create(
            full_name="Voted Candidate",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url=self.photo_url,
            position=self.position,
            election=self.election,
        )
        Vote.objects.create(
            member=self.member,
            position=self.position,
            candidate=candidate,
            election=self.election,
        )
        self._login("ADM200", "admin-pass")
        response = self.client.post(reverse("candidates-clear-all"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Candidate.objects.count(), 1)

    def test_cannot_clear_all_during_active_election(self):
        from voting.models import Election, ElectionStatus

        Candidate.objects.create(
            full_name="Alice",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url=self.photo_url,
            position=self.position,
            election=self.election,
        )
        Election.objects.create(name="Active", status=ElectionStatus.SCHEDULED)
        self._login("ADM200", "admin-pass")
        response = self.client.post(reverse("candidates-clear-all"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Candidate.objects.count(), 1)

    def test_cannot_create_candidate_during_voting(self):
        from datetime import timedelta

        from django.utils import timezone

        from voting.models import Election, ElectionPhase, ElectionStatus

        now = timezone.now()
        Election.objects.create(
            name="Voting Election",
            status=ElectionStatus.SCHEDULED,
            voting_started=True,
            voting_start_at=now - timedelta(hours=1),
            voting_end_at=now + timedelta(hours=1),
        )
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
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Candidate.objects.count(), 0)

    def test_cannot_create_candidate_during_applications_open(self):
        from datetime import timedelta

        from django.utils import timezone

        from voting.models import Election, ElectionPhase, ElectionStatus

        now = timezone.now()
        election = Election.objects.create(
            name="Applications Election",
            status=ElectionStatus.SCHEDULED,
            application_start_at=now - timedelta(hours=1),
            application_end_at=now + timedelta(hours=1),
        )
        self.assertEqual(election.get_current_phase(), ElectionPhase.APPLICATIONS_OPEN)
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
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Candidate.objects.count(), 0)

    def test_cannot_update_candidate_during_voting(self):
        from voting.test_helpers import create_voting_open_election

        candidate = Candidate.objects.create(
            full_name="Alice",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url=self.photo_url,
            position=self.position,
            election=create_voting_open_election(),
        )
        self._login("ADM200", "admin-pass")
        response = self.client.patch(
            reverse("candidates-detail", kwargs={"pk": candidate.pk}),
            {"full_name": "Alice Updated"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        candidate.refresh_from_db()
        self.assertEqual(candidate.full_name, "Alice")

    def test_cannot_delete_candidate_during_voting(self):
        from voting.test_helpers import create_voting_open_election

        election = create_voting_open_election()
        candidate = Candidate.objects.create(
            full_name="Alice",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url=self.photo_url,
            position=self.position,
            election=election,
        )
        self._login("ADM200", "admin-pass")
        response = self.client.delete(reverse("candidates-detail", kwargs={"pk": candidate.pk}))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Candidate.objects.filter(pk=candidate.pk).exists())


class ApplicationUploadAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            cpm_number="ADM300",
            mc_number="admin-pass",
            role=UserRole.ADMIN,
            is_staff=True,
        )
        User.objects.create_user(
            cpm_number="CPM300",
            mc_number="member-pass",
            role=UserRole.MEMBER,
            academic_year=AcademicYear.SECOND_YEAR,
        )
        self.pdf = SimpleUploadedFile(
            "declaration.pdf",
            b"%PDF-1.4 test",
            content_type="application/pdf",
        )
        image = Image.new("RGB", (100, 100), color="blue")
        buffer = BytesIO()
        image.save(buffer, format="JPEG")
        buffer.seek(0)
        self.photo = SimpleUploadedFile(
            "photo.jpg",
            buffer.read(),
            content_type="image/jpeg",
        )

    def _login_member(self):
        response = self.client.post(
            reverse("auth-login"),
            {"cpm_number": "CPM300", "mc_number": "member-pass"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access']}"
        )

    def _login_admin(self):
        response = self.client.post(
            reverse("auth-login"),
            {"cpm_number": "ADM300", "mc_number": "admin-pass"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access']}"
        )

    def _open_applications_election(self):
        from datetime import timedelta

        from django.utils import timezone

        from voting.models import Election, ElectionPhase, ElectionStatus

        now = timezone.now()
        election = Election.objects.create(
            name="Applications Election",
            status=ElectionStatus.SCHEDULED,
            application_start_at=now - timedelta(hours=1),
            application_end_at=now + timedelta(hours=1),
        )
        self.assertEqual(election.get_current_phase(), ElectionPhase.APPLICATIONS_OPEN)
        return election

    @patch("candidates.application_views.upload_candidate_document")
    def test_document_upload_allowed_during_applications_open(self, mock_upload):
        mock_upload.return_value = {"document_url": "https://res.cloudinary.com/demo/doc.pdf"}
        self._open_applications_election()
        self._login_member()

        response = self.client.post(
            reverse("applications-upload-document"),
            {"document": self.pdf},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_upload.assert_called_once()

    @patch("candidates.application_views.upload_candidate_photo")
    def test_photo_upload_allowed_during_applications_open(self, mock_upload):
        mock_upload.return_value = {"photo_url": "https://res.cloudinary.com/demo/photo.jpg"}
        self._open_applications_election()
        self._login_member()

        response = self.client.post(
            reverse("applications-upload-photo"),
            {"photo": self.photo},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_upload.assert_called_once()

    @patch("candidates.application_views.upload_candidate_document")
    def test_document_upload_blocked_outside_applications_phase(self, mock_upload):
        from voting.models import Election, ElectionStatus

        Election.objects.create(name="Scheduled Only", status=ElectionStatus.SCHEDULED)
        self._login_member()

        response = self.client.post(
            reverse("applications-upload-document"),
            {"document": self.pdf},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        mock_upload.assert_not_called()

    @patch("candidates.application_views.upload_candidate_photo")
    def test_photo_upload_blocked_for_admin(self, mock_upload):
        self._open_applications_election()
        self._login_admin()

        response = self.client.post(
            reverse("applications-upload-photo"),
            {"photo": self.photo},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        mock_upload.assert_not_called()


class ApplicationReviewAPITestCase(TestCase):
    def setUp(self):
        from datetime import timedelta

        from django.utils import timezone

        from candidates.models import ApplicationStatus, CandidateApplication
        from voting.models import Election, ElectionStatus

        self.client = APIClient()
        self.admin = User.objects.create_user(
            cpm_number="ADM400",
            mc_number="admin-pass",
            role=UserRole.ADMIN,
            is_staff=True,
        )
        self.member = User.objects.create_user(
            cpm_number="CPM400",
            mc_number="member-pass",
            role=UserRole.MEMBER,
            academic_year=AcademicYear.SECOND_YEAR,
        )
        self.position = Position.objects.create(name="President")
        now = timezone.now()
        self.election = Election.objects.create(
            name="Review Election",
            status=ElectionStatus.SCHEDULED,
            application_start_at=now - timedelta(days=2),
            application_end_at=now - timedelta(hours=1),
        )
        self.application = CandidateApplication.objects.create(
            election=self.election,
            member=self.member,
            position=self.position,
            full_name="Jane Doe",
            cpm_number="CPM400",
            contact_number="1234567890",
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
            declaration_file="https://res.cloudinary.com/demo/raw/upload/v1/declaration.pdf",
            status=ApplicationStatus.PENDING_REVIEW,
        )

    def _login_admin(self):
        response = self.client.post(
            reverse("auth-login"),
            {"cpm_number": "ADM400", "mc_number": "admin-pass"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access']}"
        )

    def test_approve_creates_candidate_and_updates_application(self):
        self._login_admin()
        response = self.client.post(
            reverse("applications-review", kwargs={"pk": self.application.pk}),
            {"action": "APPROVE"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["status"], ApplicationStatus.APPROVED)

        self.application.refresh_from_db()
        self.assertEqual(self.application.status, ApplicationStatus.APPROVED)
        self.assertEqual(self.application.approved_by_id, self.admin.pk)

        candidate = Candidate.objects.get()
        self.assertEqual(candidate.full_name, "Jane Doe")
        self.assertEqual(candidate.election_id, self.election.pk)
        self.assertEqual(candidate.position_id, self.position.pk)
        self.assertEqual(candidate.academic_year, AcademicYear.SECOND_YEAR)

    @patch("candidates.application_views.Candidate.objects.create")
    def test_approve_rolls_back_when_candidate_create_fails(self, mock_create):
        from django.db import IntegrityError

        mock_create.side_effect = IntegrityError("simulated failure")
        self._login_admin()
        self.client.raise_request_exception = False

        response = self.client.post(
            reverse("applications-review", kwargs={"pk": self.application.pk}),
            {"action": "APPROVE"},
            format="json",
        )
        self.assertGreaterEqual(response.status_code, 500)

        self.application.refresh_from_db()
        self.assertEqual(self.application.status, ApplicationStatus.PENDING_REVIEW)
        self.assertIsNone(self.application.approved_at)
        self.assertIsNone(self.application.approved_by_id)
        self.assertEqual(Candidate.objects.count(), 0)

    def test_reject_updates_application_without_candidate(self):
        self._login_admin()
        response = self.client.post(
            reverse("applications-review", kwargs={"pk": self.application.pk}),
            {"action": "REJECT", "rejection_reason": "Incomplete documents"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["status"], ApplicationStatus.REJECTED)

        self.application.refresh_from_db()
        self.assertEqual(self.application.rejection_reason, "Incomplete documents")
        self.assertEqual(Candidate.objects.count(), 0)

    def test_admin_application_list_includes_member_mc(self):
        self._login_admin()
        response = self.client.get(reverse("applications-all"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        first = response.data["data"]["results"][0]
        self.assertEqual(first["member_mc"], "member-pass")
        self.assertEqual(first["member_cpm"], "CPM400")


class CandidateModelTestCase(TestCase):
    def test_full_name_stripped(self):
        position = Position.objects.create(name="Secretary")
        candidate = Candidate.objects.create(
            full_name="  Alice Lee  ",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
            position=position,
            election=create_draft_election(name="Model Test Election"),
        )
        self.assertEqual(candidate.full_name, "Alice Lee")
