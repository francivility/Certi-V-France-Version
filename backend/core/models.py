from django.db import models

class Role(models.Model):
    role_name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.role_name


class CPCType(models.Model):
    type_name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    static_form_path = models.CharField(max_length=255, blank=True)
    digital_form_template = models.JSONField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.type_name


class RequirementType(models.Model):
    requirement_name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.requirement_name


class Fee(models.Model):
    fee_name = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    allow_quantity = models.BooleanField(default=True)

    def __str__(self):
        return self.fee_name