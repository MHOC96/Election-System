from django.urls import path

from dashboard.views import (
    DashboardOverviewView,
    DashboardSummaryView,
    LiveStatsView,
    PositionRankingsView,
)

urlpatterns = [
    path("overview/", DashboardOverviewView.as_view(), name="dashboard-overview"),
    path("summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
    path("live-stats/", LiveStatsView.as_view(), name="dashboard-live-stats"),
    path(
        "position/<int:position_id>/rankings/",
        PositionRankingsView.as_view(),
        name="dashboard-position-rankings",
    ),
]
