from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, UserRole


class AuthenticationAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            cpm_number="ADM001",
            mc_number="admin-secret",
            role=UserRole.ADMIN,
            is_staff=True,
        )
        self.member = User.objects.create_user(
            cpm_number="CPM001",
            mc_number="member-secret",
            role=UserRole.MEMBER,
        )

    def _login(self, cpm_number, mc_number):
        return self.client.post(
            reverse("auth-login"),
            {"cpm_number": cpm_number, "mc_number": mc_number},
            format="json",
        )

    def test_member_login_success(self):
        response = self._login("cpm001", "member-secret")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertIn("access", response.data["data"])
        self.assertIn("refresh", response.data["data"])
        self.assertEqual(response.data["data"]["user"]["role"], UserRole.MEMBER)

    def test_login_invalid_credentials(self):
        response = self._login("CPM001", "wrong-password")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data["success"])

    def test_me_endpoint_requires_auth(self):
        response = self.client.get(reverse("auth-me"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_endpoint_returns_profile(self):
        login_response = self._login("CPM001", "member-secret")
        access = login_response.data["data"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = self.client.get(reverse("auth-me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["cpm_number"], "CPM001")
        self.assertEqual(response.data["data"]["mc_number"], "member-secret")

    def test_login_response_omits_mc_number(self):
        response = self._login("CPM001", "member-secret")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("mc_number", response.data["data"]["user"])

    def test_admin_probe_denied_for_member(self):
        login_response = self._login("CPM001", "member-secret")
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['data']['access']}"
        )
        response = self.client.get(reverse("auth-probe-admin"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_probe_allowed_for_admin(self):
        login_response = self._login("ADM001", "admin-secret")
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['data']['access']}"
        )
        response = self.client.get(reverse("auth-probe-admin"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_member_probe_allowed_for_member(self):
        login_response = self._login("CPM001", "member-secret")
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['data']['access']}"
        )
        response = self.client.get(reverse("auth-probe-member"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logout_blacklists_refresh_token(self):
        login_response = self._login("CPM001", "member-secret")
        access = login_response.data["data"]["access"]
        refresh = login_response.data["data"]["refresh"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        logout_response = self.client.post(
            reverse("auth-logout"),
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)

        refresh_response = self.client.post(
            reverse("auth-refresh"),
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)


class ChangePasswordAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.member = User.objects.create_user(
            cpm_number="CPM010",
            mc_number="member-secret",
            role=UserRole.MEMBER,
        )

    def _auth(self):
        login = self.client.post(
            reverse("auth-login"),
            {"cpm_number": "CPM010", "mc_number": "member-secret"},
            format="json",
        )
        access = login.data["data"]["access"]
        refresh = login.data["data"]["refresh"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        return refresh

    def test_change_password_requires_current_password(self):
        self._auth()
        response = self.client.post(
            reverse("auth-change-password"),
            {"new_password": "new-secret-1", "confirm_password": "new-secret-1"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_rejects_wrong_current_password(self):
        self._auth()
        response = self.client.post(
            reverse("auth-change-password"),
            {
                "current_password": "wrong-secret",
                "new_password": "new-secret-1",
                "confirm_password": "new-secret-1",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_success_rotates_tokens(self):
        old_refresh = self._auth()
        response = self.client.post(
            reverse("auth-change-password"),
            {
                "current_password": "member-secret",
                "new_password": "new-secret-1",
                "confirm_password": "new-secret-1",
                "refresh": old_refresh,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data["data"])
        self.assertIn("refresh", response.data["data"])
        self.assertTrue(response.data["data"]["user"]["has_changed_password"])

        self.member.refresh_from_db()
        self.assertTrue(self.member.check_password("new-secret-1"))
        self.assertTrue(self.member.has_changed_password)

        old_refresh_response = self.client.post(
            reverse("auth-refresh"),
            {"refresh": old_refresh},
            format="json",
        )
        self.assertEqual(old_refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

        new_access = response.data["data"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {new_access}")
        me_response = self.client.get(reverse("auth-me"))
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["data"]["mc_number"], "member-secret")
        self.member.refresh_from_db()
        self.assertEqual(self.member.mc_number, "member-secret")


class UserModelTestCase(TestCase):
    def test_admin_cannot_vote(self):
        admin = User.objects.create_user(
            cpm_number="ADM002",
            mc_number="secret",
            role=UserRole.ADMIN,
        )
        self.assertFalse(admin.can_vote())

    def test_member_can_vote(self):
        member = User.objects.create_user(
            cpm_number="CPM002",
            mc_number="secret",
            role=UserRole.MEMBER,
        )
        self.assertTrue(member.can_vote())

    def test_cpm_number_normalized_to_uppercase(self):
        user = User.objects.create_user(
            cpm_number="cpm003",
            mc_number="secret",
            role=UserRole.MEMBER,
        )
        self.assertEqual(user.cpm_number, "CPM003")
