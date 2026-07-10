from django.urls import path

from voting.views import (
    ActiveElectionView,
    DraftElectionView,
    BallotView,
    ElectionArchiveView,
    ElectionDetailView,
    ElectionListCreateView,
    ElectionScheduleView,
    ElectionStartVotingView,
    ElectionPublishResultsView,
    OngoingElectionView,
    PublishedResultsView,
    MyVoteStatusView,
    VoteSubmitView,
)

urlpatterns = [
    path("", ElectionListCreateView.as_view(), name="elections-list-create"),
    path("active/", ActiveElectionView.as_view(), name="elections-active"),
    path("ongoing/", OngoingElectionView.as_view(), name="elections-ongoing"),
    path("draft/", DraftElectionView.as_view(), name="elections-draft"),
    path("published-results/", PublishedResultsView.as_view(), name="elections-published-results"),
    path("<int:pk>/", ElectionDetailView.as_view(), name="elections-detail"),
    path("<int:pk>/schedule/", ElectionScheduleView.as_view(), name="elections-schedule"),
    path("<int:pk>/start-voting/", ElectionStartVotingView.as_view(), name="elections-start-voting"),
    path("<int:pk>/publish-results/", ElectionPublishResultsView.as_view(), name="elections-publish-results"),
    path("<int:pk>/archive/", ElectionArchiveView.as_view(), name="elections-archive"),
]
