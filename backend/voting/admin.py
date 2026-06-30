from django.contrib import admin

from voting.models import Election, Vote


@admin.register(Election)
class ElectionAdmin(admin.ModelAdmin):
    list_display = ("name", "status", "started_at", "stopped_at", "closed_at", "created_at")
    list_filter = ("status",)
    search_fields = ("name",)
    ordering = ("-created_at",)


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ("member", "position", "candidate", "election", "created_at")
    list_filter = ("election", "position")
    search_fields = ("member__cpm_number", "candidate__full_name")
    ordering = ("-created_at",)
    readonly_fields = ("member", "position", "candidate", "election", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
