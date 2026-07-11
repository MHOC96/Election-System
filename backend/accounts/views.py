from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.models import User
from accounts.permissions import IsAdmin, IsMember
from accounts.serializers import LoginSerializer, LogoutSerializer, UserSerializer
from accounts.throttling import AuthRateThrottle
from audit.constants import AuditAction
from audit.services.audit_service import log_action


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        try:
            serializer.is_valid(raise_exception=True)
        except AuthenticationFailed:
            cpm_number = str(request.data.get("cpm_number", "")).strip().upper()
            log_action(
                action=AuditAction.LOGIN_FAILED,
                request=request,
                metadata={"cpm_number": cpm_number},
            )
            raise

        data = serializer.validated_data
        user_data = data["user"]
        user = User.objects.get(pk=user_data["id"])
        log_action(
            action=AuditAction.LOGIN_SUCCESS,
            request=request,
            actor=user,
            metadata={"cpm_number": user.cpm_number, "role": user.role},
        )

        return Response(
            {
                "success": True,
                "data": {
                    "access": data["access"],
                    "refresh": data["refresh"],
                    "user": user_data,
                },
            },
            status=status.HTTP_200_OK,
        )


class RefreshView(TokenRefreshView):
    throttle_classes = [AuthRateThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            return Response(
                {
                    "success": True,
                    "data": response.data,
                },
                status=status.HTTP_200_OK,
            )
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_action(action=AuditAction.LOGOUT, request=request, actor=request.user)
        return Response(
            {
                "success": True,
                "message": "Logged out successfully.",
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "success": True,
                "data": UserSerializer(request.user).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminOnlyProbeView(APIView):
    """Protected route to verify admin RBAC (Milestone 1)."""

    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(
            {
                "success": True,
                "message": "Admin access granted.",
            },
            status=status.HTTP_200_OK,
        )


class MemberOnlyProbeView(APIView):
    """Protected route to verify member RBAC (Milestone 1)."""

    permission_classes = [IsMember]

    def get(self, request):
        return Response(
            {
                "success": True,
                "message": "Member access granted.",
            },
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken

        from accounts.serializers import ChangePasswordSerializer

        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.has_changed_password = True
        user.save(update_fields=["password", "has_changed_password", "updated_at"])

        refresh_raw = serializer.validated_data.get("refresh")
        if refresh_raw:
            try:
                RefreshToken(refresh_raw).blacklist()
            except Exception:
                pass

        new_refresh = RefreshToken.for_user(user)
        log_action(action=AuditAction.PASSWORD_CHANGED, request=request, actor=user)

        return Response(
            {
                "success": True,
                "data": {
                    "access": str(new_refresh.access_token),
                    "refresh": str(new_refresh),
                    "user": UserSerializer(user).data,
                },
                "message": "Password updated successfully.",
            },
            status=status.HTTP_200_OK,
        )
