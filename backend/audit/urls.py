from django.urls import path

from audit.views import AuditLogDetailView, AuditLogListView, AuditLogRecentView

urlpatterns = [
    path("recent/", AuditLogRecentView.as_view(), name="audit-logs-recent"),
    path("", AuditLogListView.as_view(), name="audit-logs-list"),
    path("<int:pk>/", AuditLogDetailView.as_view(), name="audit-logs-detail"),
]
