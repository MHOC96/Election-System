from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User


class LoginSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    cpm_number = serializers.CharField()
    mc_number = serializers.CharField(write_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop("password", None)

    def validate(self, attrs):
        cpm_number = attrs.get("cpm_number", "").strip().upper()
        mc_number = attrs.get("mc_number", "")

        user = authenticate(
            request=self.context.get("request"),
            cpm_number=cpm_number,
            password=mc_number,
        )

        if user is None or not user.is_active:
            raise AuthenticationFailed("Invalid CPM Number or MC Number.")

        refresh = self.get_token(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data,
        }

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["cpm_number"] = user.cpm_number
        return token


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate_refresh(self, value):
        self.token = RefreshToken(value)
        return value

    def save(self, **kwargs):
        self.token.blacklist()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "cpm_number", "role", "is_active", "created_at")
        read_only_fields = fields
