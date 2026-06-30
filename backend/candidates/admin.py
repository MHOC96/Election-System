from django.contrib import admin

from candidates.models import Candidate


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ("full_name", "academic_year", "position", "created_at")
    list_filter = ("academic_year", "position")
    search_fields = ("full_name",)
    ordering = ("full_name",)
