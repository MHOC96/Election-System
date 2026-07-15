from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, UserRole
from positions.models import Position


class PositionAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            cpm_number="ADM100",
            mc_number="admin-pass",
            role=UserRole.ADMIN,
            is_staff=True,
        )
        self.member = User.objects.create_user(
            cpm_number="CPM100",
            mc_number="member-pass",
            role=UserRole.MEMBER,
        )
        self.position = Position.objects.create(name="President")

    def _login(self, cpm_number, mc_number):
        response = self.client.post(
            reverse("auth-login"),
            {"cpm_number": cpm_number, "mc_number": mc_number},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['data']['access']}"
        )

    def test_member_can_list_positions(self):
        self._login("CPM100", "member-pass")
        response = self.client.get(reverse("positions-list-create"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(len(response.data["data"]["results"]), 1)

    def test_member_cannot_create_position(self):
        self._login("CPM100", "member-pass")
        response = self.client.post(
            reverse("positions-list-create"),
            {"name": "Secretary"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_position(self):
        self._login("ADM100", "admin-pass")
        response = self.client.post(
            reverse("positions-list-create"),
            {"name": "Treasurer"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["name"], "Treasurer")

    def test_duplicate_name_rejected(self):
        self._login("ADM100", "admin-pass")
        response = self.client.post(
            reverse("positions-list-create"),
            {"name": "president"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_update_position(self):
        self._login("ADM100", "admin-pass")
        response = self.client.patch(
            reverse("positions-detail", kwargs={"pk": self.position.pk}),
            {"name": "Vice President"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.position.refresh_from_db()
        self.assertEqual(self.position.name, "Vice President")

    def test_admin_can_delete_position(self):
        self._login("ADM100", "admin-pass")
        response = self.client.delete(
            reverse("positions-detail", kwargs={"pk": self.position.pk}),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Position.objects.filter(pk=self.position.pk).exists())

    def test_empty_name_rejected(self):
        self._login("ADM100", "admin-pass")
        response = self.client.post(
            reverse("positions-list-create"),
            {"name": "   "},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_access_denied(self):
        response = self.client.get(reverse("positions-list-create"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_reads_and_writes_positions_cache(self):
        from unittest.mock import patch

        cached_payload = {
            "count": 1,
            "next": None,
            "previous": None,
            "results": [{"id": self.position.id, "name": "President"}],
        }
        self._login("ADM100", "admin-pass")

        with (
            patch("positions.views.get_cached_positions_list", return_value=None),
            patch("positions.views.set_cached_positions_list") as set_cache,
        ):
            response = self.client.get(reverse("positions-list-create"))
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            set_cache.assert_called_once()

        with patch(
            "positions.views.get_cached_positions_list",
            return_value=cached_payload,
        ):
            response = self.client.get(reverse("positions-list-create"))
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data["data"], cached_payload)

    def test_create_bumps_positions_list_cache(self):
        from unittest.mock import patch

        self._login("ADM100", "admin-pass")
        with patch("positions.views.bump_positions_list_cache") as bump_cache:
            response = self.client.post(
                reverse("positions-list-create"),
                {"name": "Treasurer"},
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        bump_cache.assert_called_once()


class PositionModelTestCase(TestCase):
    def test_name_stripped_on_save(self):
        position = Position.objects.create(name="  Secretary  ")
        self.assertEqual(position.name, "Secretary")

    def test_has_dependencies_false_without_relations(self):
        position = Position.objects.create(name="President")
        self.assertFalse(position.has_dependencies())
