from django.db import models
from applications.models import Application
from accounts.models import User


class HearingSlot(models.Model):
    """A bookable hearing time slot on a specific date.
    A slot row is created for each available time on a date; when booked it is
    linked (one-to-one) to a Hearing. Only one hearing per date+time is allowed."""
    date = models.DateField()
    time = models.TimeField()
    hearing = models.OneToOneField(
        'Hearing', on_delete=models.SET_NULL, null=True, blank=True, related_name='slot'
    )
    is_reserved = models.BooleanField(
        default=False, help_text='Block this slot (e.g. for LTO/LTFRB activities).'
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['date', 'time'], name='unique_hearing_slot_per_datetime'),
        ]
        ordering = ['date', 'time']

    def __str__(self):
        state = 'Reserved' if self.is_reserved else ('Booked' if self.hearing_id else 'Open')
        return f"Slot {self.date} {self.time:%H:%M} — {state}"


class Hearing(models.Model):
    application = models.OneToOneField(Application, on_delete=models.CASCADE, related_name='hearing')
    hearing_date = models.DateField()
    hearing_time = models.TimeField(null=True, blank=True)
    scheduled_by = models.ForeignKey(User, on_delete=models.PROTECT)
    scheduled_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        time_str = self.hearing_time.strftime('%H:%M') if self.hearing_time else 'TBA'
        return f"Hearing for Application #{self.application_id} on {self.hearing_date} {time_str}"


class NoticeOfHearing(models.Model):
    hearing = models.OneToOneField(Hearing, on_delete=models.CASCADE, related_name='notice')
    content = models.TextField()
    drafted_by = models.ForeignKey(User, on_delete=models.PROTECT)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Structured NOH fields (mirror the a–p form fields on the Notice of Hearing page).
    applicant_name = models.CharField(max_length=200, blank=True)
    applicant_address = models.CharField(max_length=255, blank=True)
    applicant_email = models.EmailField(blank=True)
    case_or_docket_number = models.CharField(max_length=50, blank=True)
    date_of_filing = models.DateField(null=True, blank=True)
    nature_of_application = models.CharField(max_length=255, blank=True)
    route_or_area = models.CharField(max_length=255, blank=True)
    service_applied_for = models.CharField(max_length=255, blank=True)
    units_applied_for = models.CharField(max_length=50, blank=True)
    hearing_date = models.DateField(null=True, blank=True)
    hearing_time_label = models.CharField(max_length=30, blank=True)
    venue_or_platform = models.CharField(max_length=255, blank=True)
    opposition_period = models.CharField(max_length=255, blank=True)
    opposition_address = models.CharField(max_length=500, blank=True)
    foe_period = models.CharField(max_length=255, blank=True)
    foe_address = models.CharField(max_length=500, blank=True)
    hearing_officer = models.CharField(max_length=200, blank=True, help_text='Hearing Officer who will preside.')
    # Immutable files created from the official CERTIV_NOH template when the
    # Legal Officer sends the notice. These are not rebuilt on every download.
    document_docx = models.FileField(upload_to='notices/', blank=True)
    document_pdf = models.FileField(upload_to='notices/', blank=True)

    def __str__(self):
        return f"Notice for Hearing #{self.hearing_id}"
    
class DecisionType(models.TextChoices):
    APPROVED = 'approved', 'Approved'
    NOT_APPROVED = 'not_approved', 'Not Approved'


class DecisionOrderStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    PENDING_CTDO = 'pending_ctdo', 'Pending CTDO Endorsement'
    PENDING_ORD = 'pending_ord', 'Pending ORD Approval'
    FINALIZED = 'finalized', 'Finalized'


class DecisionOrder(models.Model):
    application = models.OneToOneField(Application, on_delete=models.CASCADE, related_name='decision_order')
    decision_type = models.CharField(max_length=15, choices=DecisionType.choices)
    content = models.TextField()
    status = models.CharField(max_length=15, choices=DecisionOrderStatus.choices, default=DecisionOrderStatus.DRAFT)

    drafted_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='drafted_decisions')
    drafted_at = models.DateTimeField(auto_now_add=True)

    ctdo_endorsed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='ctdo_endorsed_decisions')
    ctdo_endorsed_at = models.DateTimeField(null=True, blank=True)

    ord_approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='ord_approved_decisions')
    ord_approved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Decision/Order for Application #{self.application_id}"
