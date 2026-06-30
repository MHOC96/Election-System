from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.models import User
from accounts.permissions import IsAdmin, IsMember
from accounts.serializers import LoginSerializer, LogoutSerializer, UserSerializer
from accounts.throttling import AuthRateThrottle
from audit.models import AuditAction
from audit.services.logger import log_action


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = User.objects.get(pk=data["user"]["id"])
        log_action(
            request=request,
            action=AuditAction.LOGIN,
            actor=user,
            metadata={"cpm_number": user.cpm_number, "role": user.role},
        )
        return Response(
            {
                "success": True,
                "data": {
                    "access": data["access"],
                    "refresh": data["refresh"],
                    "user": data["user"],
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
        log_action(
            request=request,
            action=AuditAction.LOGOUT,
            actor=request.user,
            metadata={"cpm_number": request.user.cpm_number},
        )
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
