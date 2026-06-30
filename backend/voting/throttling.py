from rest_framework.throttling import UserRateThrottle


class VoteRateThrottle(UserRateThrottle):
    scope = "vote"
