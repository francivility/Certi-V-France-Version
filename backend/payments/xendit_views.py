from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from applications.models import Application, ApplicationStatus, Notification
from .models import Payment, PaymentStatus
from .xendit_service import create_invoice, get_invoice
from .utils import generate_or_number


def _get_applicants_application(request, application_id):
    from accounts.models import ApplicantProfile
    try:
        profile = ApplicantProfile.objects.get(user=request.user)
        return Application.objects.get(id=application_id, applicant_profile=profile)
    except (ApplicantProfile.DoesNotExist, Application.DoesNotExist):
        return None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout(request, application_id):
    """Create a Xendit invoice and return the checkout URL for the frontend
    to redirect the applicant to."""
    app = _get_applicants_application(request, application_id)
    if app is None:
        return Response({'error': 'Application not found.'}, status=404)

    if not hasattr(app, 'soa'):
        return Response({'error': 'No SOA issued for this application.'}, status=400)

    if app.status != ApplicationStatus.PENDING_PAYMENT:
        return Response({'error': 'This application is not awaiting payment.'}, status=400)

    payment, _ = Payment.objects.get_or_create(
        application=app,
        defaults={'soa': app.soa, 'method': 'online'},
    )
    payment.method = 'online'
    payment.save()

    external_id = f'certiv-app-{app.id}-{int(timezone.now().timestamp())}'

    try:
        inv = create_invoice(
            external_id=external_id,
            amount=app.soa.total_amount,
            payer_email=request.user.email or '',
            description=f'CPC Application #{app.id} — {app.cpc_type.type_name}',
            success_url=settings.XENDIT_SUCCESS_URL + f'?application_id={app.id}',
            failure_url=settings.XENDIT_FAILURE_URL + f'?application_id={app.id}',
        )
    except Exception as exc:
        return Response({'error': f'Could not create payment session: {exc}'}, status=502)

    payment.xendit_invoice_id = inv.get('id', '')
    payment.xendit_invoice_url = inv.get('invoice_url', '')
    payment.xendit_status = inv.get('status', 'PENDING')
    payment.reference_no = inv.get('id', payment.reference_no)
    payment.save()

    return Response({
        'invoice_id': payment.xendit_invoice_id,
        'invoice_url': payment.xendit_invoice_url,
        'status': payment.xendit_status,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def checkout_status(request, application_id):
    """Frontend polls this after being redirected back from Xendit."""
    app = _get_applicants_application(request, application_id)
    if app is None:
        return Response({'error': 'Application not found.'}, status=404)

    payment = getattr(app, 'payment', None)
    if payment is None or not payment.xendit_invoice_id:
        return Response({'status': 'no_invoice', 'payment_status': None})

    try:
        inv = get_invoice(payment.xendit_invoice_id)
        xendit_status = inv.get('status', '').upper()
    except Exception:
        xendit_status = payment.xendit_status or 'UNKNOWN'

    payment.xendit_status = xendit_status
    if xendit_status in ('PAID', 'SETTLED'):
        payment.status = PaymentStatus.PAID
        if not payment.paid_at:
            payment.paid_at = timezone.now()
        if not payment.or_number:
            payment.or_number = generate_or_number(app.soa)
    payment.save()

    return Response({
        'status': xendit_status,
        'payment_status': payment.status,
        'or_number': payment.or_number or '',
        'reference_no': payment.reference_no or '',
    })


@csrf_exempt
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def webhook(request):
    """Xendit calls this endpoint when an invoice is paid or expires."""
    data = request.data or {}
    invoice_id = data.get('id', '')
    status = data.get('status', '').upper()

    if not invoice_id:
        return Response({'error': 'Missing invoice id'}, status=400)

    payment = Payment.objects.filter(xendit_invoice_id=invoice_id).first()
    if payment is None:
        return Response({'message': 'No matching payment'}, status=200)

    payment.xendit_status = status
    if status in ('PAID', 'SETTLED'):
        payment.status = PaymentStatus.PAID
        if not payment.paid_at:
            payment.paid_at = timezone.now()
        if not payment.or_number:
            payment.or_number = generate_or_number(payment.soa)
    payment.save()

    if status in ('PAID', 'SETTLED') and payment.application:
        try:
            Notification.objects.create(
                user=payment.application.applicant_profile.user,
                application=payment.application,
                title='Online payment received',
                message=(
                    f'We received your online payment for Application #{payment.application.id}. '
                    f'OR: {payment.or_number}. Awaiting cashier verification.'
                ),
            )
        except Exception:
            pass

    return Response({'message': 'OK'}, status=200)