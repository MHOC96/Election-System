from django.urls import path

from voting.views import (
    ActiveElectionView,
    DraftElectionView,
    BallotView,
    ElectionArchiveView,
    ElectionDetailView,
    ElectionListCreateView,
    ElectionScheduleView,
    ElectionPublishResultsView,
    MyVoteStatusView,
    VoteSubmitView,
)

urlpatterns = [
    path("", ElectionListCreateView.as_view(), name="elections-list-create"),
    path("active/", ActiveElectionView.as_view(), name="elections-active"),
    path("draft/", DraftElectionView.as_view(), name="elections-draft"),
    path("<int:pk>/", ElectionDetailView.as_view(), name="elections-detail"),
    path("<int:pk>/schedule/", ElectionScheduleView.as_view(), name="elections-schedule"),
    path("<int:pk>/publish-results/", ElectionPublishResultsView.as_view(), name="elections-publish-results"),
    path("<int:pk>/archive/", ElectionArchiveView.as_view(), name="elections-archive"),
]
