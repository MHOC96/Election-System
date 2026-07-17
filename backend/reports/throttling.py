from rest_framework.throttling import UserRateThrottle


class ReportExportRateThrottle(UserRateThrottle):
    scope = "report_export"
