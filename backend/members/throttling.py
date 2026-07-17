from rest_framework.throttling import UserRateThrottle


class MemberImportRateThrottle(UserRateThrottle):
    scope = "member_import"
