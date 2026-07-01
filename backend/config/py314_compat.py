"""Patches for running Django 5.1 on Python 3.14+."""

import sys


def apply_patches() -> None:
    if sys.version_info < (3, 14):
        return

    from django.template.context import BaseContext

    def _base_context_copy(self):
        duplicate = self.__class__.__new__(self.__class__)
        duplicate.__dict__ = self.__dict__.copy()
        duplicate.dicts = self.dicts[:]
        return duplicate

    BaseContext.__copy__ = _base_context_copy


apply_patches()
