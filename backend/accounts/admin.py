from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from accounts.models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("cpm_number",)
    list_display = ("cpm_number", "role", "is_active", "is_staff", "created_at")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("cpm_number",)

    fieldsets = (
        (None, {"fields": ("cpm_number", "password")}),
        ("Role & Status", {"fields": ("role", "is_active", "is_staff", "is_superuser")}),
        ("Permissions", {"fields": ("groups", "user_permissions")}),
        ("Timestamps", {"fields": ("last_login", "created_at", "updated_at")}),
    )
    readonly_fields = ("created_at", "updated_at", "last_login")

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("cpm_number", "password1", "password2", "role", "is_staff", "is_superuser"),
            },
        ),
    )

    def get_readonly_fields(self, request, obj=None):
        if obj:
            return self.readonly_fields
        return ()
