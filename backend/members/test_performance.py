from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from dashboard.services.stats_service import get_position_rankings
from voting.models import Election, ElectionStatus
from voting.services.vote_service import build_member_vote_status

ACADEMIC_YEAR = "2nd Year"


class MemberListPerformanceTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            cpm_number="ADMPERF",
            mc_number="admin-pass",
            role=UserRole.ADMIN,
            is_staff=True,
        )
        for index in range(25):
            User.objects.create_user(
                cpm_number=f"CPM{index:03d}",
                mc_number=f"pass-{index}",
                role=UserRole.MEMBER,
                academic_year=ACADEMIC_YEAR,
            )

        login = self.client.post(
            reverse("auth-login"),
            {"cpm_number": "ADMPERF", "mc_number": "admin-pass"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['data']['access']}")

    def test_member_list_does_not_n_plus_one(self):
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(
                reverse("members-list"),
                {"academic_year": ACADEMIC_YEAR},
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]["results"]), 25)
        # count + page select (+ auth middleware/session overhead stays bounded)
        self.assertLessEqual(len(ctx.captured_queries), 6)


class VoteStatusPerformanceTestCase(TestCase):
    def setUp(self):
        self.member = User.objects.create_user(
            cpm_number="CPMVOTE",
            mc_number="member-pass",
            role=UserRole.MEMBER,
            academic_year=ACADEMIC_YEAR,
        )
        self.election = Election.objects.create(
            name="Perf Election",
            status=ElectionStatus.SCHEDULED,
            voting_started=True,
        )

    def test_build_member_vote_status_skips_recently_closed_when_election_present(self):
        with CaptureQueriesContext(connection) as ctx:
            payload = build_member_vote_status(self.member, self.election)

        self.assertFalse(payload["election_ended"])
        query_sql = " ".join(query["sql"].lower() for query in ctx.captured_queries)
        self.assertNotIn("voting_end_at", query_sql)


class PositionRankingsPerformanceTestCase(TestCase):
    def setUp(self):
        from candidates.models import Candidate
        from positions.models import Position

        self.election = Election.objects.create(
            name="Rankings Election",
            status=ElectionStatus.SCHEDULED,
            voting_started=True,
        )
        self.position = Position.objects.create(
            name="President",
            academic_year=ACADEMIC_YEAR,
        )
        Candidate.objects.create(
            full_name="Alice",
            academic_year=ACADEMIC_YEAR,
            photo_url="https://example.com/a.jpg",
            election=self.election,
            position=self.position,
        )

    def test_get_position_rankings_uses_targeted_query(self):
        with CaptureQueriesContext(connection) as ctx:
            result = get_position_rankings(self.position.id, self.election.id)

        self.assertIsNotNone(result)
        self.assertEqual(result["position_id"], self.position.id)
        self.assertLessEqual(len(ctx.captured_queries), 4)
