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
            academic_year=AcademicYear.SECOND_YEAR,
        )
        self.member2 = User.objects.create_user(
            cpm_number="CPM402",
            mc_number="member-pass2",
            role=UserRole.MEMBER,
            academic_year=AcademicYear.SECOND_YEAR,
        )
        self.member3 = User.objects.create_user(
            cpm_number="CPM403",
            mc_number="member-pass3",
            role=UserRole.MEMBER,
            academic_year=AcademicYear.SECOND_YEAR,
        )
        self.position1 = Position.objects.create(
            name="President",
            academic_year=AcademicYear.SECOND_YEAR,
        )
        self.position2 = Position.objects.create(
            name="Secretary",
            academic_year=AcademicYear.SECOND_YEAR,
        )
        self.election = create_voting_open_election(name="2026 Election")
        self.candidate1 = Candidate.objects.create(
            full_name="Alice",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/a.jpg",
            position=self.position1,
            election=self.election,
        )
        self.candidate2 = Candidate.objects.create(
            full_name="Bob",
            academic_year=AcademicYear.THIRD_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/b.jpg",
            position=self.position1,
            election=self.election,
        )
        self.candidate3 = Candidate.objects.create(
            full_name="Carol",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/c.jpg",
            position=self.position2,
            election=self.election,
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
        response = self.client.get(reverse("dashboard-summary"), {"academic_year": "2nd Year"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        self.assertEqual(data["total_members"], 3)
        self.assertEqual(data["total_candidates"], 3)
        self.assertEqual(data["total_positions"], 2)
        self.assertEqual(data["votes_cast"], 3)
        self.assertEqual(data["election"]["status"], ElectionStatus.SCHEDULED)
        self.assertEqual(len(data["position_turnout"]), 2)
        self.assertEqual(data["members_completed_ballot"], 1)
        self.assertEqual(data["members_partial_ballot"], 1)
        self.assertEqual(data["members_no_votes"], 1)

    def test_dashboard_overview(self):
        response = self.client.get(reverse("dashboard-overview"), {"academic_year": "2nd Year"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        self.assertIn("summary", data)
        self.assertIn("live", data)
        self.assertEqual(data["summary"]["votes_cast"], 3)
        self.assertEqual(len(data["live"]["positions"]), 2)

    def test_live_stats_uses_materialized_view_when_available(self):
        from dashboard.services.materialized_stats import (
            fetch_candidate_vote_counts,
            materialized_view_available,
            refresh_live_stats_view,
        )
        from dashboard.services.stats_service import get_live_stats

        if not materialized_view_available():
            self.skipTest("Materialized view is only available on PostgreSQL.")

        refresh_live_stats_view()
        mv_counts = fetch_candidate_vote_counts(self.election.id, "2nd Year")
        live = get_live_stats(
            self.election.id,
            use_cache=False,
            election=self.election,
            academic_year="2nd Year",
        )
        for candidate in live["candidates"]:
            if candidate["full_name"] in {"Alice", "Carol"}:
                self.assertEqual(candidate["vote_count"], mv_counts.get(candidate["candidate_id"], 0))

    def test_live_stats_mv_path_when_no_votes_recorded(self):
        from dashboard.services.materialized_stats import (
            materialized_view_available,
            refresh_live_stats_view,
        )
        from dashboard.services.stats_service import get_live_stats

        if not materialized_view_available():
            self.skipTest("Materialized view is only available on PostgreSQL.")

        position = Position.objects.create(
            name="Auditor",
            academic_year=AcademicYear.SECOND_YEAR,
        )
        candidate = Candidate.objects.create(
            full_name="No Votes Candidate",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/sample.jpg",
            election=self.election,
            position=position,
        )
        refresh_live_stats_view()
        live = get_live_stats(
            self.election.id,
            use_cache=False,
            election=self.election,
            academic_year="2nd Year",
        )
        no_votes = next(
            item for item in live["candidates"] if item["candidate_id"] == candidate.id
        )
        self.assertEqual(no_votes["vote_count"], 0)

    def test_per_position_turnout(self):
        response = self.client.get(reverse("dashboard-summary"), {"academic_year": "2nd Year"})
        turnout = {
            item["position_name"]: item for item in response.data["data"]["position_turnout"]
        }
        self.assertEqual(turnout["President"]["votes_cast"], 2)
        self.assertEqual(turnout["President"]["turnout_percentage"], 66.67)
        self.assertEqual(turnout["Secretary"]["votes_cast"], 1)
        self.assertEqual(turnout["Secretary"]["remaining_voters"], 2)

    def test_live_stats(self):
        response = self.client.get(reverse("dashboard-live-stats"), {"academic_year": "2nd Year"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        self.assertEqual(data["total_votes"], 3)
        self.assertEqual(len(data["positions"]), 2)
        president = next(
            item for item in data["positions"] if item["position_name"] == "President"
        )
        self.assertEqual(president["rankings"][0]["full_name"], "Alice")
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
        response = self.client.get(reverse("dashboard-live-stats"), {"academic_year": "2nd Year"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_live_stats_cache(self):
        first = self.client.get(reverse("dashboard-live-stats"), {"academic_year": "2nd Year"})
        Vote.objects.create(
            member=self.member3,
            position=self.position2,
            candidate=self.candidate3,
            election=self.election,
        )
        second = self.client.get(reverse("dashboard-live-stats"), {"academic_year": "2nd Year"})
        self.assertEqual(
            first.data["data"]["total_votes"],
            second.data["data"]["total_votes"],
        )

    def test_empty_position_excluded_from_dashboard(self):
        Position.objects.create(name="Treasurer")
        response = self.client.get(reverse("dashboard-overview"), {"academic_year": "2nd Year"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        live_names = [item["position_name"] for item in data["live"]["positions"]]
        turnout_names = [item["position_name"] for item in data["summary"]["position_turnout"]]
        self.assertNotIn("Treasurer", live_names)
        self.assertNotIn("Treasurer", turnout_names)
        self.assertEqual(len(live_names), 2)
        self.assertEqual(len(turnout_names), 2)


class DashboardCacheInvalidationTestCase(TestCase):
    def test_invalidate_without_refresh_mv_skips_mv_scheduler(self):
        from unittest.mock import patch

        from dashboard.services.stats_service import invalidate_dashboard_cache

        with patch(
            "dashboard.services.stats_service.schedule_debounced_mv_refresh"
        ) as schedule_mock:
            invalidate_dashboard_cache(1, refresh_mv=False)
        schedule_mock.assert_not_called()

    def test_invalidate_with_refresh_mv_schedules_mv_refresh(self):
        from unittest.mock import patch

        from dashboard.services.stats_service import invalidate_dashboard_cache

        with patch(
            "dashboard.services.stats_service.schedule_debounced_mv_refresh"
        ) as schedule_mock:
            invalidate_dashboard_cache(1, refresh_mv=True)
        schedule_mock.assert_called_once()

    def test_stale_mv_falls_back_to_orm_live_stats(self):
        from dashboard.services.materialized_stats import materialized_view_available
        from dashboard.services.mv_refresh import mark_mv_stale
        from dashboard.services.stats_service import get_live_stats

        if not materialized_view_available():
            self.skipTest("Materialized view is only available on PostgreSQL.")

        position = Position.objects.create(
            name="President",
            academic_year=AcademicYear.SECOND_YEAR,
        )
        election = create_voting_open_election(name="Stale MV Election")
        member = User.objects.create_user(
            cpm_number="CPM901",
            mc_number="member-pass",
            role=UserRole.MEMBER,
            academic_year=AcademicYear.SECOND_YEAR,
        )
        candidate = Candidate.objects.create(
            full_name="Alice",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/a.jpg",
            position=position,
            election=election,
        )
        submit_vote(
            member=member,
            position_id=position.id,
            candidate_id=candidate.id,
        )
        mark_mv_stale()

        live = get_live_stats(
            election.id,
            use_cache=False,
            election=election,
            academic_year="2nd Year",
        )
        self.assertEqual(live["total_votes"], 1)
        alice = next(item for item in live["candidates"] if item["full_name"] == "Alice")
        self.assertEqual(alice["vote_count"], 1)


class DashboardCandidateElectionScopeTestCase(TestCase):
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
            full_name="Old Bob",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/old-b.jpg",
            position=self.position,
            election=self.old_election,
        )
        self.current_candidate = Candidate.objects.create(
            full_name="Current Carol",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/current.jpg",
            position=self.position,
            election=self.current_election,
        )

    def test_summary_counts_only_current_election_candidates(self):
        from dashboard.services.stats_service import get_dashboard_summary

        summary = get_dashboard_summary(
            self.current_election.id,
            use_cache=False,
            election=self.current_election,
        )
        self.assertEqual(summary["total_candidates"], 1)

    def test_live_stats_excludes_other_election_candidates(self):
        from dashboard.services.stats_service import get_live_stats

        live = get_live_stats(
            self.current_election.id,
            use_cache=False,
            election=self.current_election,
        )
        names = {candidate["full_name"] for candidate in live["candidates"]}
        self.assertEqual(names, {self.current_candidate.full_name})
        self.assertEqual(len(live["positions"]), 1)
