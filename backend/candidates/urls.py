from django.urls import path

from candidates.views import (
    CandidateDetailView,
    CandidateListCreateView,
    CandidatePhotoUploadView,
)

urlpatterns = [
    path("upload-photo/", CandidatePhotoUploadView.as_view(), name="candidates-upload-photo"),
    path("", CandidateListCreateView.as_view(), name="candidates-list-create"),
    path("<int:pk>/", CandidateDetailView.as_view(), name="candidates-detail"),
]
