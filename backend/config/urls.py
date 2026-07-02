from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/members/", include("members.urls")),
    path("api/positions/", include("positions.urls")),
    path("api/candidates/", include("candidates.urls")),
    path("api/elections/", include("voting.urls_elections")),
    path("api/votes/", include("voting.urls_votes")),
    path("api/dashboard/", include("dashboard.urls")),
    path("api/reports/", include("reports.urls")),
]
