import calendar
from datetime import date, timedelta, datetime

from django.utils import timezone
from django.utils.dateparse import parse_date, parse_time
from django.db import transaction
from django.db.models import Q, Count
from django.db.models.functions import TruncMonth, TruncYear
from rest_framework.decorators import api_view, permission_classes
from rest_framework.negotiation import DefaultContentNegotiation
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.files.base import ContentFile
from django.http import FileResponse, HttpResponse

from core.permissions import HasRole
from applications.models import Application, ApplicationStatus, ApplicationStatusLog, Notification
from accounts.models import ApplicantProfile
from .models import Hearing, NoticeOfHearing, HearingSlot, DecisionOrder, DecisionOrderStatus
from .serializers import HearingSerializer, NoticeOfHearingSerializer, DecisionOrderSerializer
from .document_generation import build_notice_docx, convert_to_pdf
from .utils import (
    notice_prefill, build_notice_content, MAX_SLOTS_PER_DAY,
    is_hearing_day, within_office_hours,
    is_hearing_time_valid, day_booking_count, generate_case_number,
)


NOTICE_FORM_FIELDS = (
    'applicant_name', 'applicant_address', 'applicant_email',
    'case_or_docket_number', 'date_of_filing', 'nature_of_application',
    'route_or_area', 'service_applied_for', 'units_applied_for',
    'hearing_date', 'hearing_time_label', 'venue_or_platform',
    'opposition_period', 'opposition_address', 'foe_period', 'foe_address',
    'hearing_officer',
)


def _notice_values(data):
    """Keep the preview and final document fed by exactly the same form data."""
    return {field: (data.get(field) or '').strip() for field in NOTICE_FORM_FIELDS}


def _can_access_notice_document(request, application):
    role = getattr(getattr(request.user, 'role', None), 'role_name', None)
    if role == 'Legal Officer':
        return True
    return hasattr(request.user, 'applicantprofile') and application.applicant_profile.user_id == request.user.id


class FileContentNegotiation(DefaultContentNegotiation):
    """Allow file-serving views to read ?format=pdf|docx as a plain parameter
    instead of treating it as a DRF renderer request (which would 404 because
    no registered renderer has a 'pdf' format)."""

    def select_renderer(self, request, renderers, format_suffix=None):
        return super().select_renderer(request, renderers, None)


def _file_response_view(view_func):
    view_func.content_negotiation_class = FileContentNegotiation
    return view_func


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def legal_queue(request):
    """Applications that are paid, docketed, and waiting for a hearing to be scheduled."""
    legal_queue.required_role = 'Legal Officer'
    apps = Application.objects.filter(status=ApplicationStatus.PENDING_LEGAL).order_by('submitted_at')
    data = [{
        "id": a.id,
        "applicant_name": a.applicant_profile.business_name,
        "cpc_type_name": a.cpc_type.type_name,
        "docket_number": a.docket_number,
    } for a in apps]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def hearing_slots(request):
    """Returns per-day slot availability for a given month, for the scheduling calendar.
    Each day now includes per-time-slot details."""
    hearing_slots.required_role = 'Legal Officer'
    try:
        year = int(request.query_params.get('year'))
        month = int(request.query_params.get('month'))
    except (TypeError, ValueError):
        return Response({"error": "year and month query params are required."}, status=400)

    num_days = calendar.monthrange(year, month)[1]
    data = []
    for day in range(1, num_days + 1):
        d = date(year, month, day)
        if not is_hearing_day(d):
            data.append({"date": d.isoformat(), "booked": 0, "available": 0})
            continue
        booked = day_booking_count(d)
        data.append({
            "date": d.isoformat(),
            "booked": booked,
            "available": max(0, MAX_SLOTS_PER_DAY - booked),
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def available_slots(request):
    """Return hourly time slots (8 AM–5 PM) for a specific date with booking status."""
    available_slots.required_role = 'Legal Officer'
    ds = request.query_params.get('date')
    if not ds:
        return Response({"error": "date query param is required (YYYY-MM-DD)."}, status=400)
    d = parse_date(ds)
    if not d:
        return Response({"error": "Invalid date."}, status=400)

    if is_hearing_day(d):
        base = datetime(2000, 1, 1, 8, 0, 0)
        all_times = [(base + timedelta(minutes=m)).time() for m in range(0, 9 * 60, 15)]
    else:
        all_times = []

    existing = {s.time: s for s in HearingSlot.objects.filter(date=d)}
    result = []
    for t in all_times:
        slot = existing.get(t)
        result.append({
            "time": t.strftime('%H:%M'),
            "time_label": t.strftime('%I:%M %p'),
            "booked": slot.hearing_id is not None if slot else False,
            "reserved": slot.is_reserved if slot else False,
        })
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def check_availability(request):
    """Return whether an exact date/time falls on a hearing day within office hours
    and is not already booked/reserved and the day is not full."""
    check_availability.required_role = 'Legal Officer'
    ds = request.query_params.get('date')
    ts = request.query_params.get('time')
    if not ds or not ts:
        return Response({"error": "date and time query params are required."}, status=400)
    d = parse_date(ds)
    t = parse_time(ts)
    if not d or not t:
        return Response({"error": "Invalid date or time."}, status=400)

    if not is_hearing_time_valid(d, t):
        return Response({"available": False, "reason": "outside-hours"})
    if day_booking_count(d) >= MAX_SLOTS_PER_DAY:
        return Response({"available": False, "reason": "day-full"})
    slot = HearingSlot.objects.filter(date=d, time=t).first()
    if slot and (slot.hearing_id or slot.is_reserved):
        return Response({"available": False, "reason": "booked"})
    return Response({"available": True})


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRole])
def schedule_hearing(request, application_id):
    """Legal Officer picks a date AND time slot; books the HearingSlot."""
    schedule_hearing.required_role = 'Legal Officer'
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if hasattr(application, 'hearing'):
        return Response(HearingSerializer(application.hearing).data, status=200)

    hearing_date_str = request.data.get('hearing_date')
    hearing_time_str = request.data.get('hearing_time')
    if not hearing_date_str or not hearing_time_str:
        return Response({"error": "hearing_date and hearing_time are required."}, status=400)

    hearing_date = parse_date(hearing_date_str)
    hearing_time = parse_time(hearing_time_str)
    if not hearing_date or not hearing_time:
        return Response({"error": "Invalid date or time format."}, status=400)
    if hearing_date < date.today():
        return Response({"error": "Cannot schedule a hearing in the past."}, status=400)

    if not is_hearing_time_valid(hearing_date, hearing_time):
        return Response(
            {"error": "Select a time within office hours (8:00 AM - 5:00 PM) on a working day."},
            status=400,
        )
    if day_booking_count(hearing_date) >= MAX_SLOTS_PER_DAY:
        return Response({"error": "This day already has the maximum number of hearings."}, status=400)

    try:
        with transaction.atomic():
            slot, created = HearingSlot.objects.get_or_create(
                date=hearing_date, time=hearing_time,
                defaults={'is_reserved': False},
            )
            locked = HearingSlot.objects.select_for_update().get(pk=slot.pk)
            if locked.hearing_id or locked.is_reserved:
                return Response({"error": "This time slot is already booked."}, status=400)

            hearing = Hearing.objects.create(
                application=application,
                hearing_date=hearing_date,
                hearing_time=hearing_time,
                scheduled_by=request.user,
            )
            locked.hearing = hearing
            locked.save(update_fields=['hearing'])
    except Hearing.DoesNotExist:
        return Response({"error": "Could not book the hearing. Please try again."}, status=500)

    ApplicationStatusLog.objects.create(
        application=application, status=application.status,
        changed_by=request.user,
        remarks=f'Hearing scheduled for {hearing_date} at {hearing_time.strftime("%I:%M %p")}.'
    )

    return Response(HearingSerializer(hearing).data, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def notice_detail(request, application_id):
    """Pre-fill data for the Notice of Hearing form (fields a–p), pulled from the
    Application, Hearing, and any previously sent Notice. Serving this for the form
    page that replaced the old free-text draft textarea."""
    notice_detail.required_role = 'Legal Officer'
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if not hasattr(application, 'hearing'):
        return Response({"error": "No hearing scheduled yet."}, status=404)

    prefill = notice_prefill(application) or {}

    if hasattr(application.hearing, 'notice'):
        notice = application.hearing.notice
        data = NoticeOfHearingSerializer(notice).data
        for key in ('applicant_name', 'applicant_address', 'applicant_email',
                    'case_or_docket_number', 'nature_of_application', 'route_or_area',
                    'service_applied_for', 'units_applied_for', 'hearing_time_label',
                    'venue_or_platform', 'opposition_period', 'opposition_address',
                    'foe_period', 'foe_address', 'hearing_officer'):
            if not (data.get(key) or '').strip():
                data[key] = prefill.get(key, '')
        if not data.get('date_of_filing'):
            data['date_of_filing'] = prefill.get('date_of_filing')
        if not data.get('hearing_date'):
            data['hearing_date'] = application.hearing.hearing_date
    else:
        data = {k: prefill.get(k) for k in (
            'applicant_name', 'applicant_address', 'applicant_email',
            'case_or_docket_number', 'date_of_filing', 'nature_of_application',
            'route_or_area', 'service_applied_for', 'units_applied_for',
            'hearing_time_label', 'venue_or_platform',
            'opposition_period', 'opposition_address', 'foe_period', 'foe_address',
        )}
        data.update({
            "id": None,
            "application_id": application.id,
            "docket_number": application.docket_number,
            "hearing_date": application.hearing.hearing_date,
            "hearing_time": application.hearing.hearing_time.strftime('%H:%M') if application.hearing.hearing_time else None,
            "content": build_notice_content(prefill),
            "sent_at": None,
            "created_at": None,
        })

    data["notice_sent"] = data.get("sent_at") is not None
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRole])
def send_notice(request, application_id):
    """Legal Officer sends the generated Notice of Hearing file to the applicant.
    The NoticeOfHearing is persisted ONLY on a successful send. Also notifies the
    applicant so the notice reaches their portal."""
    send_notice.required_role = 'Legal Officer'
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if not hasattr(application, 'hearing'):
        return Response({"error": "Schedule a hearing first."}, status=400)

    if hasattr(application.hearing, 'notice') and application.hearing.notice.sent_at:
        return Response({"error": "Notice already sent."}, status=400)

    fields = _notice_values(request.data)

    date_filing = request.data.get('date_of_filing') or None
    hearing_date = request.data.get('hearing_date') or None

    content = (request.data.get('content') or '').strip() or build_notice_content(
        {**fields,
         'date_of_filing': date_filing or '',
         'hearing_date': hearing_date or ''}
    )

    document_values = {
        **fields,
        'date_of_filing': date_filing,
        'hearing_date': hearing_date,
        'date_issued': timezone.localdate(),
    }
    try:
        docx_bytes = build_notice_docx(document_values)
        pdf_bytes = convert_to_pdf(docx_bytes)
    except Exception as exc:
        return Response(
            {'error': f'Could not generate the Notice of Hearing document: {exc}'},
            status=500,
        )

    with transaction.atomic():
        notice, _ = NoticeOfHearing.objects.update_or_create(
            hearing=application.hearing,
            defaults={
                'content': content,
                'drafted_by': request.user,
                'applicant_name': fields['applicant_name'],
                'applicant_address': fields['applicant_address'],
                'applicant_email': fields['applicant_email'],
                'case_or_docket_number': fields['case_or_docket_number'],
                'date_of_filing': parse_date(date_filing) if date_filing else None,
                'nature_of_application': fields['nature_of_application'],
                'route_or_area': fields['route_or_area'],
                'service_applied_for': fields['service_applied_for'],
                'units_applied_for': fields['units_applied_for'],
                'hearing_date': parse_date(hearing_date) if hearing_date else None,
                'hearing_time_label': fields['hearing_time_label'],
                'venue_or_platform': fields['venue_or_platform'],
                'opposition_period': fields['opposition_period'],
                'opposition_address': fields['opposition_address'],
                'foe_period': fields['foe_period'],
                'foe_address': fields['foe_address'],
                'hearing_officer': fields['hearing_officer'],
                'sent_at': timezone.now(),
            },
        )

        # Persist the exact files Legal previewed before changing the
        # application's workflow state.
        base_name = f'NOH_{application.case_number or application.docket_number or application.id}'
        notice.document_docx.save(f'{base_name}.docx', ContentFile(docx_bytes), save=False)
        notice.document_pdf.save(f'{base_name}.pdf', ContentFile(pdf_bytes), save=False)
        notice.save(update_fields=['document_docx', 'document_pdf'])

        application.status = ApplicationStatus.PENDING_HEARING
        application.save()

        ApplicationStatusLog.objects.create(
            application=application, status=ApplicationStatus.PENDING_HEARING,
            changed_by=request.user,
            remarks='Notice of Hearing sent to applicant.',
        )

        Notification.objects.create(
            user=application.applicant_profile.user,
            application=application,
            title='Notice of Hearing',
            message=(
                f"Your application for {application.cpc_type.type_name} "
                f"(Application #{application.id}) is set for hearing on "
                f"{notice.hearing_date.strftime('%B %d, %Y') if notice.hearing_date else '—'} at "
                f"{notice.hearing_time_label or '—'}"
                f"{' via ' + notice.venue_or_platform if notice.venue_or_platform else ''}. "
                "You may view the official Notice of Hearing in your portal."
            ),
        )

    return Response(NoticeOfHearingSerializer(notice).data, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRole])
def preview_notice_document(request, application_id):
    """Legal Officer preview of the precise PDF that will be sent as the NOH."""
    preview_notice_document.required_role = 'Legal Officer'
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)
    if not hasattr(application, 'hearing'):
        return Response({'error': 'Schedule a hearing first.'}, status=400)
    try:
        values = {
            **_notice_values(request.data),
            'date_issued': timezone.localdate(),
        }
        pdf_bytes = convert_to_pdf(build_notice_docx(values))
    except Exception as exc:
        return Response({'error': f'Could not preview the Notice of Hearing: {exc}'}, status=500)
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = 'inline; filename="Notice_of_Hearing_preview.pdf"'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@_file_response_view
def notice_document(request, application_id):
    """Serve the immutable sent NOH to Legal or its own applicant only."""
    try:
        application = Application.objects.select_related('hearing__notice').get(id=application_id)
    except Application.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)
    if not _can_access_notice_document(request, application):
        return Response({'error': 'You do not have access to this Notice of Hearing.'}, status=403)
    if not hasattr(application, 'hearing') or not hasattr(application.hearing, 'notice'):
        return Response({'error': 'No Notice of Hearing found.'}, status=404)

    notice = application.hearing.notice
    requested_format = request.query_params.get('format', 'pdf').lower()
    document = notice.document_docx if requested_format == 'docx' else notice.document_pdf
    if not document:
        # Legacy notices were sent before document files were persisted.
        # Regenerate the file on the fly from the stored structured fields so the
        # applicant always receives a valid Notice of Hearing.
        try:
            document_bytes = _regenerate_notice_document(notice, requested_format)
        except Exception as exc:
            return Response(
                {'error': f'The Notice of Hearing file could not be regenerated: {exc}'},
                status=500,
            )
        return HttpResponse(
            document_bytes,
            content_type=(
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                if requested_format == 'docx' else 'application/pdf'
            ),
        )

    content_type = (
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        if requested_format == 'docx' else 'application/pdf'
    )
    filename = f'Notice_of_Hearing_{application.case_number or application.docket_number or application.id}.{requested_format}'
    return FileResponse(document.open('rb'), as_attachment=requested_format == 'docx', filename=filename, content_type=content_type)


def _regenerate_notice_document(notice, requested_format='pdf'):
    """Rebuild a Notice of Hearing file from the stored structured fields."""
    values = {
        'applicant_name': notice.applicant_name,
        'applicant_address': notice.applicant_address,
        'applicant_email': notice.applicant_email,
        'case_or_docket_number': notice.case_or_docket_number,
        'date_of_filing': notice.date_of_filing,
        'nature_of_application': notice.nature_of_application,
        'route_or_area': notice.route_or_area,
        'service_applied_for': notice.service_applied_for,
        'units_applied_for': notice.units_applied_for,
        'hearing_date': notice.hearing_date,
        'hearing_time_label': notice.hearing_time_label,
        'venue_or_platform': notice.venue_or_platform,
        'opposition_period': notice.opposition_period,
        'opposition_address': notice.opposition_address,
        'foe_period': notice.foe_period,
        'foe_address': notice.foe_address,
        'hearing_officer': notice.hearing_officer,
        'date_issued': notice.sent_at.date() if notice.sent_at else date.today(),
    }
    docx_bytes = build_notice_docx(values)
    if requested_format == 'docx':
        return docx_bytes
    return convert_to_pdf(docx_bytes)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def applicant_notice(request, application_id):
    """Applicant: view the official Notice of Hearing for their own application."""
    try:
        profile = ApplicantProfile.objects.get(user=request.user)
    except ApplicantProfile.DoesNotExist:
        return Response({"error": "No applicant profile."}, status=403)
    try:
        application = Application.objects.get(id=application_id, applicant_profile=profile)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if not hasattr(application, 'hearing') or not hasattr(application.hearing, 'notice'):
        return Response({"error": "No Notice of Hearing found."}, status=404)

    notice = application.hearing.notice
    if not notice.sent_at:
        return Response({"error": "No Notice of Hearing found."}, status=404)

    data = NoticeOfHearingSerializer(notice).data
    data["hearing_date"] = notice.hearing_date or notice.hearing.hearing_date
    data["hearing_time"] = notice.hearing.hearing_time.strftime('%H:%M') if notice.hearing.hearing_time else None
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def decision_queue(request):
    """Applications whose Notice of Hearing was sent — ready for a Decision/Order to be drafted."""
    decision_queue.required_role = 'Legal Officer'
    apps = Application.objects.filter(status=ApplicationStatus.PENDING_HEARING).order_by('hearing__hearing_date')
    data = [{
        "id": a.id,
        "applicant_name": a.applicant_profile.business_name,
        "cpc_type_name": a.cpc_type.type_name,
        "docket_number": a.docket_number,
        "hearing_date": a.hearing.hearing_date if hasattr(a, 'hearing') else None,
    } for a in apps]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def decision_detail(request, application_id):
    """Fetch the current draft, or a blank template if none exists yet."""
    decision_detail.required_role = 'Legal Officer'
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if hasattr(application, 'decision_order'):
        return Response(DecisionOrderSerializer(application.decision_order).data)

    return Response({
        "application": application.id,
        "applicant_name": application.applicant_profile.business_name,
        "docket_number": application.docket_number,
        "case_number": None,
        "decision_type": "",
        "content": "",
        "status": None,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRole])
def draft_decision(request, application_id):
    """Legal Officer drafts/edits the Decision/Order and assigns the Case Number."""
    draft_decision.required_role = 'Legal Officer'
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if hasattr(application, 'decision_order') and application.decision_order.status != DecisionOrderStatus.DRAFT:
        return Response({"error": "Decision/Order already forwarded and can no longer be edited here."}, status=400)

    decision_type = request.data.get('decision_type')
    content = request.data.get('content')

    if decision_type not in ('approved', 'not_approved'):
        return Response({"error": "decision_type must be 'approved' or 'not_approved'."}, status=400)
    if not content:
        return Response({"error": "content is required."}, status=400)

    decision, _ = DecisionOrder.objects.get_or_create(
        application=application,
        defaults={'decision_type': decision_type, 'content': content, 'drafted_by': request.user}
    )
    decision.decision_type = decision_type
    decision.content = content
    decision.drafted_by = request.user
    decision.save()

    # Case Number replaces the Docket Number once the hearing stage is reached
    if not application.case_number:
        application.case_number = generate_case_number()
        application.save()

    return Response(DecisionOrderSerializer(decision).data, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRole])
def forward_to_ctdo_endorsement(request, application_id):
    """Legal Officer forwards the drafted Decision/Order to the CTDO for endorsement."""
    forward_to_ctdo_endorsement.required_role = 'Legal Officer'
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if not hasattr(application, 'decision_order'):
        return Response({"error": "Draft the Decision/Order first."}, status=400)

    decision = application.decision_order
    if decision.status != DecisionOrderStatus.DRAFT:
        return Response({"error": "Already forwarded."}, status=400)

    with transaction.atomic():
        decision.status = DecisionOrderStatus.PENDING_CTDO
        decision.save()

        application.status = ApplicationStatus.PENDING_CTDO_ENDORSEMENT
        application.save()

        ApplicationStatusLog.objects.create(
            application=application, status=ApplicationStatus.PENDING_CTDO_ENDORSEMENT,
            changed_by=request.user,
            remarks=f'Decision/Order ({decision.decision_type}) drafted, Case No. {application.case_number} assigned, forwarded to CTDO for endorsement.'
        )

    return Response(DecisionOrderSerializer(decision).data, status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def ctdo_endorsement_queue(request):
    """Applications whose Decision/Order has been drafted and forwarded, waiting for CTDO endorsement."""
    ctdo_endorsement_queue.required_role = 'CTDO'
    apps = Application.objects.filter(status=ApplicationStatus.PENDING_CTDO_ENDORSEMENT).order_by('submitted_at')
    data = [{
        "id": a.id,
        "applicant_name": a.applicant_profile.business_name,
        "cpc_type_name": a.cpc_type.type_name,
        "docket_number": a.docket_number,
        "case_number": a.case_number,
        "decision_type": a.decision_order.decision_type if hasattr(a, 'decision_order') else None,
    } for a in apps]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def decision_for_endorsement(request, application_id):
    """CTDO views the full Decision/Order content before endorsing."""
    decision_for_endorsement.required_role = 'CTDO'
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if not hasattr(application, 'decision_order'):
        return Response({"error": "No Decision/Order drafted for this application."}, status=404)

    return Response(DecisionOrderSerializer(application.decision_order).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRole])
def endorse_decision(request, application_id):
    """CTDO attaches their e-signature as endorsement, forwards to ORD for approval."""
    endorse_decision.required_role = 'CTDO'
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if not hasattr(application, 'decision_order'):
        return Response({"error": "No Decision/Order to endorse."}, status=400)

    decision = application.decision_order
    if decision.status != DecisionOrderStatus.PENDING_CTDO:
        return Response({"error": "This Decision/Order is not awaiting CTDO endorsement."}, status=400)

    decision.status = DecisionOrderStatus.PENDING_ORD
    decision.ctdo_endorsed_by = request.user
    decision.ctdo_endorsed_at = timezone.now()
    decision.save()

    application.status = ApplicationStatus.PENDING_ORD
    application.save()

    ApplicationStatusLog.objects.create(
        application=application, status=ApplicationStatus.PENDING_ORD,
        changed_by=request.user,
        remarks=f'Decision/Order endorsed by CTDO. Forwarded to ORD for approval.'
    )

    return Response(DecisionOrderSerializer(decision).data, status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def ord_queue(request):
    """Applications whose Decision/Order has been endorsed by CTDO, waiting for ORD approval."""
    ord_queue.required_role = 'ORD'
    apps = Application.objects.filter(status=ApplicationStatus.PENDING_ORD).order_by('submitted_at')
    data = [{
        "id": a.id,
        "applicant_name": a.applicant_profile.business_name,
        "cpc_type_name": a.cpc_type.type_name,
        "docket_number": a.docket_number,
        "case_number": a.case_number,
        "decision_type": a.decision_order.decision_type if hasattr(a, 'decision_order') else None,
    } for a in apps]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def decision_for_approval(request, application_id):
    """ORD views the full Decision/Order, including CTDO endorsement info, before approving."""
    decision_for_approval.required_role = 'ORD'
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if not hasattr(application, 'decision_order'):
        return Response({"error": "No Decision/Order for this application."}, status=404)

    return Response(DecisionOrderSerializer(application.decision_order).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRole])
def approve_decision(request, application_id):
    """ORD attaches their e-signature, finalizing the Decision/Order.
    Application status becomes Approved or Not Approved based on the decision,
    and either way it's now ready for the Records Officer."""
    approve_decision.required_role = 'ORD'
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    if not hasattr(application, 'decision_order'):
        return Response({"error": "No Decision/Order to approve."}, status=400)

    decision = application.decision_order
    if decision.status != DecisionOrderStatus.PENDING_ORD:
        return Response({"error": "This Decision/Order is not awaiting ORD approval."}, status=400)

    with transaction.atomic():
        decision.status = DecisionOrderStatus.FINALIZED
        decision.ord_approved_by = request.user
        decision.ord_approved_at = timezone.now()
        decision.save()

        application.status = (
            ApplicationStatus.APPROVED if decision.decision_type == 'approved'
            else ApplicationStatus.NOT_APPROVED
        )
        application.save()

        ApplicationStatusLog.objects.create(
            application=application, status=application.status,
            changed_by=request.user,
            remarks=f'Decision/Order approved and finalized by ORD. Case No. {application.case_number}. Forwarded to Records Officer.'
        )

    return Response(DecisionOrderSerializer(decision).data, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def legal_reports(request):
    """Legal Officer report: scheduled hearings broken down by denomination,
    status, and duration (monthly/yearly), plus upcoming vs held. Keeps dashboard KPIs."""
    legal_reports.required_role = 'Legal Officer'
    today = timezone.localdate()
    hearings = Hearing.objects.select_related('application')
    upcoming = hearings.filter(hearing_date__gte=today).count()
    held = hearings.filter(hearing_date__lt=today).count()
    return Response({
        "total": hearings.count(),
        "by_denomination": [
            {"name": r["application__cpc_type__type_name"], "total": r["total"]}
            for r in hearings.values('application__cpc_type__type_name').annotate(total=Count('id')).order_by('-total')
        ],
        "by_status": [
            {"name": r["application__status"], "total": r["total"]}
            for r in hearings.values('application__status').annotate(total=Count('id')).order_by('-total')
        ],
        "by_month": [
            {"name": r["month"].strftime('%Y-%m'), "total": r["total"]}
            for r in hearings.annotate(month=TruncMonth('hearing_date')).values('month').annotate(total=Count('id')).order_by('month')
        ],
        "by_year": [
            {"name": r["year"].strftime('%Y'), "total": r["total"]}
            for r in hearings.annotate(year=TruncYear('hearing_date')).values('year').annotate(total=Count('id')).order_by('year')
        ],
        "extra": [{
            "key": "hearing_state",
            "label": "Hearing Status",
            "data": [
                {"name": "Upcoming", "total": upcoming},
                {"name": "Held", "total": held},
            ],
        }],
        "awaiting_scheduling": Application.objects.filter(status=ApplicationStatus.PENDING_LEGAL).count(),
        "awaiting_decision": Application.objects.filter(status=ApplicationStatus.PENDING_HEARING).count(),
        "upcoming_hearings": upcoming,
        "hearings_held": held,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def ord_reports(request):
    """ORD report: finalized decision orders broken down by denomination,
    status, and duration (monthly/yearly), plus approved vs not approved.
    Keeps dashboard KPIs."""
    ord_reports.required_role = 'ORD'
    finalized = DecisionOrder.objects.select_related('application')
    total = finalized.filter(status=DecisionOrderStatus.FINALIZED).count()
    approved = finalized.filter(status=DecisionOrderStatus.FINALIZED, decision_type='approved').count()
    not_approved = finalized.filter(status=DecisionOrderStatus.FINALIZED, decision_type='not_approved').count()
    return Response({
        "total": total,
        "by_denomination": [
            {"name": r["application__cpc_type__type_name"], "total": r["total"]}
            for r in finalized.values('application__cpc_type__type_name').annotate(total=Count('id')).order_by('-total')
        ],
        "by_status": [
            {"name": r["application__status"], "total": r["total"]}
            for r in finalized.values('application__status').annotate(total=Count('id')).order_by('-total')
        ],
        "by_month": [
            {"name": r["month"].strftime('%Y-%m'), "total": r["total"]}
            for r in finalized.annotate(month=TruncMonth('drafted_at')).values('month').annotate(total=Count('id')).order_by('month')
        ],
        "by_year": [
            {"name": r["year"].strftime('%Y'), "total": r["total"]}
            for r in finalized.annotate(year=TruncYear('drafted_at')).values('year').annotate(total=Count('id')).order_by('year')
        ],
        "extra": [{
            "key": "decision",
            "label": "Decision",
            "data": [
                {"name": "Approved", "total": approved},
                {"name": "Not Approved", "total": not_approved},
            ],
        }],
        "awaiting_approval": Application.objects.filter(status=ApplicationStatus.PENDING_ORD).count(),
        "approved": approved,
        "not_approved": not_approved,
        "total_decisions": total,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def ctdo_reports(request):
    """CTDO report: validated applications (those past CTDO stage) broken down
    by denomination, status, and duration (monthly/yearly), plus endorsement
    status of Decision Orders."""
    ctdo_reports.required_role = 'CTDO'
    validated = Application.objects.exclude(
        status__in=[
            ApplicationStatus.PENDING_UPLOAD,
            ApplicationStatus.PENDING_RECEIVING,
            ApplicationStatus.PENDING_CTDO,
        ]
    )
    total = validated.count()
    by_denomination = [
        {"name": r["cpc_type__type_name"], "total": r["total"]}
        for r in validated.values('cpc_type__type_name').annotate(total=Count('id')).order_by('-total')
    ]
    by_status = [
        {"name": r["status"], "total": r["total"]}
        for r in validated.values('status').annotate(total=Count('id')).order_by('-total')
    ]
    by_month = [
        {"name": r["month"].strftime('%Y-%m'), "total": r["total"]}
        for r in validated.annotate(month=TruncMonth('submitted_at')).values('month').annotate(total=Count('id')).order_by('month')
    ]
    by_year = [
        {"name": r["year"].strftime('%Y'), "total": r["total"]}
        for r in validated.annotate(year=TruncYear('submitted_at')).values('year').annotate(total=Count('id')).order_by('year')
    ]
    endorsed = DecisionOrder.objects.filter(ctdo_endorsed_by__isnull=False)
    pending_endorsement = DecisionOrder.objects.filter(
        status=DecisionOrderStatus.PENDING_CTDO
    ).count()
    return Response({
        "total": total,
        "by_denomination": by_denomination,
        "by_status": by_status,
        "by_month": by_month,
        "by_year": by_year,
        "extra": [{
            "key": "endorsement",
            "label": "Endorsement Status",
            "data": [
                {"name": "Endorsed", "total": endorsed.count()},
                {"name": "Pending", "total": pending_endorsement},
            ],
        }],
        "pending_validation": Application.objects.filter(
            status=ApplicationStatus.PENDING_CTDO
        ).count(),
        "endorsed_decisions": endorsed.count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def legal_history(request):
    """Legal Officer: applications in the legal flow or already processed."""
    legal_history.required_role = 'Legal Officer'
    apps = Application.objects.filter(
        Q(status__in=[
            ApplicationStatus.PENDING_LEGAL,
            ApplicationStatus.PENDING_HEARING,
            ApplicationStatus.PENDING_CTDO_ENDORSEMENT,
            ApplicationStatus.PENDING_ORD,
            ApplicationStatus.APPROVED,
            ApplicationStatus.NOT_APPROVED,
            ApplicationStatus.DISMISSED,
        ]) |
        Q(hearing__isnull=False)
    ).order_by('-submitted_at')
    data = [{
        "id": a.id,
        "applicant_name": a.applicant_profile.business_name,
        "cpc_type_name": a.cpc_type.type_name,
        "case_number": a.case_number,
        "docket_number": a.docket_number,
        "status": a.status,
        "submitted_at": a.submitted_at,
    } for a in apps]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def ord_history(request):
    """ORD: applications that have reached or passed the ORD stage."""
    ord_history.required_role = 'ORD'
    apps = Application.objects.filter(
        Q(status__in=[
            ApplicationStatus.PENDING_ORD,
            ApplicationStatus.APPROVED,
            ApplicationStatus.NOT_APPROVED,
            ApplicationStatus.DISMISSED,
        ]) |
        Q(decision_order__isnull=False)
    ).order_by('-submitted_at')
    data = [{
        "id": a.id,
        "applicant_name": a.applicant_profile.business_name,
        "cpc_type_name": a.cpc_type.type_name,
        "case_number": a.case_number,
        "docket_number": a.docket_number,
        "status": a.status,
        "submitted_at": a.submitted_at,
    } for a in apps]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def legal_schedule(request):
    """Legal Officer: all hearings for the calendar view."""
    legal_schedule.required_role = 'Legal Officer'
    hearings = Hearing.objects.select_related(
        'application', 'application__applicant_profile', 'application__cpc_type', 'notice',
    ).order_by('hearing_date', 'hearing_time')
    data = []
    for h in hearings:
        notice = getattr(h, 'notice', None)
        data.append({
            "hearing_date": str(h.hearing_date),
            "hearing_time": h.hearing_time.strftime('%H:%M') if h.hearing_time else None,
            "application_id": h.application_id,
            "applicant_name": h.application.applicant_profile.business_name,
            "cpc_type_name": h.application.cpc_type.type_name,
            "docket_number": h.application.docket_number,
            "case_number": h.application.case_number,
            "notice_sent": notice.sent_at is not None if notice else False,
            "scheduled_at": h.scheduled_at.isoformat(),
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def ord_schedule(request):
    """ORD: view all scheduled hearings for the calendar."""
    ord_schedule.required_role = 'ORD'
    hearings = Hearing.objects.select_related(
        'application', 'application__applicant_profile', 'application__cpc_type', 'notice',
    ).order_by('hearing_date', 'hearing_time')
    data = []
    for h in hearings:
        notice = getattr(h, 'notice', None)
        data.append({
            "hearing_date": str(h.hearing_date),
            "hearing_time": h.hearing_time.strftime('%H:%M') if h.hearing_time else None,
            "application_id": h.application_id,
            "applicant_name": h.application.applicant_profile.business_name,
            "cpc_type_name": h.application.cpc_type.type_name,
            "docket_number": h.application.docket_number,
            "case_number": h.application.case_number,
            "notice_sent": notice.sent_at is not None if notice else False,
            "scheduled_at": h.scheduled_at.isoformat(),
        })
    return Response(data)
