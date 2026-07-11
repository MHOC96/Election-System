from django.contrib import admin

from audit.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "action", "actor", "ip_address")
    list_filter = ("action", "timestamp")
    search_fields = ("actor__cpm_number", "metadata")
    readonly_fields = ("actor", "action", "timestamp", "ip_address", "metadata")
    ordering = ("-timestamp",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
