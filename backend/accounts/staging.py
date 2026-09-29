import hashlib
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Role
from .models import ApplicantProfile, PendingRegistration, User

REGISTRATION_TTL = timedelta(minutes=60)


def hash_token(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def pending_expired(pending):
    active = pending.status in (
        PendingRegistration.Status.WAITING,
        PendingRegistration.Status.PROCESSING,
        PendingRegistration.Status.FAILED,
    )
    return active and timezone.now() - pending.created_at > REGISTRATION_TTL


def completes_registration(pending, result):
    """Only called AFTER verification passes (blinks detected AND the ID face
    matches the selfie). Creates the real User + ApplicantProfile atomically
    and returns fresh JWT access/refresh tokens. Before this, no account data
    is committed to the database. ApplicantProfile therefore only ever holds
    verified profiles."""
    with transaction.atomic():
        applicant_role, _ = Role.objects.get_or_create(role_name='Applicant')
        user = User(
            username=pending.username,
            email=pending.email or '',
            password=pending.password_hash,
            role=applicant_role,
            google_id=pending.google_id or '',
        )
        user.save()
        ApplicantProfile.objects.create(
            user=user,
            business_name=pending.business_name or '',
            address=pending.address or '',
            tin=pending.tin or '',
            biometric_verification_status='verified',
        )
        pending.status = PendingRegistration.Status.VERIFIED
        pending.id_type = result.get('id_type', pending.id_type)
        pending.blink_count = result['blink_count']
        pending.face_detected = result['face_detected']
        pending.match_score = result['match_score']
        pending.match_passed = result['match_passed']
        pending.error_message = ''
        pending.save(update_fields=[
            'status', 'id_type', 'blink_count', 'face_detected',
            'match_score', 'match_passed', 'error_message', 'updated_at',
        ])

    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }