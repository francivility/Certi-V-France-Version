from datetime import timedelta

from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.codes import generate_code
from accounts.models import ApplicantProfile, PendingRegistration
from accounts.staging import completes_registration, pending_expired
from . import services
from .models import VerificationSession

SESSION_TTL = timedelta(minutes=15)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_session(request):
    """Laptop creates a verification session and shows the QR code."""
    VerificationSession.objects.filter(
        user=request.user,
        status__in=[VerificationSession.Status.WAITING, VerificationSession.Status.PROCESSING],
    ).delete()
    session = VerificationSession.objects.create(user=request.user, code=generate_code(VerificationSession))
    return Response({'code': session.code})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_status(request, code):
    """Laptop polls for the result of a verification session."""
    session = VerificationSession.objects.filter(code=code, user=request.user).first()
    if session is None:
        return Response({'error': 'Session not found'}, status=404)

    if session.status == VerificationSession.Status.WAITING and \
            timezone.now() - session.created_at > SESSION_TTL:
        session.delete()
        return Response({'status': 'expired'})

    return Response({
        'status': session.status,
        'id_type': session.id_type,
        'blink_count': session.blink_count,
        'face_detected': session.face_detected,
        'match_score': session.match_score,
        'match_passed': session.match_passed,
        'error_message': session.error_message,
    })


@never_cache
def verify_page(request, code):
    """Standalone phone page opened by scanning the QR code. Works for both
    logged-in verification sessions and staged registrations."""
    session = VerificationSession.objects.filter(
        code=code, status=VerificationSession.Status.WAITING
    ).first()
    if session is None:
        pending = PendingRegistration.objects.filter(
            code=code,
            status__in=[
                PendingRegistration.Status.WAITING,
                PendingRegistration.Status.PROCESSING,
                PendingRegistration.Status.FAILED,
            ],
        ).first()
        if pending is None:
            return render(request, 'qr_expired.html', status=404)
        if pending_expired(pending):
            pending.delete()
            return render(request, 'qr_expired.html', status=404)
    return render(request, 'qr_verify.html', {'code': code})


@csrf_exempt
def submit(request, code):
    """Phone uploads the blink frame burst + ID photo, backend verifies.
    For a staged registration, the real account is ONLY created here after
    verification passes."""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)

    session = VerificationSession.objects.filter(code=code).first()
    pending = None
    if session is None:
        pending = PendingRegistration.objects.filter(code=code).first()
        if pending is None:
            return JsonResponse({'error': 'Session not found. Please scan a new QR code.'}, status=404)
        if pending.status == PendingRegistration.Status.VERIFIED:
            return JsonResponse({'error': 'This registration has already been completed.'}, status=409)
        if pending_expired(pending):
            pending.delete()
            return JsonResponse({'error': 'This code has expired. Start registration again.'}, status=410)
    else:
        if timezone.now() - session.created_at > SESSION_TTL:
            session.delete()
            return JsonResponse({'error': 'This code has expired. Please scan a new QR code.'}, status=410)
        if session.status not in (VerificationSession.Status.WAITING, VerificationSession.Status.FAILED):
            return JsonResponse({'error': 'This session has already been submitted.'}, status=409)

    frames = request.FILES.getlist('frame')
    id_images = request.FILES.getlist('id_image')
    if not frames:
        return JsonResponse({'error': 'No selfie frames received.'}, status=400)
    if not id_images:
        return JsonResponse({'error': 'No ID photo received.'}, status=400)

    id_type = request.POST.get('id_type', '')
    if session is not None:
        session.status = VerificationSession.Status.PROCESSING
        session.id_type = id_type
        session.save()
    else:
        pending.status = PendingRegistration.Status.PROCESSING
        pending.id_type = id_type
        pending.save(update_fields=['status', 'id_type', 'updated_at'])

    try:
        raw_blinks = request.POST.get('blink_count', '')
        try:
            phone_blinks = int(raw_blinks)
        except (TypeError, ValueError):
            phone_blinks = None
        id_image_bytes = [id_image.read() for id_image in id_images]
        result = services.run(
            [frame.read() for frame in frames],
            id_image_bytes,
            phone_blinks=phone_blinks,
            id_type=id_type,
        )
    except services.VerificationError as exc:
        if session is not None:
            session.status = VerificationSession.Status.FAILED
            session.error_message = str(exc)
            session.save()
        else:
            pending.status = PendingRegistration.Status.FAILED
            pending.error_message = str(exc)
            pending.save(update_fields=['status', 'error_message', 'updated_at'])
        return JsonResponse({'status': 'failed', 'message': str(exc)})
    except Exception as exc:  # noqa: BLE001 - keep the phone page friendly
        if session is not None:
            session.status = VerificationSession.Status.FAILED
            session.error_message = 'Verification service error.'
            session.save()
        else:
            pending.status = PendingRegistration.Status.FAILED
            pending.error_message = 'Verification service error.'
            pending.save(update_fields=['status', 'error_message', 'updated_at'])
        return JsonResponse({'status': 'failed', 'message': 'Verification service error. Please try again.'}, status=500)

    base_result = {
        'blink_count': result['blink_count'],
        'match_passed': result['match_passed'],
        'match_score': result['match_score'],
    }

    # Blinks code already passed services.run, so the only failure left here
    # is the ID face not matching the selfie. A failed match NEVER creates an
    # account: the draft stays failed (retakable) and no User/Profile row is
    # committed, so there is nothing to log in with.
    if not result['match_passed']:
        message = (
            'Your face does not match the face on the government ID photo. '
            'You may retake, or exit and start registration again.'
        )
        fields = {
            'blink_count': result['blink_count'],
            'face_detected': result['face_detected'],
            'match_score': result['match_score'],
            'match_passed': False,
            'error_message': message,
        }
        if session is not None:
            session.status = VerificationSession.Status.FAILED
            for key, value in fields.items():
                setattr(session, key, value)
            session.save()
        else:
            pending.status = PendingRegistration.Status.FAILED
            for key, value in fields.items():
                setattr(pending, key, value)
            pending.save(update_fields=['status'] + list(fields.keys()) + ['updated_at'])
        return JsonResponse({
            **base_result,
            'status': 'failed',
            'reason': 'mismatch',
            'message': message,
        })

    if session is not None:
        session.status = VerificationSession.Status.DONE
        session.selfie_frame = result['selfie_frame']
        session.id_image = id_image_bytes[0]
        session.blink_count = result['blink_count']
        session.face_detected = result['face_detected']
        session.match_score = result['match_score']
        session.match_passed = True
        session.save()

        profile = ApplicantProfile.objects.filter(user=session.user).first()
        if profile is not None:
            profile.biometric_verification_status = 'verified'
            profile.save(update_fields=['biometric_verification_status'])

        return JsonResponse({**base_result, 'status': 'done'})

    # Staged registration: commit the real account now that verification passed.
    tokens = completes_registration(pending, {**result, 'id_type': id_type})
    return JsonResponse({**base_result, 'status': 'done', **tokens})
