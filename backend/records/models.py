from django.db import models
from applications.models import Application
from accounts.models import User


class ClaimMethod(models.TextChoices):
    SOFT_COPY = 'soft_copy', 'Soft Copy (Download)'
    PICKUP = 'pickup', 'Claim In-Person'


class CPCRelease(models.Model):
    application = models.OneToOneField(Application, on_delete=models.CASCADE, related_name='release')
    claim_method = models.CharField(max_length=10, choices=ClaimMethod.choices)
    released_by = models.ForeignKey(User, on_delete=models.PROTECT)
    released_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Release for Application #{self.application_id}"