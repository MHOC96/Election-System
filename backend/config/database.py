"""Database configuration with pool-mode aware connection reuse."""

from __future__ import annotations

import logging
import sys
from typing import Any

from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)

VALID_POOL_MODES = frozenset({"session", "transaction"})


def resolve_pool_mode(*, port: str | int | None, explicit: str) -> str:
    """Infer PgBouncer pool mode from env override or connection port."""
    normalized = (explicit or "").strip().lower()
    if normalized:
        if normalized not in VALID_POOL_MODES:
            raise ImproperlyConfigured(
                f"DB_POOL_MODE must be 'session' or 'transaction', got '{explicit}'."
            )
        return normalized
    if str(port or "") == "6543":
        return "transaction"
    return "session"


def apply_connection_pool_settings(
    db_config: dict[str, Any],
    env,
    *,
    is_test: bool,
    debug: bool,
) -> None:
    """Apply Django connection reuse settings based on pool mode."""
    port = db_config.get("PORT")
    pool_mode = resolve_pool_mode(port=port, explicit=env("DB_POOL_MODE", default=""))

    options = db_config.setdefault("OPTIONS", {})
    options.setdefault("sslmode", env("DB_SSLMODE", default="require"))
    options.setdefault("connect_timeout", env.int("DB_CONNECT_TIMEOUT", default=10))

    if pool_mode == "transaction":
        db_config["CONN_MAX_AGE"] = 0
        db_config["DISABLE_SERVER_SIDE_CURSORS"] = True
        db_config.pop("CONN_HEALTH_CHECKS", None)
    else:
        default_max_age = 0 if is_test else 60
        max_age = env.int("DB_CONN_MAX_AGE", default=default_max_age)
        db_config["CONN_MAX_AGE"] = max_age
        if max_age:
            db_config["CONN_HEALTH_CHECKS"] = env.bool("DB_CONN_HEALTH_CHECKS", default=True)
        else:
            db_config.pop("CONN_HEALTH_CHECKS", None)

    if (
        not is_test
        and not debug
        and pool_mode == "session"
        and str(port) == "5432"
    ):
        logger.warning(
            "Database uses session pool mode (port 5432). Supabase session poolers "
            "are typically limited to ~15 concurrent connections. For 50+ concurrent "
            "users, switch to transaction pooler (port 6543) with DB_POOL_MODE=transaction."
        )


def build_databases(env) -> dict[str, Any]:
    """Build DATABASES dict with production-friendly connection pooling."""
    is_test = "test" in sys.argv
    debug = env.bool("DEBUG", default=False)

    session_url = env("DATABASE_SESSION_URL", default="").strip()
    database_url = env("DATABASE_URL", default="").strip()

    if session_url:
        db_config = env.db_url(session_url)
        databases = {"default": db_config}
        apply_connection_pool_settings(
            databases["default"],
            env,
            is_test=is_test,
            debug=debug,
        )
        return databases

    if database_url:
        databases = {"default": env.db("DATABASE_URL")}
        apply_connection_pool_settings(
            databases["default"],
            env,
            is_test=is_test,
            debug=debug,
        )
        return databases

    databases = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("DB_NAME"),
            "USER": env("DB_USER"),
            "PASSWORD": env("DB_PASSWORD"),
            "HOST": env("DB_HOST", default="localhost"),
            "PORT": env("DB_PORT", default="5432"),
            "OPTIONS": {
                "connect_timeout": env.int("DB_CONNECT_TIMEOUT", default=10),
            },
        }
    }
    apply_connection_pool_settings(
        databases["default"],
        env,
        is_test=is_test,
        debug=debug,
    )
    return databases
