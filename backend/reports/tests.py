from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from candidates.models import AcademicYear, Candidate
from positions.models import Position
from voting.models import Election, ElectionStatus, Vote
from voting.services.vote_service import submit_vote


class ReportsAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            cpm_number="ADM500",
            mc_number="admin-pass",
            role=UserRole.ADMIN,
            is_staff=True,
        )
        self.member = User.objects.create_user(
            cpm_number="CPM500",
            mc_number="member-pass",
            role=UserRole.MEMBER,
        )
        self.position = Position.objects.create(name="President")
        self.candidate = Candidate.objects.create(
            full_name="Alice",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/a.jpg",
            position=self.position,
        )
        self.election = Election.objects.create(
            name="2026 Election",
            status=ElectionStatus.ACTIVE,
        )
        submit_vote(
            member=self.member,
            position_id=self.position.id,
            candidate_id=self.candidate.id,
        )
        self._login_admin()

    def _login_admin(self):
        response = self.client.post(
            reverse("auth-login"),
            {"cpm_number": "ADM500", "mc_number": "admin-pass"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access']}"
        )

    def test_results_csv_export(self):
        response = self.client.get(reverse("reports-results"), {"export_format": "csv"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv")
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertIn(b"Candidate", response.content)

    def test_results_xlsx_export(self):
        response = self.client.get(reverse("reports-results"), {"export_format": "xlsx"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("spreadsheetml", response["Content-Type"])

    def test_results_pdf_export(self):
        response = self.client.get(reverse("reports-results"), {"export_format": "pdf"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertTrue(response.content.startswith(b"%PDF"))

    def test_candidates_export(self):
        response = self.client.get(reverse("reports-candidates"), {"export_format": "csv"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(b"Alice", response.content)

    def test_turnout_export(self):
        response = self.client.get(reverse("reports-turnout"), {"export_format": "csv"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(b"Turnout", response.content)

    def test_participation_export(self):
        response = self.client.get(reverse("reports-participation"), {"export_format": "csv"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(b"CPM500", response.content)
        self.assertIn(b"Complete", response.content)

    def test_invalid_format_rejected(self):
        response = self.client.get(reverse("reports-results"), {"export_format": "doc"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_cannot_export(self):
        response = self.client.post(
            reverse("auth-login"),
            {"cpm_number": "CPM500", "mc_number": "member-pass"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access']}"
        )
        response = self.client.get(reverse("reports-results"), {"export_format": "csv"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_no_election_error(self):
        Vote.objects.all().delete()
        Election.objects.all().delete()
        response = self.client.get(reverse("reports-results"), {"export_format": "csv"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "no_election")
