from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from django.views import View


class HealthView(View):
    """Liveness/readiness probe for load balancers and deploy hooks."""

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
