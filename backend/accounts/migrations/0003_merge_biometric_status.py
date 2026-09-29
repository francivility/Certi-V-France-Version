from django.db import migrations, models


def map_biometric_status(apps, schema_editor):
    """Copy the old pair of statuses into the single biometric field."""
    ApplicantProfile = apps.get_model('accounts', 'ApplicantProfile')
    for profile in ApplicantProfile.objects.all():
        verified = (
            profile.face_verification_status == 'verified'
            and profile.id_verification_status == 'verified'
        )
        profile.biometric_verification_status = 'verified' if verified else 'failed'
        profile.save(update_fields=['biometric_verification_status'])


def enforce_verified_only(apps, schema_editor):
    """ApplicantProfile is meant to hold ONLY verified profiles.

    Failed profiles WITHOUT any Application are junk drafts (created by the
    pre-fix flow that committed failed verifications) — delete them. Failed
    profiles that already have Applications are grandfathered to 'verified'
    so no real application/business data is destroyed.
    """
    ApplicantProfile = apps.get_model('accounts', 'ApplicantProfile')
    Application = apps.get_model('applications', 'Application')
    for profile in ApplicantProfile.objects.exclude(
        biometric_verification_status='verified'
    ):
        if Application.objects.filter(applicant_profile=profile).exists():
            profile.biometric_verification_status = 'verified'
            profile.save(update_fields=['biometric_verification_status'])
        else:
            profile.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_pendingregistration'),
    ]

    operations = [
        migrations.AddField(
            model_name='applicantprofile',
            name='biometric_verification_status',
            field=models.CharField(choices=[('pending', 'Pending'), ('verified', 'Verified'), ('failed', 'Failed')], default='pending', max_length=10),
        ),
        migrations.RunPython(map_biometric_status, migrations.RunPython.noop),
        migrations.RunPython(enforce_verified_only, migrations.RunPython.noop),
    ]