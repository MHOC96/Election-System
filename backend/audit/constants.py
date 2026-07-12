from django.db import models


class AuditAction(models.TextChoices):
    LOGIN_SUCCESS = "LOGIN_SUCCESS", "Login success"
    LOGIN_FAILED = "LOGIN_FAILED", "Login failed"
    LOGOUT = "LOGOUT", "Logout"
    PASSWORD_CHANGED = "PASSWORD_CHANGED", "Password changed"

    VOTE_SUBMITTED = "VOTE_SUBMITTED", "Vote submitted"

    ELECTION_CREATED = "ELECTION_CREATED", "Election created"
    ELECTION_UPDATED = "ELECTION_UPDATED", "Election updated"
    ELECTION_DELETED = "ELECTION_DELETED", "Election deleted"
    ELECTION_SCHEDULED = "ELECTION_SCHEDULED", "Election scheduled"
    ELECTION_VOTING_STARTED = "ELECTION_VOTING_STARTED", "Voting started"
    ELECTION_RESULTS_PUBLISHED = "ELECTION_RESULTS_PUBLISHED", "Results published"
    ELECTION_ARCHIVED = "ELECTION_ARCHIVED", "Election archived"

    MEMBER_IMPORTED = "MEMBER_IMPORTED", "Members imported"
    MEMBER_UPDATED = "MEMBER_UPDATED", "Member updated"
    MEMBER_PASSWORD_RESET = "MEMBER_PASSWORD_RESET", "Member password reset"
    MEMBER_DELETED = "MEMBER_DELETED", "Member deleted"
    MEMBERS_BULK_DELETED = "MEMBERS_BULK_DELETED", "Members bulk deleted"
    MEMBERS_CLEARED = "MEMBERS_CLEARED", "Members cleared"

    POSITION_CREATED = "POSITION_CREATED", "Position created"
    POSITION_UPDATED = "POSITION_UPDATED", "Position updated"
    POSITION_DELETED = "POSITION_DELETED", "Position deleted"

    CANDIDATE_CREATED = "CANDIDATE_CREATED", "Candidate created"
    CANDIDATE_UPDATED = "CANDIDATE_UPDATED", "Candidate updated"
    CANDIDATE_DELETED = "CANDIDATE_DELETED", "Candidate deleted"
    CANDIDATE_PHOTO_UPLOADED = "CANDIDATE_PHOTO_UPLOADED", "Candidate photo uploaded"

    APPLICATION_SUBMITTED = "APPLICATION_SUBMITTED", "Application submitted"
    APPLICATION_APPROVED = "APPLICATION_APPROVED", "Application approved"
    APPLICATION_REJECTED = "APPLICATION_REJECTED", "Application rejected"
