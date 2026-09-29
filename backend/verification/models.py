from django.db import models
from django.db.models import TextChoices


class VerificationSession(models.Model):
    """A face + ID verification run. The laptop creates a session (getting a
    short code), the phone submits captured frames through the QR bridge, and
    the backend runs liveness + face matching against the ID photo."""

    class Status(TextChoices):
        WAITING = 'waiting', 'Waiting for phone'
        PROCESSING = 'processing', 'Processing'
        DONE = 'done', 'Done'
        FAILED = 'failed', 'Failed'

    user = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, related_name='verification_sessions'
    )
    code = models.CharField(max_length=16, unique=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.WAITING
    )
    id_type = models.CharField(max_length=20, blank=True, default='')
    selfie_frame = models.BinaryField(null=True, blank=True)
    id_image = models.BinaryField(null=True, blank=True)
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
        return f'{self.code} ({self.status})'