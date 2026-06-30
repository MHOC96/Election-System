from django.urls import path

from accounts.views import (
    AdminOnlyProbeView,
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
    path("probe/admin/", AdminOnlyProbeView.as_view(), name="auth-probe-admin"),
    path("probe/member/", MemberOnlyProbeView.as_view(), name="auth-probe-member"),
]
