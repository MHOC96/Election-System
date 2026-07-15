from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from candidates.models import AcademicYear, Candidate
from positions.models import Position
from voting.models import Election, ElectionStatus, Vote
from voting.services.vote_service import submit_vote
from voting.test_helpers import create_voting_open_election


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
            academic_year=AcademicYear.SECOND_YEAR,
        )
        self.position = Position.objects.create(
            name="President",
            academic_year=AcademicYear.SECOND_YEAR,
        )
        self.election = create_voting_open_election(name="2026 Election")
        self.candidate = Candidate.objects.create(
            full_name="Alice",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/a.jpg",
            position=self.position,
            election=self.election,
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

    def test_turnout_report_data_matches_summary(self):
        from reports.services.report_data import get_turnout_report_data

        data = get_turnout_report_data(self.election.id, academic_year="2nd Year")
        self.assertEqual(data["summary"]["members_completed_ballot"], 1)
        self.assertEqual(data["summary"]["members_partial_ballot"], 0)
        self.assertEqual(len(data["rows"]), 1)
        self.assertEqual(data["rows"][0]["position"], "President")
        self.assertEqual(data["rows"][0]["votes_cast"], 1)

    def test_participation_export(self):
        response = self.client.get(
            reverse("reports-participation"),
            {"export_format": "csv", "academic_year": "2nd Year"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(b"CPM500", response.content)
        self.assertIn(b"Complete", response.content)

    def test_participation_report_data_statuses(self):
        from reports.services.report_data import get_participation_report_data

        data = get_participation_report_data(self.election.id, academic_year="2nd Year")
        row = next(item for item in data["rows"] if item["cpm_number"] == "CPM500")
        self.assertEqual(row["participation_status"], "Complete")
        self.assertEqual(row["positions_voted"], 1)

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


class ReportCandidateElectionScopeTestCase(TestCase):
    def setUp(self):
        self.position = Position.objects.create(
            name="President",
            academic_year=AcademicYear.SECOND_YEAR,
        )
        self.old_election = Election.objects.create(
            name="2025 Election",
            status=ElectionStatus.ARCHIVED,
        )
        self.current_election = Election.objects.create(
            name="2026 Election",
            status=ElectionStatus.SCHEDULED,
        )
        Candidate.objects.create(
            full_name="Old Alice",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/old-a.jpg",
            position=self.position,
            election=self.old_election,
        )
        Candidate.objects.create(
            full_name="Current Carol",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/current.jpg",
            position=self.position,
            election=self.current_election,
        )

    def test_candidates_report_only_includes_resolved_election(self):
        from reports.services.report_data import get_candidates_report_data

        data = get_candidates_report_data(self.current_election.id)
        self.assertEqual(len(data["rows"]), 1)
        self.assertEqual(data["rows"][0]["full_name"], "Current Carol")
