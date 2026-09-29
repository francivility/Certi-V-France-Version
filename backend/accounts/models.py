from django.contrib.auth.models import AbstractUser
from django.db import models
from core.models import Role


class User(AbstractUser):
    role = models.ForeignKey(Role, on_delete=models.PROTECT, null=True)
    contact_no = models.CharField(max_length=20, blank=True)
    google_id = models.CharField(max_length=64, blank=True, default='', db_index=True)

    def __str__(self):
        return self.username


class VerificationStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    VERIFIED = 'verified', 'Verified'
    FAILED = 'failed', 'Failed'


class ApplicantProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    business_name = models.CharField(max_length=200)
    address = models.CharField(max_length=255, blank=True)
    tin = models.CharField(max_length=20, blank=True)
    biometric_verification_status = models.CharField(
        max_length=10, choices=VerificationStatus.choices, default=VerificationStatus.PENDING
    )

    def __str__(self):
        return self.business_name


class PendingRegistration(models.Model):
    """In-progress registration staged server-side so no real User or
    ApplicantProfile row exists until face + ID verification succeeds.
    Keyed by the same short code used for the QR verification bridge."""

    class Status(models.TextChoices):
        WAITING = 'waiting', 'Waiting for verification'
        PROCESSING = 'processing', 'Processing'
        VERIFIED = 'verified', 'Verified'
        FAILED = 'failed', 'Failed'

    code = models.CharField(max_length=16, unique=True)
    token_hash = models.CharField(max_length=64, unique=True)
    username = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    password_hash = models.CharField(max_length=256)
    google_id = models.CharField(max_length=64, blank=True, default='')
    business_name = models.CharField(max_length=200, blank=True)
    address = models.CharField(max_length=255, blank=True)
    tin = models.CharField(max_length=20, blank=True)

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.WAITING
    )
    id_type = models.CharField(max_length=20, blank=True, default='')
    blink_count = models.PositiveSmallIntegerField(default=0)
    face_detected = models.BooleanField(default=False)
    match_score = models.FloatField(null=True, blank=True)
    match_passed = models.BooleanField(null=True, blank=True)
    error_message = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.username} ({self.code}: {self.status})'