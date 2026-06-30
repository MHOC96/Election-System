from django.contrib import admin

from audit.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "actor", "ip_address", "created_at")
    list_filter = ("action", "created_at")
    search_fields = ("actor__cpm_number", "action", "ip_address")
    ordering = ("-created_at",)
    readonly_fields = ("actor", "action", "ip_address", "metadata", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
