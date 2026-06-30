from django.contrib.auth.backends import ModelBackend

from accounts.models import User


class CPMNumberAuthBackend(ModelBackend):
    def authenticate(self, request, cpm_number=None, password=None, **kwargs):
        if cpm_number is None or password is None:
            return None

        cpm_number = cpm_number.strip().upper()

        try:
            user = User.objects.get(cpm_number=cpm_number)
        except User.DoesNotExist:
            User().set_password(password)
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
