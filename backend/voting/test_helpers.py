"""Shared election fixtures for phased-lifecycle tests."""

from datetime import timedelta

from django.utils import timezone

from voting.models import Election, ElectionStatus


def create_draft_election(**overrides) -> Election:
    defaults = {"name": "Draft Election", "status": ElectionStatus.DRAFT}
    defaults.update(overrides)
    return Election.objects.create(**defaults)


def create_scheduled_election(**overrides) -> Election:
    now = timezone.now()
    defaults = {
        "name": "Scheduled Election",
        "status": ElectionStatus.SCHEDULED,
        "application_start_at": now + timedelta(days=1),
        "application_end_at": now + timedelta(days=7),
    }
    defaults.update(overrides)
    return Election.objects.create(**defaults)


def create_applications_open_election(**overrides) -> Election:
    now = timezone.now()
    defaults = {
        "name": "Applications Election",
        "status": ElectionStatus.SCHEDULED,
        "application_start_at": now - timedelta(hours=1),
        "application_end_at": now + timedelta(hours=2),
    }
    defaults.update(overrides)
    return Election.objects.create(**defaults)


def create_voting_open_election(**overrides) -> Election:
    now = timezone.now()
    defaults = {
        "name": "Voting Election",
        "status": ElectionStatus.SCHEDULED,
        "application_start_at": now - timedelta(days=7),
        "application_end_at": now - timedelta(days=1),
        "voting_started": True,
        "voting_start_at": now - timedelta(hours=1),
        "voting_end_at": now + timedelta(hours=2),
    }
    defaults.update(overrides)
    return Election.objects.create(**defaults)


def create_voting_closed_election(**overrides) -> Election:
    now = timezone.now()
    defaults = {
        "name": "Closed Voting Election",
        "status": ElectionStatus.SCHEDULED,
        "application_start_at": now - timedelta(days=14),
        "application_end_at": now - timedelta(days=7),
        "voting_started": True,
        "voting_start_at": now - timedelta(days=3),
        "voting_end_at": now - timedelta(hours=1),
    }
    defaults.update(overrides)
    return Election.objects.create(**defaults)


def create_archived_election(**overrides) -> Election:
    defaults = {
        "name": "Archived Election",
        "status": ElectionStatus.ARCHIVED,
        "results_published": True,
    }
    defaults.update(overrides)
    return Election.objects.create(**defaults)
