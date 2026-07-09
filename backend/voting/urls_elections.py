from django.urls import path

from voting.views import (
    ActiveElectionView,
    DraftElectionView,
    BallotView,
    ElectionCloseView,
    ElectionDetailView,
    ElectionListCreateView,
    ElectionStartView,
    ElectionStopView,
    MyVoteStatusView,
    VoteSubmitView,
)

urlpatterns = [
    path("", ElectionListCreateView.as_view(), name="elections-list-create"),
    path("active/", ActiveElectionView.as_view(), name="elections-active"),
    path("draft/", DraftElectionView.as_view(), name="elections-draft"),
    path("<int:pk>/", ElectionDetailView.as_view(), name="elections-detail"),
    path("<int:pk>/start/", ElectionStartView.as_view(), name="elections-start"),
    path("<int:pk>/stop/", ElectionStopView.as_view(), name="elections-stop"),
    path("<int:pk>/close/", ElectionCloseView.as_view(), name="elections-close"),
]
