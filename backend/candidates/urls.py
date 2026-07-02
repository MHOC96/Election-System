from django.urls import path

from candidates.views import (
    CandidateClearAllView,
    CandidateDetailView,
    CandidateListCreateView,
    CandidatePhotoUploadView,
)

urlpatterns = [
    path("upload-photo/", CandidatePhotoUploadView.as_view(), name="candidates-upload-photo"),
    path("clear-all/", CandidateClearAllView.as_view(), name="candidates-clear-all"),
    path("", CandidateListCreateView.as_view(), name="candidates-list-create"),
    path("<int:pk>/", CandidateDetailView.as_view(), name="candidates-detail"),
]
