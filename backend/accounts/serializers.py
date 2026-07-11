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

        if user is None:
            try:
                db_user = User.objects.get(cpm_number=cpm_number)
                if db_user.has_changed_password and db_user.mc_number == mc_number:
                    raise AuthenticationFailed("You have changed your password. Please use your updated password.")
            except User.DoesNotExist:
                pass
            raise AuthenticationFailed("Invalid CPM Number or Password.")
            
        if not user.is_active:
            raise AuthenticationFailed("Invalid CPM Number or Password.")

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
        fields = ("id", "cpm_number", "mc_number", "role", "is_active", "created_at", "has_changed_password", "academic_year")
        read_only_fields = fields


class ChangePasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True, min_length=6)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs
