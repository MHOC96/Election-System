from django.urls import path

from candidates.views import PositionCandidateListCreateView
from positions.views import PositionDetailView, PositionListCreateView

urlpatterns = [
    path("", PositionListCreateView.as_view(), name="positions-list-create"),
    path(
        "<int:position_id>/candidates/",
        PositionCandidateListCreateView.as_view(),
        name="position-candidates",
    ),
    path("<int:pk>/", PositionDetailView.as_view(), name="positions-detail"),
]
