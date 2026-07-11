from django.urls import path

from candidates.views import (
    CandidateClearAllView,
    CandidateDetailView,
    CandidateListCreateView,
    CandidateModificationStatusView,
    CandidatePhotoUploadView,
)

from candidates.application_views import (
    MemberApplicationListCreateView,
    AdminApplicationListView,
    AdminApplicationReviewView,
    CandidateApplicationDocumentUploadView,
    CandidateApplicationPhotoUploadView,
)

urlpatterns = [
    # Applications
    path("applications/me/", MemberApplicationListCreateView.as_view(), name="applications-me"),
    path("applications/upload-document/", CandidateApplicationDocumentUploadView.as_view(), name="applications-upload-document"),
    path("applications/upload-photo/", CandidateApplicationPhotoUploadView.as_view(), name="applications-upload-photo"),
    path("applications/all/", AdminApplicationListView.as_view(), name="applications-all"),
    path("applications/<int:pk>/review/", AdminApplicationReviewView.as_view(), name="applications-review"),
    
    # Candidates
    path("modification-status/", CandidateModificationStatusView.as_view(), name="candidates-modification-status"),
    path("upload-photo/", CandidatePhotoUploadView.as_view(), name="candidates-upload-photo"),
    path("clear-all/", CandidateClearAllView.as_view(), name="candidates-clear-all"),
    path("", CandidateListCreateView.as_view(), name="candidates-list-create"),
    path("<int:pk>/", CandidateDetailView.as_view(), name="candidates-detail"),
]
