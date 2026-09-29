from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_merge_biometric_status'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='applicantprofile',
            name='face_verification_status',
        ),
        migrations.RemoveField(
            model_name='applicantprofile',
            name='id_verification_status',
        ),
    ]