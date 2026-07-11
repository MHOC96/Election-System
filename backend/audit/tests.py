from django.test import RequestFactory, TestCase

from accounts.models import User, UserRole
from audit.constants import AuditAction
from audit.models import AuditLog
from audit.services.audit_service import log_action


class AuditLogTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            cpm_number="CPM900",
            mc_number="secret",
            role=UserRole.MEMBER,
        )
        self.factory = RequestFactory()

    def test_log_action_creates_entry(self):
        request = self.factory.post("/auth/login/", REMOTE_ADDR="127.0.0.1")
        entry = log_action(
            action=AuditAction.LOGIN_SUCCESS,
            request=request,
            actor=self.user,
            metadata={"cpm_number": "CPM900"},
        )
        self.assertEqual(entry.action, AuditAction.LOGIN_SUCCESS)
        self.assertEqual(entry.actor_id, self.user.id)
        self.assertEqual(entry.ip_address, "127.0.0.1")
        self.assertEqual(entry.metadata["cpm_number"], "CPM900")

    def test_audit_log_is_immutable(self):
        request = self.factory.post("/votes/submit/", REMOTE_ADDR="10.0.0.1")
        entry = log_action(
            action=AuditAction.VOTE_SUBMITTED,
            request=request,
            actor=self.user,
            metadata={"vote_id": 1},
        )
        entry.metadata = {"tampered": True}
        with self.assertRaises(ValueError):
            entry.save()
        with self.assertRaises(ValueError):
            entry.delete()
        self.assertEqual(AuditLog.objects.count(), 1)
