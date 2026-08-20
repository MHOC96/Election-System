from datetime import timedelta
from pathlib import Path
import os
import sys

import environ

from config import py314_compat  # noqa: F401  — Django 5.1 + Python 3.14 admin fix
from config.database import build_databases

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    JWT_ACCESS_TOKEN_LIFETIME=(int, 30),
    JWT_REFRESH_TOKEN_LIFETIME=(int, 1440),
)

environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])
# Railway and other platforms probe liveness from internal hosts.
_ALLOW_INTERNAL_HOSTS = ("127.0.0.1", "localhost", "healthcheck.railway.app")
ALLOWED_HOSTS = list(dict.fromkeys([*ALLOWED_HOSTS, *_ALLOW_INTERNAL_HOSTS]))
if "test" in sys.argv and "testserver" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS = [*ALLOWED_HOSTS, "testserver"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "accounts",
    "members",
    "positions",
    "candidates",
    "voting",
    "dashboard",
    "reports",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.gzip.GZipMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = build_databases(env)

AUTH_USER_MODEL = "accounts.User"

AUTHENTICATION_BACKENDS = [
    "accounts.backends.CPMNumberAuthBackend",
    "django.contrib.auth.backends.ModelBackend",
]

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 4},
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True
CORS_PREFLIGHT_MAX_AGE = 86400

CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "accounts.authentication.CachedJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_CLASSES": (
        "config.throttling.SafeAnonRateThrottle",
        "config.throttling.SafeUserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min",
        "user": "120/min",
        "auth": "10/min",
        "auth_user": "5/min",
        "vote": "30/min",
        "application_upload": "15/min",
        "admin_upload": "15/min",
        "member_import": "5/min",
        "report_export": "10/min",
        "dashboard_poll": "180/min",
    },
    "EXCEPTION_HANDLER": "config.exceptions.custom_exception_handler",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

if "test" in sys.argv:
    REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []
    REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"].update(
        {
            "auth": "10000/min",
            "auth_user": "10000/min",
            "vote": "10000/min",
            "application_upload": "10000/min",
            "admin_upload": "10000/min",
            "member_import": "10000/min",
            "report_export": "10000/min",
            "dashboard_poll": "10000/min",
        }
    )

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env("JWT_ACCESS_TOKEN_LIFETIME")),
    "REFRESH_TOKEN_LIFETIME": timedelta(minutes=env("JWT_REFRESH_TOKEN_LIFETIME")),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# Cloudinary credentials (used in Milestone 4)
CLOUDINARY_CLOUD_NAME = env("CLOUDINARY_CLOUD_NAME", default="")
CLOUDINARY_API_KEY = env("CLOUDINARY_API_KEY", default="")
CLOUDINARY_API_SECRET = env("CLOUDINARY_API_SECRET", default="")

_redis_url = env("REDIS_URL", default="")
_is_test = "test" in sys.argv

if not DEBUG and not _is_test and not _redis_url:
    from django.core.exceptions import ImproperlyConfigured

    raise ImproperlyConfigured(
        "REDIS_URL must be set when DEBUG is False. "
        "LocMem cache is not shared across workers in production."
    )

if _redis_url:
    # Passed to redis.ConnectionPool.from_url (Django RedisCache backend).
    _redis_options: dict = {
        "socket_connect_timeout": 5,
        "socket_timeout": 5,
    }
    if _redis_url.startswith("rediss://"):
        import ssl

        # Upstash / managed Redis often use TLS; disable cert verify for pooler endpoints.
        _redis_options["ssl_cert_reqs"] = ssl.CERT_NONE
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": _redis_url,
            "OPTIONS": _redis_options,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "election-dashboard",
        }
    }

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    # Railway terminates TLS at the edge; internal health checks use HTTP on $PORT.
    _on_railway = bool(os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("RAILWAY_PUBLIC_DOMAIN"))
    SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=not _on_railway)
    SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31_536_000)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True)
    SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=False)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_SAMESITE = "Lax"
    CSRF_COOKIE_SAMESITE = "Lax"
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = "DENY"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": env("LOG_LEVEL", default="INFO"),
    },
    "loggers": {
        "django.request": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "django.security": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}

_WEAK_SECRET_KEYS = frozenset(
    {
        "change-me",
        "change-me-to-a-long-random-string",
        "dev",
        "secret",
        "django-insecure",
    }
)

if not _is_test and not DEBUG:
    from django.core.exceptions import ImproperlyConfigured

    if not SECRET_KEY or len(SECRET_KEY) < 50 or SECRET_KEY.lower() in _WEAK_SECRET_KEYS:
        raise ImproperlyConfigured(
            "SECRET_KEY must be a strong random string (50+ characters) when DEBUG=False."
        )

    if set(ALLOWED_HOSTS) <= {"localhost", "127.0.0.1", "testserver"}:
        raise ImproperlyConfigured(
            "Set ALLOWED_HOSTS to your production domain(s) when DEBUG=False."
        )

    if not CORS_ALLOWED_ORIGINS:
        raise ImproperlyConfigured(
            "CORS_ALLOWED_ORIGINS must list your frontend origin(s) when DEBUG=False."
        )
