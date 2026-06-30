from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserRole(models.TextChoices):
    ADMIN = "ADMIN", "Admin"
    MEMBER = "MEMBER", "Member"


class UserManager(BaseUserManager):
    def create_user(self, cpm_number, mc_number, role=UserRole.MEMBER, **extra_fields):
        if not cpm_number:
            raise ValueError("CPM Number is required.")
        if not mc_number:
            raise ValueError("MC Number is required.")

        cpm_number = cpm_number.strip().upper()
        user = self.model(cpm_number=cpm_number, mc_number=mc_number, role=role, **extra_fields)
        user.set_password(mc_number)
        user.save(using=self._db)
        return user

    def create_superuser(self, cpm_number, mc_number, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", UserRole.ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(cpm_number, mc_number, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    cpm_number = models.CharField(max_length=50, unique=True, db_index=True)
    mc_number = models.CharField(max_length=100, blank=True, default="")
    role = models.CharField(
        max_length=10,
        choices=UserRole.choices,
        default=UserRole.MEMBER,
        db_index=True,
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "cpm_number"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        ordering = ["cpm_number"]
        indexes = [
            models.Index(fields=["role", "is_active"]),
        ]

    def __str__(self):
        return self.cpm_number

    @property
    def is_admin(self):
        return self.role == UserRole.ADMIN

    @property
    def is_member(self):
        return self.role == UserRole.MEMBER

    def can_vote(self):
        return self.is_active and self.is_member
