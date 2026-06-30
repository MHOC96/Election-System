from django.urls import path

from reports.views import (
    CandidatesReportView,
    ParticipationReportView,
    ResultsReportView,
    TurnoutReportView,
)

urlpatterns = [
    path("results/", ResultsReportView.as_view(), name="reports-results"),
    path("candidates/", CandidatesReportView.as_view(), name="reports-candidates"),
    path("turnout/", TurnoutReportView.as_view(), name="reports-turnout"),
    path("participation/", ParticipationReportView.as_view(), name="reports-participation"),
]
