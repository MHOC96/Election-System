from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        logger.error(
            "Unhandled API exception: %s",
            exc,
            exc_info=True,
            extra={"view": repr(context.get("view"))},
        )
        return response

    if response.status_code >= status.HTTP_500_INTERNAL_SERVER_ERROR:
        logger.error(
            "API error %s: %s",
            response.status_code,
            exc,
            exc_info=True,
            extra={"view": repr(context.get("view"))},
        )

    error_code = "api_error"
    if hasattr(exc, "default_code"):
        error_code = exc.default_code

    details = response.data
    if isinstance(details, dict) and "detail" in details and len(details) == 1:
        message = str(details["detail"])
        details = None
    elif isinstance(details, dict):
        message = "Request validation failed."
    elif isinstance(details, list):
        message = "; ".join(str(item) for item in details)
        details = None
    else:
        message = str(details)
        details = None

    response.data = {
        "success": False,
        "error": {
            "code": error_code,
            "message": message,
            "details": details,
        },
    }
    return response


class AuthenticationFailedError(APIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Invalid CPM Number or MC Number."
    default_code = "authentication_failed"
