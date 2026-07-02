from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from candidates.models import AcademicYear, Candidate
from positions.models import Position
from voting.models import Election, ElectionStatus, Vote
from voting.services.vote_service import VoteError, submit_vote


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

    def test_create_and_start_election(self):
        create_response = self.client.post(
            reverse("elections-list-create"),
            {"name": "2026 EC Election"},
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        election_id = create_response.data["data"]["id"]

        start_response = self.client.post(
            reverse("elections-start", kwargs={"pk": election_id})
        )
        self.assertEqual(start_response.status_code, status.HTTP_200_OK)
        self.assertEqual(start_response.data["data"]["status"], ElectionStatus.ACTIVE)

    def test_only_one_active_election(self):
        e1 = Election.objects.create(name="Election 1", status=ElectionStatus.ACTIVE)
        e2 = Election.objects.create(name="Election 2", status=ElectionStatus.DRAFT)
        response = self.client.post(reverse("elections-start", kwargs={"pk": e2.pk}))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        e1.refresh_from_db()
        self.assertEqual(e1.status, ElectionStatus.ACTIVE)

    def test_stop_and_resume_election(self):
        election = Election.objects.create(name="Election", status=ElectionStatus.DRAFT)
        election.start()
        stop_response = self.client.post(
            reverse("elections-stop", kwargs={"pk": election.pk})
        )
        self.assertEqual(stop_response.data["data"]["status"], ElectionStatus.STOPPED)

        start_response = self.client.post(
            reverse("elections-start", kwargs={"pk": election.pk})
        )
        self.assertEqual(start_response.data["data"]["status"], ElectionStatus.ACTIVE)

    def test_close_election(self):
        election = Election.objects.create(name="Election", status=ElectionStatus.ACTIVE)
        response = self.client.post(reverse("elections-close", kwargs={"pk": election.pk}))
        self.assertEqual(response.data["data"]["status"], ElectionStatus.CLOSED)

    def test_delete_closed_election_cascades_votes(self):
        from accounts.models import User, UserRole
        from candidates.models import AcademicYear, Candidate
        from positions.models import Position

        position = Position.objects.create(name="President")
        candidate = Candidate.objects.create(
            full_name="Alice",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/a.jpg",
            position=position,
        )
        member = User.objects.create_user(
            cpm_number="CPM310",
            mc_number="member-pass",
            role=UserRole.MEMBER,
        )
        election = Election.objects.create(name="Closed Election", status=ElectionStatus.CLOSED)
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

    def test_cannot_delete_active_election(self):
        election = Election.objects.create(name="Active Election", status=ElectionStatus.ACTIVE)
        response = self.client.delete(reverse("elections-detail", kwargs={"pk": election.pk}))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


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
        )
        self.other_member = User.objects.create_user(
            cpm_number="CPM302",
            mc_number="member-pass2",
            role=UserRole.MEMBER,
        )
        self.position = Position.objects.create(name="President")
        self.candidate = Candidate.objects.create(
            full_name="Alice",
            academic_year=AcademicYear.SECOND_YEAR,
            photo_url="https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
            position=self.position,
        )
        self.election = Election.objects.create(
            name="2026 Election",
            status=ElectionStatus.ACTIVE,
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

    def test_vote_blocked_when_election_stopped(self):
        self.election.status = ElectionStatus.STOPPED
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

    def test_ballot_available_when_election_stopped(self):
        self.election.status = ElectionStatus.STOPPED
        self.election.save()
        self._login("CPM301", "member-pass")
        response = self.client.get(reverse("votes-ballot"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["data"]["can_vote"])
        self.assertEqual(response.data["data"]["election"]["status"], ElectionStatus.STOPPED)

    def test_my_status_hidden_after_election_closed(self):
        submit_vote(
            member=self.member,
            position_id=self.position.pk,
            candidate_id=self.candidate.pk,
        )
        self.election.status = ElectionStatus.CLOSED
        self.election.save()
        self._login("CPM301", "member-pass")
        response = self.client.get(reverse("votes-my-status"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["data"]["election_ended"])
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


class VoteAdminChecker:
    def has_change_permission(self, request, obj=None):
        from voting.admin import VoteAdmin

        return VoteAdmin(Vote, None).has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        from voting.admin import VoteAdmin

        return VoteAdmin(Vote, None).has_delete_permission(request, obj)
