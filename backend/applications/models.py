from django.db import models
from accounts.models import ApplicantProfile, User
from core.models import CPCType, RequirementType


class ApplicationStatus(models.TextChoices):
    PENDING_UPLOAD = 'pending_upload', 'Pending Upload'
    PENDING_RECEIVING = 'pending_receiving', 'Pending Receiving'
    NEEDS_CORRECTION = 'needs_correction', 'Needs Correction'
    PENDING_CTDO = 'pending_ctdo', 'Pending CTDO Validation'
    PENDING_ASSESSMENT = 'pending_assessment', 'Pending Assessment'
    PENDING_PAYMENT = 'pending_payment', 'Pending Payment'
    PENDING_LEGAL = 'pending_legal', 'Pending Legal'
    PENDING_HEARING = 'pending_hearing', 'Pending Hearing'
    PENDING_CTDO_ENDORSEMENT = 'pending_ctdo_endorsement', 'Pending CTDO Endorsement'
    PENDING_ORD = 'pending_ord', 'Pending ORD Approval'
    APPROVED = 'approved', 'Approved'
    NOT_APPROVED = 'not_approved', 'Not Approved'
    DISMISSED = 'dismissed', 'Dismissed'
    OVERDUE = 'overdue', 'Overdue'
    EXPIRED = 'expired', 'Expired (Invalid)'


class Application(models.Model):
    applicant_profile = models.ForeignKey(ApplicantProfile, on_delete=models.PROTECT)
    cpc_type = models.ForeignKey(CPCType, on_delete=models.PROTECT)
    plate_number = models.CharField(max_length=20, blank=True)
    status = models.CharField(
        max_length=30, choices=ApplicationStatus.choices, default=ApplicationStatus.PENDING_UPLOAD
    )
    docket_number = models.CharField(max_length=50, blank=True, null=True)
    case_number = models.CharField(max_length=50, blank=True, null=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Application #{self.id} - {self.cpc_type}"


class OCRStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    VERIFIED = 'verified', 'Verified'
    REJECTED = 'rejected', 'Rejected'


class ReceivingReviewStatus(models.TextChoices):
    UNCHECKED = 'unchecked', 'Unchecked'
    GOOD = 'good', 'Good'
    NOT_GOOD = 'not_good', 'Not Good'


class UploadedDocument(models.Model):
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='documents')
    requirement_type = models.ForeignKey(RequirementType, on_delete=models.PROTECT)
    file = models.FileField(upload_to='documents/')
    ocr_status = models.CharField(max_length=10, choices=OCRStatus.choices, default=OCRStatus.PENDING)
    flag_remarks = models.TextField(blank=True, null=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    receiving_review_status = models.CharField(
        max_length=20, choices=ReceivingReviewStatus.choices,
        default=ReceivingReviewStatus.UNCHECKED
    )
    receiving_review_remarks = models.TextField(blank=True, null=True)
    is_resubmitted = models.BooleanField(default=False)

    class Meta:
        unique_together = ('application', 'requirement_type')


class ApplicationDraft(models.Model):
    """An in-progress CPC application that has NOT yet been submitted.
    A real Application (with its application number) is only created from a
    draft once the applicant has uploaded ALL requirements and submits."""
    applicant_profile = models.ForeignKey(ApplicantProfile, on_delete=models.CASCADE, related_name='drafts')
    cpc_type = models.ForeignKey(CPCType, on_delete=models.PROTECT)
    plate_number = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Draft #{self.id} - {self.cpc_type}"


class DraftDocument(models.Model):
    """A single requirement file uploaded to an in-progress draft."""
    draft = models.ForeignKey(ApplicationDraft, on_delete=models.CASCADE, related_name='documents')
    requirement_type = models.ForeignKey(RequirementType, on_delete=models.PROTECT)
    file = models.FileField(upload_to='drafts/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('draft', 'requirement_type')


class QrBridgeUpload(models.Model):
    """A transient image uploaded from a phone while scanning a QR Bridge code.
    The laptop polls its own code, downloads the image, attaches it to the
    requirement, then marks this row consumed."""
    code = models.CharField(max_length=64, db_index=True)
    image = models.BinaryField()
    filename = models.CharField(max_length=255, blank=True, default='capture.jpg')
    content_type = models.CharField(max_length=100, blank=True, default='image/jpeg')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class ApplicationStatusLog(models.Model):
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='status_logs')
    status = models.CharField(max_length=50)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    remarks = models.TextField(blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    application = models.ForeignKey(
        Application, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True
    )
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']