from django.urls import path

from members.views import MemberDetailView, MemberImportView, MemberListView

urlpatterns = [
    path("import/", MemberImportView.as_view(), name="members-import"),
    path("", MemberListView.as_view(), name="members-list"),
    path("<int:pk>/", MemberDetailView.as_view(), name="members-detail"),
]
