from django.urls import path

from voting.views import BallotView, MyVoteStatusView, VoteSubmitView

urlpatterns = [
    path("", VoteSubmitView.as_view(), name="votes-submit"),
    path("my-status/", MyVoteStatusView.as_view(), name="votes-my-status"),
    path("ballot/", BallotView.as_view(), name="votes-ballot"),
]
