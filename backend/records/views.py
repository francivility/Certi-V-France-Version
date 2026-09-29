from datetime import timedelta

from django.db.models import Q, Count
from django.db.models.functions import TruncMonth, TruncYear
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import HasRole
from applications.models import Application, ApplicationStatus, ApplicationStatusLog, Notification
from payments.models import StatementOfAccount
from .models import CPCRelease
from .serializers import CPCReleaseSerializer

# LTFRB Region V office info shared with applicants on CPC release.
LTFRB_OFFICE_HOURS = "8:00 AM to 5:00 PM, Mondays to Fridays"
LTFRB_OFFICE_LOCATION = "LTFRB Region V (Bicol) office, Peñaranda St., Legazpi City"


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def release_queue(request):
    """Approved applications waiting for CPC release."""
    release_queue.required_role = 'Records Officer'
    apps = Application.objects.filter(
        status=ApplicationStatus.APPROVED, release__isnull=True
    ).order_by('submitted_at')
    data = [{
        "id": a.id,
        "applicant_name": a.applicant_profile.business_name,
        "cpc_type_name": a.cpc_type.type_name,
        "docket_number": a.docket_number,
        "case_number": a.case_number,
    } for a in apps]
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRole])
def release_cpc(request, application_id):
    """Records Officer releases the approved CPC to the applicant."""
    release_cpc.required_role = 'Records Officer'
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if application.status != ApplicationStatus.APPROVED:
        return Response({"error": "Application is not in Approved status."}, status=400)

    if hasattr(application, 'release'):
        return Response({"error": "CPC already released for this application."}, status=400)

    # The new release flow always provides the applicant with BOTH a downloadable
    # softcopy and the option to claim a hardcopy at the LTFRB office, so a single
    # claim-method choice no longer applies.
    claim_method = request.data.get('claim_method') or 'soft_copy'
    if claim_method not in ('soft_copy', 'pickup'):
        return Response({"error": "claim_method must be 'soft_copy' or 'pickup'."}, status=400)

    release = CPCRelease.objects.create(
        application=application,
        claim_method=claim_method,
        released_by=request.user,
    )

    ApplicationStatusLog.objects.create(
        application=application, status=application.status,
        changed_by=request.user,
        remarks='CPC drafted by the Records Officer and sent to the applicant.'
    )

    # Notify the applicant with the downloadable softcopy and the hardcopy
    # pickup instructions (LTFRB office hours).
    applicant_user = application.applicant_profile.user
    Notification.objects.create(
        user=applicant_user,
        application=application,
        title='Your CPC is ready',
        message=(
            f"Your Certificate of Public Convenience (CPC) for {application.cpc_type.type_name} "
            "has been drafted and sent to you. You may download the softcopy from your application "
            f"(Application #{application.id}). "
            f"Alternatively, you can claim the hardcopy at the {LTFRB_OFFICE_LOCATION} during office "
            f"hours ({LTFRB_OFFICE_HOURS})."
        ),
    )

    return Response({
        **CPCReleaseSerializer(release).data,
        "office_hours": LTFRB_OFFICE_HOURS,
        "office_location": LTFRB_OFFICE_LOCATION,
    }, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def case_search(request):
    """Search previously processed applications by case number, docket number, or applicant name."""
    case_search.required_role = 'Records Officer'
    query = request.query_params.get('q', '').strip()
    if not query:
        return Response([])

    apps = Application.objects.filter(
        Q(case_number__icontains=query) |
        Q(docket_number__icontains=query) |
        Q(applicant_profile__business_name__icontains=query)
    ).exclude(case_number__isnull=True).order_by('-submitted_at')[:50]

    data = [{
        "id": a.id,
        "applicant_name": a.applicant_profile.business_name,
        "cpc_type_name": a.cpc_type.type_name,
        "docket_number": a.docket_number,
        "case_number": a.case_number,
        "status": a.status,
        "released": hasattr(a, 'release'),
    } for a in apps]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def expiry_monitor(request):
    """Approved applications whose CPC franchise is approaching renewal.
    Default window: next 60 days. Pass ?days=90 etc. to adjust."""
    expiry_monitor.required_role = 'Records Officer'
    try:
        days = int(request.query_params.get('days', 60))
    except ValueError:
        days = 60
    cutoff = timezone.now().date() + timedelta(days=days)

    soas = StatementOfAccount.objects.filter(
        application__status=ApplicationStatus.APPROVED,
        expiry_date__lte=cutoff,
        expiry_date__gte=timezone.now().date(),
    ).select_related('application', 'application__applicant_profile', 'application__cpc_type').order_by('expiry_date')

    data = [{
        "application_id": s.application.id,
        "applicant_name": s.application.applicant_profile.business_name,
        "cpc_type_name": s.application.cpc_type.type_name,
        "case_number": s.application.case_number,
        "expiry_date": s.expiry_date,
    } for s in soas]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def reports_summary(request):
    """Records Officer report: finalized applications (approved/not approved/
    dismissed) broken down by denomination, status, and duration (monthly,
    yearly), plus release status (released vs pending release) and decision."""
    reports_summary.required_role = 'Records Officer'

    finalized_statuses = [
        ApplicationStatus.APPROVED,
        ApplicationStatus.NOT_APPROVED,
        ApplicationStatus.DISMISSED,
    ]
    base = Application.objects.filter(status__in=finalized_statuses)

    by_denomination = [
        {"name": r["cpc_type__type_name"], "total": r["total"]}
        for r in base.values('cpc_type__type_name').annotate(total=Count('id')).order_by('-total')
    ]
    by_status = [
        {"name": r["status"], "total": r["total"]}
        for r in base.values('status').annotate(total=Count('id')).order_by('-total')
    ]
    by_month = [
        {"name": r["month"].strftime('%Y-%m'), "total": r["total"]}
        for r in base.annotate(month=TruncMonth('submitted_at')).values('month').annotate(total=Count('id')).order_by('month')
    ]
    by_year = [
        {"name": r["year"].strftime('%Y'), "total": r["total"]}
        for r in base.annotate(year=TruncYear('submitted_at')).values('year').annotate(total=Count('id')).order_by('year')
    ]

    total = base.count()
    released = Application.objects.filter(status=ApplicationStatus.APPROVED, release__isnull=False).count()
    approved = base.filter(status=ApplicationStatus.APPROVED).count()
    not_approved = base.filter(status=ApplicationStatus.NOT_APPROVED).count()

    return Response({
        "total": total,
        "approved_count": approved,
        "not_approved_count": not_approved,
        "released_count": released,
        "pending_release": approved - released,
        "by_denomination": by_denomination,
        "by_status": by_status,
        "by_month": by_month,
        "by_year": by_year,
        "extra": [
            {
                "key": "release",
                "label": "Release Status",
                "data": [
                    {"name": "Released", "total": released},
                    {"name": "Pending Release", "total": max(0, approved - released)},
                ],
            },
            {
                "key": "decision",
                "label": "Decision",
                "data": [
                    {"name": "Approved", "total": approved},
                    {"name": "Not Approved", "total": not_approved},
                ],
            },
        ],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_cpc_release(request, application_id):
    """Applicant views their own released CPC — soft copy details or pickup instructions."""
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    # Ownership check — applicants can only view their own applications
    if application.applicant_profile.user_id != request.user.id:
        return Response({"error": "You do not have access to this application."}, status=403)

    if application.status != ApplicationStatus.APPROVED:
        return Response({"error": "This application has not been approved yet."}, status=400)

    if not hasattr(application, 'release'):
        return Response({"error": "Your CPC has been approved but is not yet released by the Records Officer."}, status=400)

    return Response({
        **CPCReleaseSerializer(application.release).data,
        "office_hours": LTFRB_OFFICE_HOURS,
        "office_location": LTFRB_OFFICE_LOCATION,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def records_history(request):
    """Records Officer: finalized applications (approved, not approved, or dismissed)."""
    records_history.required_role = 'Records Officer'
    apps = Application.objects.filter(
        status__in=[
            ApplicationStatus.APPROVED,
            ApplicationStatus.NOT_APPROVED,
            ApplicationStatus.DISMISSED,
        ]
    ).order_by('-submitted_at')
    data = [{
        "id": a.id,
        "applicant_name": a.applicant_profile.business_name,
        "cpc_type_name": a.cpc_type.type_name,
        "case_number": a.case_number,
        "docket_number": a.docket_number,
        "status": a.status,
        "released": hasattr(a, 'release'),
        "submitted_at": a.submitted_at,
    } for a in apps]
    return Response(data)