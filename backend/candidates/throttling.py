from rest_framework.throttling import UserRateThrottle


class ApplicationUploadRateThrottle(UserRateThrottle):
    scope = "application_upload"


class AdminUploadRateThrottle(UserRateThrottle):
    scope = "admin_upload"
