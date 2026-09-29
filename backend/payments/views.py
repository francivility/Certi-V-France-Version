from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Sum, Count
from django.db.models.functions import TruncMonth, TruncYear
from core.permissions import HasRole
from core.models import Fee
from applications.models import Application, ApplicationStatusLog, ApplicationStatus, Notification
from .models import StatementOfAccount, SOAItem, Payment, PaymentStatus, PaymentMethod
from .serializers import SOASerializer, ReceiptSerializer
from .utils import generate_control_number, calculate_cpc_expiry, generate_docket_number, generate_or_number, calculate_payment_due_date


# --- Phase 8 functions (unchanged) ---
@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def assessment_queue(request):
    assessment_queue.required_role = 'Financial Analyst'
    apps = Application.objects.filter(status='pending_assessment').order_by('submitted_at')
    data = [{"id": a.id, "applicant_name": a.applicant_profile.business_name,
             "cpc_type_name": a.cpc_type.type_name,
             "case_number": a.case_number,
             "docket_number": a.docket_number,
             "submitted_at": a.submitted_at,
             "control_number": a.soa.control_number if hasattr(a, 'soa') else None} for a in apps]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def list_fees(request):
    list_fees.required_role = 'Financial Analyst'
    fees = Fee.objects.filter(is_active=True)
    data = [{
        "id": f.id, "fee_name": f.fee_name, "amount": str(f.amount),
        "allow_quantity": f.allow_quantity,
    } for f in fees]
    return Response(data)


def mark_overdue_applications():
    """On-access: any pending_payment application whose payment deadline has
    passed and is still unpaid is flagged Overdue. Returns count flagged."""
    today = timezone.localdate()
    apps = Application.objects.filter(
        status=ApplicationStatus.PENDING_PAYMENT,
        payment__status=PaymentStatus.PENDING,
        payment__due_date__lt=today,
    )
    for a in apps.select_related('applicant_profile__user', 'cpc_type'):
        p = a.payment
        if not p.overdue:
            p.overdue = True
            p.save()
        if a.status != ApplicationStatus.OVERDUE:
            a.status = ApplicationStatus.OVERDUE
            a.save()
            ApplicationStatusLog.objects.create(
                application=a, status=ApplicationStatus.OVERDUE,
                changed_by=None,
                remarks='Payment not made within five (5) business days. Application flagged as Overdue.'
            )
            Notification.objects.create(
                user=a.applicant_profile.user,
                application=a,
                title='Payment overdue',
                message=(
                    f"You missed the five (5) business day payment deadline for your "
                    f"{a.cpc_type.type_name} application (Application #{a.id}). Your application has "
                    "been flagged as Overdue. Unpaid overdue assessments expire at the end of the month, "
                    "after which you will need to file a new application."
                ),
            )
    return apps.count()


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRole])
def issue_soa(request, application_id):
    issue_soa.required_role = 'Financial Analyst'
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if hasattr(application, 'soa'):
        return Response(SOASerializer(application.soa).data, status=200)

    fee_ids = request.data.get('fee_ids', [])
    if not fee_ids:
        return Response({"error": "Select at least one fee."}, status=400)

    quantities = request.data.get('quantities', {}) or {}

    soa = StatementOfAccount.objects.create(
        application=application,
        control_number=generate_control_number(),
        expiry_date=calculate_cpc_expiry(),
        issued_by=request.user,
    )

    total = 0
    for fee_id in fee_ids:
        fee = Fee.objects.get(id=fee_id)
        # Only fees that allow quantity can be multiplied. Fixed fees (e.g. the
        # Filing Fee for the first two units) are always charged at quantity 1.
        if fee.allow_quantity:
            try:
                qty = int(quantities.get(str(fee_id), 1))
            except (TypeError, ValueError):
                qty = 1
            if qty < 1:
                qty = 1
        else:
            qty = 1
        line_total = fee.amount * qty
        SOAItem.objects.create(soa=soa, fee=fee, quantity=qty, amount=line_total)
        total += line_total

    soa.total_amount = total
    soa.save()

    ApplicationStatusLog.objects.create(
        application=application, status=application.status,
        changed_by=request.user,
        remarks=f'SOA issued with control number {soa.control_number}. Total: {total}'
    )

    return Response(SOASerializer(soa).data, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRole])
def forward_to_cashier(request, application_id):
    forward_to_cashier.required_role = 'Financial Analyst'
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if not hasattr(application, 'soa'):
        return Response({"error": "No SOA issued yet. Issue one before forwarding."}, status=400)

    application.status = 'pending_payment'
    application.save()

    # Set payment deadline (5 business days) and notify the applicant to pay,
    # letting them choose online or on-site.
    payment, _ = Payment.objects.get_or_create(
        application=application,
        defaults={'soa': application.soa},
    )
    payment.soa = application.soa
    payment.status = PaymentStatus.PENDING
    payment.overdue = False
    payment.due_date = calculate_payment_due_date()
    payment.save()

    applicant_user = application.applicant_profile.user
    Notification.objects.create(
        user=applicant_user,
        application=application,
        title='Payment Order Slip issued',
        message=(
            f"The assessed fees for your {application.cpc_type.type_name} application are ready for payment. "
            f"Amount to pay: PHP {application.soa.total_amount}. Pay within five (5) business days "
            f"(on or before {payment.due_date.strftime('%B %d, %Y')}) to avoid your application being flagged as Overdue. "
            "You may pay online through your account or on-site at the LTFRB Regional Office."
        ),
    )

    ApplicationStatusLog.objects.create(
        application=application, status='pending_payment',
        changed_by=request.user, remarks='SOA forwarded to Cashier for payment collection.'
    )
    return Response({"message": "Forwarded to Cashier.", "status": application.status})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def soa_detail(request, application_id):
    try:
        soa = StatementOfAccount.objects.get(application_id=application_id)
    except StatementOfAccount.DoesNotExist:
        return Response({"error": "No SOA issued yet."}, status=404)
    return Response(SOASerializer(soa).data)


# --- Phase 9: Cashier ---

@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def payment_queue(request):
    """Applications with an issued SOA, still waiting for payment."""
    payment_queue.required_role = 'Cashier'
    mark_overdue_applications()
    apps = Application.objects.filter(
        status__in=[ApplicationStatus.PENDING_PAYMENT, ApplicationStatus.OVERDUE]
    ).exclude(payment__status=PaymentStatus.PAID).order_by('submitted_at')
    data = [{
        "id": a.id,
        "applicant_name": a.applicant_profile.business_name,
        "cpc_type_name": a.cpc_type.type_name,
        "control_number": a.soa.control_number if hasattr(a, 'soa') else None,
        "total_amount": str(a.soa.total_amount) if hasattr(a, 'soa') else None,
        "case_number": a.case_number,
        "docket_number": a.docket_number,
        "method": a.payment.method if hasattr(a, 'payment') else None,
        "reference_no": a.payment.reference_no if hasattr(a, 'payment') else None,
        "due_date": a.payment.due_date.strftime('%Y-%m-%d') if hasattr(a, 'payment') and a.payment.due_date else None,
        "overdue": a.payment.overdue if hasattr(a, 'payment') else False,
        "submitted_at": a.submitted_at,
    } for a in apps]
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRole])
def receive_payment(request, application_id):
    """Cashier confirms payment and marks it Paid.
    Docket number generation + forwarding to Legal Officer is the
    Financial Analyst's job (see generate_docket_and_forward below)."""
    receive_payment.required_role = 'Cashier'
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if not hasattr(application, 'soa'):
        return Response({"error": "No SOA issued for this application yet."}, status=400)

    if hasattr(application, 'payment') and application.payment.status == PaymentStatus.PAID:
        return Response(ReceiptSerializer(application.payment).data, status=200)

    method = request.data.get('method')
    reference_no = request.data.get('reference_no', '')

    if method not in ('online', 'onsite', 'f2f'):
        return Response({"error": "Select a valid payment method (online/onsite/f2f)."}, status=400)
    if method in ('online',) and not reference_no:
        return Response({"error": "Reference number is required for online payments."}, status=400)

    payment, _ = Payment.objects.get_or_create(
        application=application,
        defaults={'soa': application.soa, 'method': method}
    )
    payment.method = method
    payment.reference_no = reference_no or payment.reference_no
    payment.status = PaymentStatus.PAID
    payment.overdue = False
    payment.verified_by = request.user
    payment.paid_at = timezone.now()
    payment.or_number = generate_or_number(application.soa)
    payment.save()

    # NOTE: application.status stays 'pending_payment' â€” Financial Analyst
    # picks it up from here once Payment.status == PAID.
    ApplicationStatusLog.objects.create(
        application=application, status=application.status,
        changed_by=request.user,
        remarks=f'Payment received ({method}). OR: {payment.or_number}. Awaiting Financial Analyst docket assignment.'
    )

    applicant_user = application.applicant_profile.user
    Notification.objects.create(
        user=applicant_user,
        application=application,
        title='Payment received',
        message=(
            f"We received the payment (OR: {payment.or_number}, method: {method}) for your "
            f"{application.cpc_type.type_name} application (Application #{application.id}). "
            "Your application will proceed to the Legal stage for docket assignment."
        ),
    )

    return Response(ReceiptSerializer(payment).data, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def receipt_detail(request, application_id):
    """Viewable by Cashier and Financial Analyst (for digital receipt forwarding)."""
    try:
        payment = Payment.objects.get(application_id=application_id)
    except Payment.DoesNotExist:
        return Response({"error": "No payment recorded yet."}, status=404)
    return Response(ReceiptSerializer(payment).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def paid_queue(request):
    """Applications the Cashier already marked Paid, waiting for docket
    number assignment and forwarding to the Legal Officer."""
    paid_queue.required_role = 'Financial Analyst'
    apps = Application.objects.filter(
        status=ApplicationStatus.PENDING_PAYMENT,
        payment__status=PaymentStatus.PAID,
    ).order_by('payment__paid_at')
    data = [{
        "id": a.id,
        "applicant_name": a.applicant_profile.business_name,
        "cpc_type_name": a.cpc_type.type_name,
        "or_number": a.payment.or_number,
        "paid_at": a.payment.paid_at,
        "submitted_at": a.submitted_at,
        "control_number": a.soa.control_number if hasattr(a, 'soa') else None,
        "total_amount": str(a.soa.total_amount) if hasattr(a, 'soa') else None,
    } for a in apps]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def assessment_history(request):
    """Financial Analyst: applications already assessed and moved out of the
    assessment queue â€” including those just forwarded to the Cashier
    (pending_payment) and every later stage up to final outcomes."""
    assessment_history.required_role = 'Financial Analyst'
    apps = Application.objects.exclude(
        status__in=[
            ApplicationStatus.PENDING_UPLOAD,
            ApplicationStatus.PENDING_RECEIVING,
            ApplicationStatus.NEEDS_CORRECTION,
            ApplicationStatus.PENDING_CTDO,
            ApplicationStatus.PENDING_ASSESSMENT,
        ]
    ).order_by('-submitted_at')
    data = [{
        "id": a.id,
        "applicant_name": a.applicant_profile.business_name,
        "cpc_type_name": a.cpc_type.type_name,
        "case_number": a.case_number,
        "docket_number": a.docket_number,
        "status": a.status,
        "submitted_at": a.submitted_at,
        "control_number": a.soa.control_number if hasattr(a, 'soa') else None,
        "total_amount": str(a.soa.total_amount) if hasattr(a, 'soa') else None,
        "or_number": a.payment.or_number if hasattr(a, 'payment') else None,
    } for a in apps]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def assessment_reports(request):
    """Financial Analyst report: assessed applications (those with an issued
    SOA) broken down by denomination, status, and duration (monthly/yearly),
    plus assessment status (paid vs overdue). Keeps dashboard KPI counts too."""
    assessment_reports.required_role = 'Financial Analyst'
    done_statuses = [
        ApplicationStatus.PENDING_LEGAL,
        ApplicationStatus.PENDING_HEARING,
        ApplicationStatus.PENDING_CTDO_ENDORSEMENT,
        ApplicationStatus.PENDING_ORD,
        ApplicationStatus.APPROVED,
        ApplicationStatus.NOT_APPROVED,
        ApplicationStatus.DISMISSED,
    ]
    assessed = StatementOfAccount.objects.select_related('application')
    total = assessed.count()
    paid = assessed.filter(application__payment__status=PaymentStatus.PAID).count()
    overdue = assessed.filter(application__payment__overdue=True).count()
    pending = assessed.filter(application__payment__status=PaymentStatus.PENDING).count()
    return Response({
        "total": total,
        "by_denomination": [
            {"name": r["application__cpc_type__type_name"], "total": r["total"]}
            for r in assessed.values('application__cpc_type__type_name').annotate(total=Count('id')).order_by('-total')
        ],
        "by_status": [
            {"name": r["application__status"], "total": r["total"]}
            for r in assessed.values('application__status').annotate(total=Count('id')).order_by('-total')
        ],
        "by_month": [
            {"name": r["month"].strftime('%Y-%m'), "total": r["total"]}
            for r in assessed.annotate(month=TruncMonth('application__submitted_at')).values('month').annotate(total=Count('id')).order_by('month')
        ],
        "by_year": [
            {"name": r["year"].strftime('%Y'), "total": r["total"]}
            for r in assessed.annotate(year=TruncYear('application__submitted_at')).values('year').annotate(total=Count('id')).order_by('year')
        ],
        "extra": [{
            "key": "payment_status",
            "label": "Assessment Status",
            "data": [
                {"name": "Paid", "total": paid},
                {"name": "Overdue", "total": overdue},
                {"name": "Pending", "total": pending},
            ],
        }],
        "pending_assessment": Application.objects.filter(
            status=ApplicationStatus.PENDING_ASSESSMENT
        ).count(),
        "soa_issued": total,
        "overdue": overdue,
        "awaiting_docket": Application.objects.filter(
            status=ApplicationStatus.PENDING_PAYMENT,
            payment__status=PaymentStatus.PAID,
        ).count(),
        "forwarded_to_legal": Application.objects.filter(
            status__in=done_statuses
        ).count(),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRole])
def generate_docket_and_forward(request, application_id):
    """Financial Analyst reviews the paid POS/receipt, generates the Docket
    Number, and forwards the application to the Legal Officer."""
    generate_docket_and_forward.required_role = 'Financial Analyst'
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if not hasattr(application, 'payment') or application.payment.status != PaymentStatus.PAID:
        return Response({"error": "Payment not yet confirmed by Cashier."}, status=400)

    if not application.docket_number:
        application.docket_number = generate_docket_number(application.cpc_type.type_name)

    application.status = ApplicationStatus.PENDING_LEGAL
    application.save()

    ApplicationStatusLog.objects.create(
        application=application, status=ApplicationStatus.PENDING_LEGAL,
        changed_by=request.user,
        remarks=f'Docket Number {application.docket_number} generated. Forwarded to Legal Officer.'
    )

    return Response(ReceiptSerializer(application.payment).data, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def payment_history(request):
    """Cashier: applications the Cashier has already collected payment for,
    whether still awaiting the Financial Analyst's docket or further downstream."""
    payment_history.required_role = 'Cashier'
    apps = Application.objects.filter(
        payment__status=PaymentStatus.PAID
    ).order_by('-payment__paid_at')
    data = [{
        "id": a.id,
        "applicant_name": a.applicant_profile.business_name,
        "cpc_type_name": a.cpc_type.type_name,
        "case_number": a.case_number,
        "docket_number": a.docket_number,
        "status": a.status,
        "control_number": a.soa.control_number if hasattr(a, 'soa') else None,
        "total_amount": str(a.soa.total_amount) if hasattr(a, 'soa') else None,
        "or_number": a.payment.or_number,
        "paid_at": a.payment.paid_at,
        "submitted_at": a.submitted_at,
    } for a in apps]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def payment_reports(request):
    """Cashier report: collected payments broken down by denomination, status,
    and duration (monthly/yearly), plus payment method (online vs cash).
    Keeps dashboard counts too."""
    payment_reports.required_role = 'Cashier'
    collected = Payment.objects.filter(status=PaymentStatus.PAID)
    total_collected = collected.aggregate(total=Sum('soa__total_amount'))['total'] or 0
    total = collected.count()
    online = collected.filter(method=PaymentMethod.ONLINE).count()
    cash = collected.filter(method=PaymentMethod.F2F).count()
    return Response({
        "total": total,
        "total_collected": str(total_collected),
        "by_denomination": [
            {"name": r["application__cpc_type__type_name"], "total": r["total"]}
            for r in collected.values('application__cpc_type__type_name').annotate(total=Count('id')).order_by('-total')
        ],
        "by_status": [
            {"name": r["application__status"], "total": r["total"]}
            for r in collected.values('application__status').annotate(total=Count('id')).order_by('-total')
        ],
        "by_month": [
            {"name": r["month"].strftime('%Y-%m'), "total": r["total"]}
            for r in collected.annotate(month=TruncMonth('paid_at')).values('month').annotate(total=Count('id')).order_by('month')
        ],
        "by_year": [
            {"name": r["year"].strftime('%Y'), "total": r["total"]}
            for r in collected.annotate(year=TruncYear('paid_at')).values('year').annotate(total=Count('id')).order_by('year')
        ],
        "extra": [{
            "key": "payment_method",
            "label": "Payment Method",
            "data": [
                {"name": "Online", "total": online},
                {"name": "Cash", "total": cash},
            ],
        }],
        "pending_payments": Application.objects.filter(
            status=ApplicationStatus.PENDING_PAYMENT
        ).exclude(payment__status=PaymentStatus.PAID).count(),
        "payments_collected": total,
    })


# --- Applicant-facing payment flow ---

def _get_applicants_application(request, application_id):
    """Returns the application if it belongs to the logged-in applicant."""
    from accounts.models import ApplicantProfile
    try:
        profile = ApplicantProfile.objects.get(user=request.user)
        app = Application.objects.get(id=application_id, applicant_profile=profile)
        return app
    except (ApplicantProfile.DoesNotExist, Application.DoesNotExist):
        return None


def _public_bill_data(app):
    """Applicant-facing POS/bill payload with ownership baked in."""
    mark_overdue_applications()
    payment = getattr(app, 'payment', None)
    soa = getattr(app, 'soa', None)
    return {
        "id": app.id,
        "cpc_type_name": app.cpc_type.type_name,
        "business_name": app.applicant_profile.business_name,
        "control_number": soa.control_number if soa else None,
        "total_amount": str(soa.total_amount) if soa else None,
        "status": app.status,
        "payment_status": payment.status if payment else None,
        "method": payment.method if payment else None,
        "reference_no": payment.reference_no if payment else None,
        "due_date": payment.due_date.strftime('%Y-%m-%d') if payment and payment.due_date else None,
        "overdue": payment.overdue if payment else False,
        "or_number": payment.or_number if payment else None,
        "paid_at": payment.paid_at.strftime('%Y-%m-%d %H:%M') if payment and payment.paid_at else None,
        "items": [
            {"fee": i.fee.fee_name, "qty": i.quantity, "amount": str(i.amount)}
            for i in soa.items.all()
        ] if soa else [],
        "expiry_date": soa.expiry_date.strftime('%Y-%m-%d') if soa and soa.expiry_date else None,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_bill(request, application_id):
    """Applicant sees the assessed POS/bill for one of their applications."""
    app = _get_applicants_application(request, application_id)
    if app is None:
        return Response({"error": "Application not found."}, status=404)
    return Response(_public_bill_data(app))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def choose_payment_method(request, application_id):
    """Applicant picks how they'll pay: online or on-site. Stored on Payment."""
    app = _get_applicants_application(request, application_id)
    if app is None:
        return Response({"error": "Application not found."}, status=404)

    mark_overdue_applications()
    if app.status != ApplicationStatus.PENDING_PAYMENT:
        return Response({"error": "This application is not awaiting payment."}, status=400)

    method = request.data.get('method')
    if method not in ('online', 'onsite'):
        return Response({"error": "Choose a valid method (online or onsite)."}, status=400)

    payment, _ = Payment.objects.get_or_create(
        application=app,
        defaults={'soa': app.soa, 'method': method},
    )
    payment.method = method
    if not payment.due_date:
        payment.due_date = calculate_payment_due_date()
    payment.save()
    ApplicationStatusLog.objects.create(
        application=app, status=app.status,
        changed_by=request.user,
        remarks=f'Applicant chose to pay {method}.'
    )
    return Response(_public_bill_data(app))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_online_payment(request, application_id):
    """Simulated online checkout: applicant confirms they're paying online.
    Stores the transaction reference and a PAYMENT_RECEIVED-style intent.
    The Cashier still verifies and generates the official OR."""
    app = _get_applicants_application(request, application_id)
    if app is None:
        return Response({"error": "Application not found."}, status=404)

    mark_overdue_applications()
    if app.status in (ApplicationStatus.OVERDUE, ApplicationStatus.EXPIRED):
        return Response({"error": "This application is overdue. It can no longer be paid online."}, status=400)
    if app.status != ApplicationStatus.PENDING_PAYMENT:
        return Response({"error": "This application is not awaiting payment."}, status=400)

    payment, _ = Payment.objects.get_or_create(
        application=app,
        defaults={'soa': app.soa, 'method': 'online'},
    )
    payment.method = 'online'

    # Simulate an online payment: generate a reference, keep status PENDING
    # so the Cashier can still verify and issue the receipt.
    reference = request.data.get('reference_no', '').strip()
    if not reference:
        reference = f"GC{timezone.now().strftime('%Y%m%d%H%M%S')}"
    payment.reference_no = reference
    payment.save()

    Notification.objects.create(
        user=app.applicant_profile.user,
        application=app,
        title='Online payment submitted',
        message=(
            f"Your online payment for Application #{app.id} ({app.cpc_type.type_name}) has been submitted "
            f"for verification (reference: {reference}). The cashier will generate your official receipt once confirmed."
        ),
    )
    return Response({
        "message": "Online payment submitted for verification.",
        "reference_no": reference,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_receipt(request, application_id):
    """Applicant views their official receipt after the Cashier confirms payment."""
    app = _get_applicants_application(request, application_id)
    if app is None:
        return Response({"error": "Application not found."}, status=404)
    payment = getattr(app, 'payment', None)
    if payment is None or payment.status != PaymentStatus.PAID:
        return Response({"error": "No confirmed payment yet."}, status=404)
    return Response(ReceiptSerializer(payment).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_payments(request):
    """Applicant sees the bills/POs for all their applications."""
    from accounts.models import ApplicantProfile
    mark_overdue_applications()
    try:
        profile = ApplicantProfile.objects.get(user=request.user)
    except ApplicantProfile.DoesNotExist:
        return Response({"error": "No applicant profile found."}, status=400)
    apps = Application.objects.filter(applicant_profile=profile).order_by('-submitted_at')
    return Response([_public_bill_data(a) for a in apps])


# --- Financial Analyst: Overdue / Expiration confirmation ---

@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def overdue_queue(request):
    """Financial Analyst: list applications flagged Overdue (or already
    expired by end-of-month) for review and expiration confirmation."""
    overdue_queue.required_role = 'Financial Analyst'
    mark_overdue_applications()
    apps = Application.objects.filter(status__in=[
        ApplicationStatus.OVERDUE,
        ApplicationStatus.EXPIRED,
    ]).order_by('-submitted_at')
    data = [{
        "id": a.id,
        "applicant_name": a.applicant_profile.business_name,
        "cpc_type_name": a.cpc_type.type_name,
        "control_number": a.soa.control_number if hasattr(a, 'soa') else None,
        "total_amount": str(a.soa.total_amount) if hasattr(a, 'soa') else None,
        "due_date": a.payment.due_date.strftime('%Y-%m-%d') if hasattr(a, 'payment') and a.payment.due_date else None,
        "status": a.status,
        "submitted_at": a.submitted_at,
    } for a in apps]
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRole])
def confirm_expire(request, application_id):
    """Financial Analyst confirms an overdue application's expiration.
    Marks it EXPIRED (invalid) — the applicant must file a new application."""
    confirm_expire.required_role = 'Financial Analyst'
    try:
        app = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if app.status != ApplicationStatus.OVERDUE:
        return Response({"error": "Only Overdue applications can be expired."}, status=400)

    app.status = ApplicationStatus.EXPIRED
    app.save()
    ApplicationStatusLog.objects.create(
        application=app, status=ApplicationStatus.EXPIRED,
        changed_by=request.user,
        remarks='Financial Analyst confirmed expiration. Overdue assessment expired; application invalidated.'
    )
    Notification.objects.create(
        user=app.applicant_profile.user,
        application=app,
        title='Application expired',
        message=(
            f"Your overdue application for {app.cpc_type.type_name} (Application #{app.id}) has expired "
            "because the payment deadline was missed. This application is now invalid. "
            "You may file a new application."
        ),
    )
    return Response({"message": "Application expired.", "status": app.status})
