"""Vercel WSGI entrypoint (re-exports Django application)."""

from config.wsgi import application

__all__ = ["application"]
