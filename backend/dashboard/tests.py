from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from candidates.models import AcademicYear, Candidate
from positions.models import Position
from voting.models import Election, ElectionStatus, Vote
from voting.services.vote_service import submit_vote


class DashboardAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            cpm_number="ADM400",
            mc_number="admin-pass",
            role=UserRole.ADMIN,
            is_staff=True,
        )
        self.member1 = User.objects.create_user(
            cpm_number="CPM401",
            mc_number="member-pass1",
            role=UserRole.MEMBER,
        )
        self.member2 = User.objects.create_user(
            cpm_number="CPM402",
            mc_number="member-pass2",
            role=UserRole.MEMBER,
        )
        self.member3 = User.objects.create_user(
            cpm_number="CPM403",
            mc_number="member-pass3",
            role=UserRole.MEMBER,
        )
        self.position1 = Position.objects.create(name="President")
        self.position2 = Position.objects.create(name="Secretary")
        self.candidate1 = Candidate.objects.create(
            full_name="Alice",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/a.jpg",
            position=self.position1,
        )
        self.candidate2 = Candidate.objects.create(
            full_name="Bob",
            academic_year=AcademicYear.THIRD_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/b.jpg",
            position=self.position1,
        )
        self.candidate3 = Candidate.objects.create(
            full_name="Carol",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/c.jpg",
            position=self.position2,
        )
        self.election = Election.objects.create(
            name="2026 Election",
            status=ElectionStatus.ACTIVE,
        )

        submit_vote(
            member=self.member1,
            position_id=self.position1.id,
            candidate_id=self.candidate1.id,
        )
        submit_vote(
            member=self.member1,
            position_id=self.position2.id,
            candidate_id=self.candidate3.id,
        )
        submit_vote(
            member=self.member2,
            position_id=self.position1.id,
            candidate_id=self.candidate1.id,
        )

        self._login_admin()

    def _login_admin(self):
        response = self.client.post(
            reverse("auth-login"),
            {"cpm_number": "ADM400", "mc_number": "admin-pass"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access']}"
        )

    def test_summary_requires_admin(self):
        client = APIClient()
        response = client.get(reverse("dashboard-summary"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_dashboard_summary(self):
        response = self.client.get(reverse("dashboard-summary"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        self.assertEqual(data["total_members"], 3)
        self.assertEqual(data["total_candidates"], 3)
        self.assertEqual(data["total_positions"], 2)
        self.assertEqual(data["votes_cast"], 3)
        self.assertEqual(data["election"]["status"], ElectionStatus.ACTIVE)
        self.assertEqual(len(data["position_turnout"]), 2)
        self.assertEqual(data["members_completed_ballot"], 1)
        self.assertEqual(data["members_partial_ballot"], 1)
        self.assertEqual(data["members_no_votes"], 1)

    def test_dashboard_overview(self):
        response = self.client.get(reverse("dashboard-overview"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        self.assertIn("summary", data)
        self.assertIn("live", data)
        self.assertEqual(data["summary"]["votes_cast"], 3)
        self.assertEqual(len(data["live"]["positions"]), 2)

    def test_per_position_turnout(self):
        response = self.client.get(reverse("dashboard-summary"))
        turnout = {
            item["position_name"]: item for item in response.data["data"]["position_turnout"]
        }
        self.assertEqual(turnout["President"]["votes_cast"], 2)
        self.assertEqual(turnout["President"]["turnout_percentage"], 66.67)
        self.assertEqual(turnout["Secretary"]["votes_cast"], 1)
        self.assertEqual(turnout["Secretary"]["remaining_voters"], 2)

    def test_live_stats(self):
        response = self.client.get(reverse("dashboard-live-stats"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        self.assertEqual(data["total_votes"], 3)
        self.assertEqual(len(data["positions"]), 2)
        president = next(
            item for item in data["positions"] if item["position_name"] == "President"
        )
        self.assertEqual(president["highest_voted_candidate"]["full_name"], "Alice")
        self.assertEqual(president["rankings"][0]["vote_count"], 2)
        self.assertEqual(data["highest_voted_overall"]["full_name"], "Alice")

    def test_position_rankings_endpoint(self):
        response = self.client.get(
            reverse(
                "dashboard-position-rankings",
                kwargs={"position_id": self.position1.pk},
            )
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]["rankings"]), 2)
        self.assertEqual(response.data["data"]["rankings"][0]["rank"], 1)

    def test_member_cannot_access_dashboard(self):
        response = self.client.post(
            reverse("auth-login"),
            {"cpm_number": "CPM401", "mc_number": "member-pass1"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access']}"
        )
        response = self.client.get(reverse("dashboard-live-stats"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_live_stats_cache(self):
        first = self.client.get(reverse("dashboard-live-stats"))
        Vote.objects.create(
            member=self.member3,
            position=self.position2,
            candidate=self.candidate3,
            election=self.election,
        )
        second = self.client.get(reverse("dashboard-live-stats"))
        self.assertEqual(
            first.data["data"]["total_votes"],
            second.data["data"]["total_votes"],
        )

    def test_empty_position_excluded_from_dashboard(self):
        Position.objects.create(name="Treasurer")
        response = self.client.get(reverse("dashboard-overview"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        live_names = [item["position_name"] for item in data["live"]["positions"]]
        turnout_names = [item["position_name"] for item in data["summary"]["position_turnout"]]
        self.assertNotIn("Treasurer", live_names)
        self.assertNotIn("Treasurer", turnout_names)
        self.assertEqual(len(live_names), 2)
        self.assertEqual(len(turnout_names), 2)
