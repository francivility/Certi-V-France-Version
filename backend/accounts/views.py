import secrets

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Role
from .authentication import IsRegistrationOrJWT, RegistrationTokenAuthentication
from .codes import generate_code
from .models import PendingRegistration, User, ApplicantProfile
from .serializers import ApplicantProfileSerializer
from .staging import hash_token, pending_expired, REGISTRATION_TTL


STAFF_ROLES = {
    'Receiving Officer', 'CTDO', 'Financial Analyst', 'Cashier',
    'Legal Officer', 'ORD', 'Records Officer',
}


def _cleanup_expired():
    from django.utils import timezone
    PendingRegistration.objects.filter(
        status__in=[
            PendingRegistration.Status.WAITING,
            PendingRegistration.Status.PROCESSING,
            PendingRegistration.Status.FAILED,
        ],
        created_at__lt=timezone.now() - REGISTRATION_TTL,
    ).delete()


@api_view(['POST'])
@permission_classes([AllowAny])
def register_step1(request):
    username = request.data.get('username', '').strip()
    email = request.data.get('email', '').strip()
    password = request.data.get('password', '')
    errors = []

    if not username or not password:
        errors.append('Username and password are required.')

    try:
        UnicodeUsernameValidator()(username)
    except DjangoValidationError as exc:
        errors.extend(exc.messages)
    if email:
        try:
            validate_email(email)
        except DjangoValidationError as exc:
            errors.extend(exc.messages)
    try:
        validate_password(password)
    except DjangoValidationError as exc:
        errors.append(exc.messages[0] if exc.messages else 'Password is too weak.')

    if errors:
        return Response({'error': errors[0]}, status=400)

    _cleanup_expired()

    taken = set(User.objects.values_list('username', flat=True)) | set(
        PendingRegistration.objects.filter(
            status__in=[
                PendingRegistration.Status.WAITING,
                PendingRegistration.Status.PROCESSING,
                PendingRegistration.Status.FAILED,
            ]
        ).values_list('username', flat=True)
    )
    if username in taken:
        return Response({'error': 'That username is already taken.'}, status=400)

    token = secrets.token_urlsafe(32)
    pending = PendingRegistration.objects.create(
        code=generate_code(PendingRegistration),
        token_hash=hash_token(token),
        username=username,
        email=email,
        password_hash=make_password(password),
    )
    return Response({
        'access': token,
        'code': pending.code,
        'status': 'verification_pending',
    }, status=201)


@api_view(['POST'])
@authentication_classes([RegistrationTokenAuthentication])
@permission_classes([IsRegistrationOrJWT])
def register_step2(request):
    pending = request.auth if isinstance(request.auth, PendingRegistration) else None
    if pending is None:
        return Response({'error': 'No registration in progress. Start over.'}, status=403)
    if pending_expired(pending):
        pending.delete()
        return Response({'error': 'Registration expired. Start over.'}, status=410)

    serializer = ApplicantProfileSerializer(data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    for field, value in serializer.validated_data.items():
        setattr(pending, field, value or '')
    pending.save()
    return Response({'message': 'Applicant info staged', 'status': pending.status})


@api_view(['GET'])
@authentication_classes([RegistrationTokenAuthentication])
@permission_classes([IsRegistrationOrJWT])
def register_state(request):
    pending = request.auth if isinstance(request.auth, PendingRegistration) else None
    if pending is None:
        return Response({'error': 'No registration in progress.'}, status=404)
    if pending_expired(pending):
        pending.delete()
        return Response({'status': 'expired'}, status=410)

    step = 3 if (pending.business_name or pending.address or pending.tin) else 2

    if pending.status == PendingRegistration.Status.FAILED:
        pending.status = PendingRegistration.Status.WAITING
        pending.error_message = ''
        pending.save(update_fields=['status', 'error_message', 'updated_at'])

    return Response({
        'step': step,
        'status': pending.status,
        'code': pending.code,
        'username': pending.username,
        'email': pending.email,
        'business_name': pending.business_name,
        'address': pending.address,
        'tin': pending.tin,
    })


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def register_verify_status(request, code):
    pending = PendingRegistration.objects.filter(code=code).first()
    if pending is None:
        return Response({'error': 'Registration not found'}, status=404)
    if pending_expired(pending):
        pending.delete()
        return Response({'status': 'expired'})

    data = {
        'status': pending.status,
        'id_type': pending.id_type,
        'blink_count': pending.blink_count,
        'face_detected': pending.face_detected,
        'match_score': pending.match_score,
        'match_passed': pending.match_passed,
        'error_message': pending.error_message,
    }
    if pending.status == PendingRegistration.Status.VERIFIED:
        data['status'] = 'done'
        user = User.objects.filter(username=pending.username).first()
        if user is not None:
            refresh = RefreshToken.for_user(user)
            data['access'] = str(refresh.access_token)
            data['refresh'] = str(refresh)
    elif pending.status == PendingRegistration.Status.FAILED:
        data['status'] = 'failed'
    else:
        data['status'] = 'waiting'
    return Response(data)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    from django.contrib.auth import authenticate
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if user is not None:
        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
            "role": user.role.role_name if user.role else None,
            "name": user.first_name or user.username,
        })
    return Response({"error": "Invalid credentials"}, status=401)


@api_view(['POST'])
@permission_classes([AllowAny])
def staff_login_view(request):
    from django.contrib.auth import authenticate
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if user is None:
        return Response({"error": "Invalid credentials"}, status=401)

    role_name = user.role.role_name if user.role else None
    if role_name not in STAFF_ROLES:
        return Response({"error": "Access restricted to LTFRB staff accounts."}, status=403)

    refresh = RefreshToken.for_user(user)
    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "username": user.username,
        "role": role_name,
        "name": user.first_name or user.username,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def account_info(request):
    user = request.user
    try:
        profile = ApplicantProfile.objects.get(user=user)
    except ApplicantProfile.DoesNotExist:
        profile = None
    return Response({
        "username": user.username,
        "email": user.email or '',
        "name": profile.business_name if profile else (user.first_name or user.username),
        "address": profile.address if profile else '',
        "tin": profile.tin if profile else '',
        "biometric_verification_status": (
            profile.biometric_verification_status if profile else 'pending'
        ),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    current = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')

    if not user.check_password(current):
        return Response({"error": "Current password is incorrect."}, status=400)
    if not new_password:
        return Response({"error": "New password is required."}, status=400)

    try:
        validate_password(new_password, user=user)
    except DjangoValidationError as exc:
        return Response({"error": exc.messages[0] if exc.messages else str(exc)}, status=400)
    user.set_password(new_password)
    user.save()
    return Response({"message": "Password updated successfully."})


def _unique_username_from_email(email):
    base = (email.split('@')[0] or 'user')[:100]
    candidate = base
    counter = 1
    while (
        User.objects.filter(username=candidate).exists()
        or PendingRegistration.objects.filter(username=candidate).exists()
    ):
        candidate = f"{base}{counter}"
        counter += 1
    return candidate


@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth_view(request):
    credential = request.data.get('credential', '')
    if not credential:
        return Response({'error': 'Missing Google credential.'}, status=400)

    client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '')
    if not client_id:
        return Response({'error': 'Google login is not configured on this server.'}, status=500)

    try:
        idinfo = google_id_token.verify_oauth2_token(
            credential, google_requests.Request(), client_id
        )
    except ValueError:
        return Response({'error': 'Invalid Google credential.'}, status=401)

    google_id = idinfo.get('sub', '')
    email = idinfo.get('email', '').strip().lower()
    email_verified = idinfo.get('email_verified', False)

    if not google_id or not email:
        return Response({'error': 'Google account is missing email or ID.'}, status=400)
    if not email_verified:
        return Response({'error': 'Google email is not verified.'}, status=400)

    existing = User.objects.filter(google_id=google_id).first()
    if existing is None:
        existing = User.objects.filter(email__iexact=email).first()
        if existing is not None and not existing.google_id:
            existing.google_id = google_id
            existing.save(update_fields=['google_id'])

    if existing is not None:
        refresh = RefreshToken.for_user(existing)
        return Response({
            'mode': 'login',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'username': existing.username,
            'email': existing.email,
            'role': existing.role.role_name if existing.role else None,
            'name': existing.first_name or existing.username,
        })

    _cleanup_expired()

    pending = PendingRegistration.objects.filter(
        google_id=google_id,
        status__in=[
            PendingRegistration.Status.WAITING,
            PendingRegistration.Status.PROCESSING,
            PendingRegistration.Status.FAILED,
        ],
    ).first()

    if pending is None:
        username = _unique_username_from_email(email)
        random_password = secrets.token_urlsafe(32)
        token = secrets.token_urlsafe(32)
        pending = PendingRegistration.objects.create(
            code=generate_code(PendingRegistration),
            token_hash=hash_token(token),
            username=username,
            email=email,
            password_hash=make_password(random_password),
            google_id=google_id,
        )
    else:
        token = secrets.token_urlsafe(32)
        pending.token_hash = hash_token(token)
        pending.status = PendingRegistration.Status.WAITING
        pending.error_message = ''
        pending.save(update_fields=['token_hash', 'status', 'error_message', 'updated_at'])

    return Response({
        'mode': 'register',
        'access': token,
        'code': pending.code,
        'status': 'verification_pending',
        'username': pending.username,
        'email': pending.email,
        'business_name': pending.business_name,
        'address': pending.address,
        'tin': pending.tin,
    }, status=201)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response({'error': 'Email is required.'}, status=400)

    user = User.objects.filter(email__iexact=email).first()

    if user is not None and user.email:
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"

        subject = 'Reset your Certi-V password'
        message = (
            f"Hello {user.username},\n\n"
            f"We received a request to reset the password for your Certi-V account.\n\n"
            f"Click the link below to set a new password:\n\n"
            f"{reset_link}\n\n"
            f"If you did not request this, you can safely ignore this email. "
            f"The link will expire in 24 hours.\n\n"
            f"— Certi-V, LTFRB Region V"
        )
        try:
            send_mail(
                subject, message, settings.DEFAULT_FROM_EMAIL,
                [user.email], fail_silently=True,
            )
        except Exception:
            pass

    return Response({
        'message': 'If an account with that email exists, a password reset link has been sent.'
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request, uidb64, token):
    new_password = request.data.get('new_password', '')
    if not new_password:
        return Response({'error': 'New password is required.'}, status=400)

    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({'error': 'This reset link is invalid or has expired.'}, status=400)

    if not default_token_generator.check_token(user, token):
        return Response({'error': 'This reset link is invalid or has expired.'}, status=400)

    try:
        validate_password(new_password, user=user)
    except DjangoValidationError as exc:
        return Response(
            {'error': exc.messages[0] if exc.messages else 'Password is too weak.'},
            status=400,
        )

    user.set_password(new_password)
    user.save()
    return Response({'message': 'Your password has been reset. You can now log in with your new password.'})