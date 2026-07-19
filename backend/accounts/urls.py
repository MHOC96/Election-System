from django.conf import settings
from django.urls import path
import sys

from accounts.views import (
    AdminOnlyProbeView,
    ChangePasswordView,
    LoginView,
    LogoutView,
    MeView,
    MemberOnlyProbeView,
    RefreshView,
)

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
]

if settings.DEBUG or "test" in sys.argv:
    urlpatterns += [
        path("probe/admin/", AdminOnlyProbeView.as_view(), name="auth-probe-admin"),
        path("probe/member/", MemberOnlyProbeView.as_view(), name="auth-probe-member"),
    ]
