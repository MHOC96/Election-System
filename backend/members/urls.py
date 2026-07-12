from django.urls import path

from members.views import (
    MemberBulkDeleteView,
    MemberClearAllView,
    MemberDeletionStatusView,
    MemberDetailView,
    MemberImportStatusView,
    MemberImportView,
    MemberListView,
    MemberResetPasswordView,
)

urlpatterns = [
    path("import/<int:job_id>/", MemberImportStatusView.as_view(), name="members-import-status"),
    path("import/", MemberImportView.as_view(), name="members-import"),
    path("deletion-status/", MemberDeletionStatusView.as_view(), name="members-deletion-status"),
    path("clear-all/", MemberClearAllView.as_view(), name="members-clear-all"),
    path("bulk-delete/", MemberBulkDeleteView.as_view(), name="members-bulk-delete"),
    path("", MemberListView.as_view(), name="members-list"),
    path("<int:pk>/reset-password/", MemberResetPasswordView.as_view(), name="members-reset-password"),
    path("<int:pk>/", MemberDetailView.as_view(), name="members-detail"),
]
