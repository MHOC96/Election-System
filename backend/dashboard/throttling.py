from rest_framework.throttling import UserRateThrottle


class DashboardPollRateThrottle(UserRateThrottle):
    scope = "dashboard_poll"
