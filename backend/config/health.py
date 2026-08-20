from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from django.views import View


class HealthLiveView(View):
    """Liveness probe — 200 when Django is serving. Use for Railway deploy healthchecks."""

    def get(self, request):
        return JsonResponse({"status": "ok"})


class HealthView(View):
    """Readiness probe — checks database and cache (may return 503 when degraded)."""

    def get(self, request):
        checks: dict[str, str] = {}

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            checks["database"] = "ok"
        except Exception:
            checks["database"] = "error"

        try:
            cache.set("health:ping", "1", timeout=5)
            checks["cache"] = "ok" if cache.get("health:ping") == "1" else "error"
        except Exception:
            checks["cache"] = "error"

        healthy = all(value == "ok" for value in checks.values())
        return JsonResponse(
            {"status": "ok" if healthy else "degraded", "checks": checks},
            status=200 if healthy else 503,
        )
