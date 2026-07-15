from datetime import timedelta

from django.db import IntegrityError
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from candidates.models import AcademicYear, Candidate
from positions.models import Position
from voting.models import Election, ElectionStatus, Vote
from voting.services.vote_service import VoteError, submit_vote
from voting.test_helpers import (
    create_applications_open_election,
    create_archived_election,
    create_draft_election,
    create_scheduled_election,
    create_voting_closed_election,
    create_voting_open_election,
)


class ElectionLifecycleTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            cpm_number="ADM300",
            mc_number="admin-pass",
            role=UserRole.ADMIN,
            is_staff=True,
        )
        self._login_admin()

    def _login_admin(self):
        response = self.client.post(
            reverse("auth-login"),
            {"cpm_number": "ADM300", "mc_number": "admin-pass"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access']}"
        )

    def test_create_draft_election(self):
        response = self.client.post(
            reverse("elections-list-create"),
            {"name": "2026 EC Election"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["status"], ElectionStatus.DRAFT)

    def test_schedule_requires_application_dates(self):
        election = create_draft_election()
        response = self.client.post(reverse("elections-schedule", kwargs={"pk": election.pk}))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_schedule_draft_election(self):
        now = timezone.now()
        election = create_draft_election(
            application_start_at=now + timedelta(hours=1),
            application_end_at=now + timedelta(days=1),
        )
        response = self.client.post(reverse("elections-schedule", kwargs={"pk": election.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["status"], ElectionStatus.SCHEDULED)

    def test_cannot_schedule_second_non_archived_election(self):
        now = timezone.now()
        first = create_draft_election(
            name="First",
            application_start_at=now + timedelta(hours=1),
            application_end_at=now + timedelta(days=1),
        )
        schedule_first = self.client.post(reverse("elections-schedule", kwargs={"pk": first.pk}))
        self.assertEqual(schedule_first.status_code, status.HTTP_200_OK)

        second = create_draft_election(
            name="Second",
            application_start_at=now + timedelta(hours=2),
            application_end_at=now + timedelta(days=2),
        )
        response = self.client.post(reverse("elections-schedule", kwargs={"pk": second.pk}))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_draft_election(self):
        election = create_draft_election()
        response = self.client.delete(reverse("elections-detail", kwargs={"pk": election.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Election.objects.filter(pk=election.pk).exists())

    def test_delete_scheduled_election(self):
        election = create_scheduled_election()
        response = self.client.delete(reverse("elections-detail", kwargs={"pk": election.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Election.objects.filter(pk=election.pk).exists())

    def test_delete_closed_election_cascades_votes(self):
        position = Position.objects.create(
            name="President",
            academic_year=AcademicYear.SECOND_YEAR,
        )
        election = create_voting_closed_election()
        candidate = Candidate.objects.create(
            full_name="Alice",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/a.jpg",
            position=position,
            election=election,
        )
        member = User.objects.create_user(
            cpm_number="CPM310",
            mc_number="member-pass",
            role=UserRole.MEMBER,
            academic_year=AcademicYear.SECOND_YEAR,
        )
        Vote.objects.create(
            member=member,
            position=position,
            candidate=candidate,
            election=election,
        )
        response = self.client.delete(reverse("elections-detail", kwargs={"pk": election.pk}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Election.objects.filter(pk=election.pk).exists())
        self.assertFalse(Vote.objects.filter(election_id=election.pk).exists())


class VotingTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            cpm_number="ADM301",
            mc_number="admin-pass",
            role=UserRole.ADMIN,
            is_staff=True,
        )
        self.member = User.objects.create_user(
            cpm_number="CPM301",
            mc_number="member-pass",
            role=UserRole.MEMBER,
            academic_year=AcademicYear.SECOND_YEAR,
        )
        self.other_member = User.objects.create_user(
            cpm_number="CPM302",
            mc_number="member-pass2",
            role=UserRole.MEMBER,
            academic_year=AcademicYear.SECOND_YEAR,
        )
        self.position = Position.objects.create(
            name="President",
            academic_year=AcademicYear.SECOND_YEAR,
        )
        self.election = create_voting_open_election()
        self.candidate = Candidate.objects.create(
            full_name="Alice",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
            position=self.position,
            election=self.election,
        )

    def _login(self, cpm_number, mc_number):
        response = self.client.post(
            reverse("auth-login"),
            {"cpm_number": cpm_number, "mc_number": mc_number},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access']}"
        )

    def test_member_can_submit_vote(self):
        self._login("CPM301", "member-pass")
        response = self.client.post(
            reverse("votes-submit"),
            {"position_id": self.position.pk, "candidate_id": self.candidate.pk},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Vote.objects.filter(member=self.member, position=self.position).exists())

    def test_duplicate_vote_rejected(self):
        submit_vote(
            member=self.member,
            position_id=self.position.pk,
            candidate_id=self.candidate.pk,
        )
        with self.assertRaises(VoteError) as ctx:
            submit_vote(
                member=self.member,
                position_id=self.position.pk,
                candidate_id=self.candidate.pk,
            )
        self.assertEqual(ctx.exception.code, "duplicate_vote")

    def test_admin_cannot_vote(self):
        self._login("ADM301", "admin-pass")
        response = self.client.post(
            reverse("votes-submit"),
            {"position_id": self.position.pk, "candidate_id": self.candidate.pk},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_vote_blocked_when_voting_not_open(self):
        self.election.voting_started = False
        self.election.save()
        self._login("CPM301", "member-pass")
        response = self.client.post(
            reverse("votes-submit"),
            {"position_id": self.position.pk, "candidate_id": self.candidate.pk},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "election_not_active")

    def test_candidate_position_mismatch_rejected(self):
        other_position = Position.objects.create(name="Secretary")
        self._login("CPM301", "member-pass")
        response = self.client.post(
            reverse("votes-submit"),
            {"position_id": other_position.pk, "candidate_id": self.candidate.pk},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "candidate_position_mismatch")

    def test_my_status_shows_only_own_votes(self):
        submit_vote(
            member=self.member,
            position_id=self.position.pk,
            candidate_id=self.candidate.pk,
        )
        self._login("CPM301", "member-pass")
        response = self.client.get(reverse("votes-my-status"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]["votes"]), 1)
        self.assertEqual(response.data["data"]["votes"][0]["candidate_name"], "Alice")

    def test_ballot_shows_vote_status(self):
        submit_vote(
            member=self.member,
            position_id=self.position.pk,
            candidate_id=self.candidate.pk,
        )
        self._login("CPM301", "member-pass")
        response = self.client.get(reverse("votes-ballot"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["data"]["positions"][0]["has_voted"])
        self.assertEqual(
            response.data["data"]["positions"][0]["my_candidate_id"],
            self.candidate.pk,
        )
        self.assertEqual(len(response.data["data"]["vote_status"]["votes"]), 1)
        self.assertEqual(
            response.data["data"]["vote_status"]["votes"][0]["candidate_name"],
            "Alice",
        )

    def test_ballot_available_before_voting_opens(self):
        now = timezone.now()
        self.election.voting_started = False
        self.election.voting_start_at = now + timedelta(hours=2)
        self.election.voting_end_at = now + timedelta(hours=4)
        self.election.save()
        self._login("CPM301", "member-pass")
        response = self.client.get(reverse("votes-ballot"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["data"]["can_vote"])
        self.assertEqual(response.data["data"]["election"]["status"], ElectionStatus.SCHEDULED)

    def test_my_status_empty_when_no_ongoing_election(self):
        submit_vote(
            member=self.member,
            position_id=self.position.pk,
            candidate_id=self.candidate.pk,
        )
        self.election.status = ElectionStatus.ARCHIVED
        self.election.save()
        self._login("CPM301", "member-pass")
        response = self.client.get(reverse("votes-my-status"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["votes"], [])

    def test_votes_are_immutable(self):
        vote = submit_vote(
            member=self.member,
            position_id=self.position.pk,
            candidate_id=self.candidate.pk,
        )
        vote_admin = VoteAdminChecker()
        self.assertFalse(vote_admin.has_change_permission(None, vote))
        self.assertFalse(vote_admin.has_delete_permission(None, vote))


class VoteUniqueConstraintTestCase(TestCase):
    """Ensures one vote per member per position is scoped to an election."""

    def setUp(self):
        self.member = User.objects.create_user(
            cpm_number="CPM900",
            mc_number="member-pass",
            role=UserRole.MEMBER,
            academic_year=AcademicYear.SECOND_YEAR,
        )
        self.position = Position.objects.create(
            name="President",
            academic_year=AcademicYear.SECOND_YEAR,
        )
        self.election_one = Election.objects.create(
            name="Election 2025",
            status=ElectionStatus.ARCHIVED,
        )
        self.election_two = Election.objects.create(
            name="Election 2026",
            status=ElectionStatus.SCHEDULED,
        )
        self.candidate_one = Candidate.objects.create(
            full_name="Alice 2025",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/a.jpg",
            position=self.position,
            election=self.election_one,
        )
        self.candidate_two = Candidate.objects.create(
            full_name="Bob 2026",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/b.jpg",
            position=self.position,
            election=self.election_two,
        )

    def test_same_member_position_allowed_across_elections(self):
        Vote.objects.create(
            member=self.member,
            position=self.position,
            candidate=self.candidate_one,
            election=self.election_one,
        )
        vote = Vote.objects.create(
            member=self.member,
            position=self.position,
            candidate=self.candidate_two,
            election=self.election_two,
        )
        self.assertEqual(vote.election_id, self.election_two.id)

    def test_duplicate_vote_same_election_rejected(self):
        Vote.objects.create(
            member=self.member,
            position=self.position,
            candidate=self.candidate_one,
            election=self.election_one,
        )
        with self.assertRaises(IntegrityError):
            Vote.objects.create(
                member=self.member,
                position=self.position,
                candidate=self.candidate_one,
                election=self.election_one,
            )


class OngoingElectionCacheTestCase(TestCase):
    def setUp(self):
        self.election = create_voting_open_election(name="Cache Test Election")
        self.member = User.objects.create_user(
            cpm_number="CPM950",
            mc_number="member-pass",
            role=UserRole.MEMBER,
            academic_year=AcademicYear.SECOND_YEAR,
        )
        self.position = Position.objects.create(
            name="Treasurer",
            academic_year=AcademicYear.SECOND_YEAR,
        )
        self.candidate = Candidate.objects.create(
            full_name="Cache Candidate",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/sample.jpg",
            election=self.election,
            position=self.position,
        )

    def test_get_cached_ongoing_election_hits_cache(self):
        from voting.services.ongoing_election_cache import (
            get_cached_ongoing_election,
            invalidate_ongoing_election_cache,
        )

        invalidate_ongoing_election_cache()
        first = get_cached_ongoing_election()
        self.assertIsNotNone(first)
        with self.assertNumQueries(0):
            second = get_cached_ongoing_election()
        self.assertEqual(first.pk, second.pk)

    def test_submit_vote_returns_prefetched_relations(self):
        vote = submit_vote(
            member=self.member,
            position_id=self.position.pk,
            candidate_id=self.candidate.pk,
        )
        self.assertEqual(vote.position.name, "Treasurer")
        self.assertEqual(vote.candidate.full_name, "Cache Candidate")


class VoteAdminChecker:
    def has_change_permission(self, request, obj=None):
        from voting.admin import VoteAdmin

        return VoteAdmin(Vote, None).has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        from voting.admin import VoteAdmin

        return VoteAdmin(Vote, None).has_delete_permission(request, obj)
