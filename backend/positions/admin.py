from django.contrib import admin

from positions.models import Position


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display = ("name", "created_at", "updated_at")
    search_fields = ("name",)
    ordering = ("name",)
