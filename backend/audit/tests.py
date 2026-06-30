from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from audit.models import AuditAction, AuditLog
from candidates.models import AcademicYear, Candidate
from positions.models import Position
from voting.models import Election, ElectionStatus


class AuditLogAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            cpm_number="ADM600",
            mc_number="admin-pass",
            role=UserRole.ADMIN,
            is_staff=True,
        )
        self.member = User.objects.create_user(
            cpm_number="CPM600",
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

    def _login(self, cpm_number, mc_number):
        response = self.client.post(
            reverse("auth-login"),
            {"cpm_number": cpm_number, "mc_number": mc_number},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access']}"
        )

    def test_login_creates_audit_log(self):
        self.client.post(
            reverse("auth-login"),
            {"cpm_number": "CPM600", "mc_number": "member-pass"},
            format="json",
        )
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditAction.LOGIN, actor=self.member
            ).exists()
        )

    def test_vote_creates_audit_log(self):
        self._login("CPM600", "member-pass")
        response = self.client.post(
            reverse("votes-submit"),
            {"position_id": self.position.id, "candidate_id": self.candidate.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        log = AuditLog.objects.get(action=AuditAction.VOTE_SUBMITTED)
        self.assertEqual(log.actor, self.member)
        self.assertEqual(log.metadata["position_id"], self.position.id)

    def test_admin_can_list_audit_logs(self):
        AuditLog.objects.create(
            actor=self.admin,
            action=AuditAction.ELECTION_CREATED,
            ip_address="127.0.0.1",
            metadata={"election_id": self.election.id},
        )
        self._login("ADM600", "admin-pass")
        response = self.client.get(reverse("audit-logs-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data["data"]["results"]), 1)

    def test_filter_audit_logs_by_action(self):
        AuditLog.objects.create(
            actor=self.admin,
            action=AuditAction.LOGOUT,
            metadata={},
        )
        AuditLog.objects.create(
            actor=self.admin,
            action=AuditAction.LOGIN,
            metadata={},
        )
        self._login("ADM600", "admin-pass")
        response = self.client.get(reverse("audit-logs-list"), {"action": "LOGIN"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["data"]["results"]
        self.assertTrue(all(item["action"] == AuditAction.LOGIN for item in results))

    def test_member_cannot_access_audit_logs(self):
        self._login("CPM600", "member-pass")
        response = self.client.get(reverse("audit-logs-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_audit_log_is_immutable(self):
        log = AuditLog.objects.create(
            actor=self.admin,
            action=AuditAction.LOGIN,
            metadata={},
        )
        with self.assertRaises(ValueError):
            log.metadata = {"tampered": True}
            log.save()

        with self.assertRaises(ValueError):
            log.delete()


class AuditLogModelTestCase(TestCase):
    def test_log_action_sets_ip(self):
        from audit.services.logger import get_client_ip, log_action

        class FakeRequest:
            META = {"REMOTE_ADDR": "10.0.0.5"}

        user = User.objects.create_user(
            cpm_number="CPM601",
            mc_number="secret",
            role=UserRole.MEMBER,
        )
        log = log_action(
            request=FakeRequest(),
            action=AuditAction.LOGIN,
            actor=user,
            metadata={"cpm_number": "CPM601"},
        )
        self.assertEqual(get_client_ip(FakeRequest()), "10.0.0.5")
        self.assertEqual(log.ip_address, "10.0.0.5")
