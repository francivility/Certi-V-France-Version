from django.db import models
from applications.models import Application
from accounts.models import User
from core.models import Fee


class PaymentStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    PAID = 'paid', 'Paid'
    DELAYED = 'delayed', 'Delayed'


class PaymentMethod(models.TextChoices):
    ONLINE = 'online', 'Online (Simulated)'
    F2F = 'f2f', 'Face-to-Face (Cash)'


class StatementOfAccount(models.Model):
    application = models.OneToOneField(Application, on_delete=models.CASCADE, related_name='soa')
    control_number = models.CharField(max_length=30, unique=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    expiry_date = models.DateField()
    issued_by = models.ForeignKey(User, on_delete=models.PROTECT)
    issued_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.control_number


class SOAItem(models.Model):
    soa = models.ForeignKey(StatementOfAccount, on_delete=models.CASCADE, related_name='items')
    fee = models.ForeignKey(Fee, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    amount = models.DecimalField(max_digits=10, decimal_places=2)


class PaymentMethodChoice(models.TextChoices):
    ONLINE = 'online', 'Online'
    ONSITE = 'onsite', 'On-site'
    F2F = 'f2f', 'Face-to-Face (Cash)'


class Payment(models.Model):
    application = models.OneToOneField(Application, on_delete=models.CASCADE, related_name='payment')
    soa = models.ForeignKey(StatementOfAccount, on_delete=models.PROTECT)
    method = models.CharField(max_length=10, choices=PaymentMethod.choices, blank=True)
    reference_no = models.CharField(max_length=100, blank=True)
    or_number = models.CharField(max_length=30, blank=True)
    status = models.CharField(max_length=10, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    due_date = models.DateField(null=True, blank=True)
    overdue = models.BooleanField(default=False)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    # --- Xendit integration fields ---
    xendit_invoice_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    xendit_invoice_url = models.URLField(max_length=500, blank=True, default='')
    xendit_status = models.CharField(max_length=20, blank=True, default='')