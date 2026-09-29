from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.db.models import Q, Count
from django.db.models.functions import TruncMonth, TruncYear
from accounts.models import ApplicantProfile
from core.models import RequirementType
from .models import Application, UploadedDocument, ApplicationStatus, ApplicationStatusLog, Notification, ApplicationDraft, DraftDocument
from .serializers import ApplicationSerializer, UploadedDocumentSerializer, ApplicationDraftSerializer, DraftDocumentSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_application(request):
    """Applicant clicks 'Apply for CPC' after selecting a denomination."""
    try:
        profile = ApplicantProfile.objects.get(user=request.user)
    except ApplicantProfile.DoesNotExist:
        return Response({"error": "No applicant profile found for this user."}, status=400)

    serializer = ApplicationSerializer(data=request.data)
    if serializer.is_valid():
        application = serializer.save(applicant_profile=profile)
        ApplicationStatusLog.objects.create(
            application=application,
            status=application.status,
            changed_by=request.user,
            remarks="Application draft created by applicant. Awaiting requirement upload."
        )
        return Response(ApplicationSerializer(application).data, status=201)
    return Response(serializer.errors, status=400)


def _get_own_draft(request, draft_id):
    """Helper to fetch a draft belonging to the requesting applicant."""
    profile = ApplicantProfile.objects.get(user=request.user)
    return ApplicationDraft.objects.get(id=draft_id, applicant_profile=profile)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_draft(request):
    """Applicant starts an in-progress CPC application. Creates an ApplicationDraft
    only (NOT an Application) — no application number is issued yet. The real
    Application is created only when the draft is finalized with all requirements."""
    try:
        profile = ApplicantProfile.objects.get(user=request.user)
    except ApplicantProfile.DoesNotExist:
        return Response({"error": "No applicant profile found for this user."}, status=400)

    serializer = ApplicationDraftSerializer(data=request.data)
    if serializer.is_valid():
        draft = serializer.save(applicant_profile=profile)
        return Response(ApplicationDraftSerializer(draft).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_drafts(request):
    """List all in-progress drafts belonging to the logged-in applicant."""
    try:
        profile = ApplicantProfile.objects.get(user=request.user)
    except ApplicantProfile.DoesNotExist:
        return Response([], status=200)
    drafts = ApplicationDraft.objects.filter(applicant_profile=profile).order_by('-updated_at')
    serializer = ApplicationDraftSerializer(drafts, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def draft_detail(request, draft_id):
    draft = _get_own_draft(request, draft_id)
    return Response(ApplicationDraftSerializer(draft).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_draft_document(request, draft_id):
    """Upload or replace a single requirement file on an in-progress draft."""
    draft = _get_own_draft(request, draft_id)
    requirement_type = request.data.get('requirement_type')
    file = request.FILES.get('file')
    if not requirement_type or not file:
        return Response({"error": "requirement_type and file are required."}, status=400)

    doc, created = DraftDocument.objects.update_or_create(
        draft=draft,
        requirement_type_id=requirement_type,
        defaults={'file': file},
    )
    return Response(DraftDocumentSerializer(doc).data, status=201 if created else 200)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_draft_document(request, draft_id, document_id):
    """Remove a single uploaded requirement file from a draft."""
    draft = _get_own_draft(request, draft_id)
    doc = DraftDocument.objects.get(id=document_id, draft=draft)
    doc.delete()
    return Response({"message": "Document removed."})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_draft(request, draft_id):
    """Discard an in-progress draft entirely."""
    draft = _get_own_draft(request, draft_id)
    draft.delete()
    return Response({"message": "Draft discarded."})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def finalize_draft(request, draft_id):
    """Applicant submits a complete draft: creates the real Application (with its
    application number), moves all uploaded draft documents into it, logs the
    status change, and deletes the draft. Only runs when ALL requirements are present."""
    try:
        profile = ApplicantProfile.objects.get(user=request.user)
    except ApplicantProfile.DoesNotExist:
        return Response({"error": "No applicant profile found for this user."}, status=400)
    draft = _get_own_draft(request, draft_id)

    required = RequirementType.objects.count()
    uploaded = draft.documents.count()
    if uploaded < required:
        return Response(
            {"error": f"Upload all requirements first ({uploaded}/{required})."},
            status=400,
        )

    application = Application.objects.create(
        applicant_profile=profile,
        cpc_type=draft.cpc_type,
        plate_number=draft.plate_number,
        status=ApplicationStatus.PENDING_RECEIVING,
    )
    for d in draft.documents.all():
        UploadedDocument.objects.create(
            application=application,
            requirement_type=d.requirement_type,
            file=d.file,
            ocr_status='verified',  # placeholder — real OCR check replaces this in Month 2
        )
    application.save()
    ApplicationStatusLog.objects.create(
        application=application,
        status=ApplicationStatus.PENDING_RECEIVING,
        changed_by=request.user,
        remarks="Applicant submitted all requirements. Application forwarded to Receiving Officer.",
    )
    draft.delete()
    return Response({"id": application.id, "message": "Application submitted for review."})



@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_document(request):
    """Handles a single requirement document upload for a given application."""
    serializer = UploadedDocumentSerializer(data=request.data)
    if serializer.is_valid():
        doc = serializer.save()
        # Placeholder: OCR check will replace this in Month 2.
        # For now, mark as verified automatically so the flow can proceed.
        doc.ocr_status = 'verified'
        doc.save()
        return Response(UploadedDocumentSerializer(doc).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_applications(request):
    """List all applications belonging to the logged-in applicant."""
    try:
        profile = ApplicantProfile.objects.get(user=request.user)
    except ApplicantProfile.DoesNotExist:
        return Response([], status=200)

    apps = Application.objects.filter(applicant_profile=profile).order_by('-submitted_at')
    serializer = ApplicationSerializer(apps, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_for_review(request, application_id):
    """Applicant finalizes an application: only moves it to Receiving Officer
    (pending_receiving) after ALL requirements have been uploaded. Incomplete
    applications stay in 'pending_upload' (draft) and do not reach ROA."""
    try:
        profile = ApplicantProfile.objects.get(user=request.user)
        application = Application.objects.get(id=application_id, applicant_profile=profile)
    except ApplicantProfile.DoesNotExist:
        return Response({"error": "No applicant profile found for this user."}, status=400)
    except Application.DoesNotExist:
        return Response({"error": "Application not found."}, status=404)

    required = RequirementType.objects.count()
    uploaded = application.documents.count()

    if uploaded < required:
        return Response(
            {"error": f"Upload all requirements first ({uploaded}/{required})."},
            status=400,
        )

    application.status = ApplicationStatus.PENDING_RECEIVING
    application.save()
    ApplicationStatusLog.objects.create(
        application=application,
        status=ApplicationStatus.PENDING_RECEIVING,
        changed_by=request.user,
        remarks="Applicant submitted all requirements. Application forwarded to Receiving Officer."
    )
    return Response({"message": "Application submitted for review.", "status": application.status})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def application_documents(request, application_id):
    """List uploaded documents for a specific application."""
    docs = UploadedDocument.objects.filter(application_id=application_id)
    serializer = UploadedDocumentSerializer(docs, many=True)
    return Response(serializer.data)


from core.permissions import HasRole
from .serializers import ApplicationDetailSerializer


class ReceivingQueueView:
    """Not a real class-based view — see function below. Kept here as a comment marker."""
    pass


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def receiving_queue(request):
    """List all applications waiting for Receiving Officer review."""
    receiving_queue.required_role = 'Receiving Officer'
    apps = Application.objects.filter(status='pending_receiving').order_by('submitted_at')
    serializer = ApplicationDetailSerializer(apps, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def application_detail(request, application_id):
    """View full details + documents for one application (any staff role can view)."""
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)
    serializer = ApplicationDetailSerializer(application)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRole])
def forward_to_ctdo(request, application_id):
    """Receiving Officer confirms checklist is complete, forwards to CTDO."""
    forward_to_ctdo.required_role = 'Receiving Officer'
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    application.status = 'pending_ctdo'
    application.save()
    ApplicationStatusLog.objects.create(
        application=application,
        status='pending_ctdo',
        changed_by=request.user,
        remarks='Requirements checklist confirmed complete by Receiving Officer.'
    )
    # NOTE: is_resubmitted is intentionally NOT cleared here. It marks which
    # document(s) were re-uploaded by the applicant this correction round so
    # that the CTDO's review knows to only re-flag the re-uploaded document(s)
    # and treat all previously-validated documents as final. The marker is
    # cleared when the CTDO finalizes the next round in ctdo_decision.
    return Response({"message": "Application forwarded to CTDO.", "status": application.status})


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRole])
def update_receiving_review(request, document_id):
    """Receiving Officer rates a single requirement as Good or Not Good.
    When Not Good, a remark is mandatory for the CTDO's reference."""
    update_receiving_review.required_role = 'Receiving Officer'
    try:
        doc = UploadedDocument.objects.get(id=document_id)
    except UploadedDocument.DoesNotExist:
        return Response({"error": "Document not found."}, status=404)

    status = request.data.get('review_status')
    if status not in ('good', 'not_good', 'unchecked'):
        return Response({"error": "review_status must be 'good', 'not_good' or 'unchecked'."}, status=400)

    remarks = (request.data.get('remarks') or '').strip()

    if status == 'not_good' and not remarks:
        return Response(
            {"error": "A remark is required when marking a requirement as Not Good."},
            status=400,
        )

    doc.receiving_review_status = status
    if status == 'not_good':
        doc.receiving_review_remarks = remarks
    else:
        doc.receiving_review_remarks = None
    doc.save()
    return Response(UploadedDocumentSerializer(doc).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def application_history(request):
    """Receiving Officer: full list of all applications already forwarded
    to the CTDO (i.e., sent out of the receiving stage), including those
    that were never followed up downstream."""
    application_history.required_role = 'Receiving Officer'
    apps = Application.objects.exclude(
        status__in=[ApplicationStatus.PENDING_UPLOAD, ApplicationStatus.PENDING_RECEIVING]
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
def receiving_search(request):
    """Receiving Officer: search submitted applications by case number,
    docket number, or applicant name."""
    receiving_search.required_role = 'Receiving Officer'
    query = request.query_params.get('q', '').strip()
    if not query:
        return Response([])
    apps = Application.objects.exclude(status=ApplicationStatus.PENDING_UPLOAD).filter(
        Q(case_number__icontains=query) |
        Q(docket_number__icontains=query) |
        Q(applicant_profile__business_name__icontains=query)
    ).order_by('-submitted_at')[:50]
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
def ctdo_search(request):
    """CTDO: search applications by case number, docket number, or applicant name."""
    ctdo_search.required_role = 'CTDO'
    query = request.query_params.get('q', '').strip()
    if not query:
        return Response([])
    apps = Application.objects.exclude(status=ApplicationStatus.PENDING_UPLOAD).filter(
        Q(case_number__icontains=query) |
        Q(docket_number__icontains=query) |
        Q(applicant_profile__business_name__icontains=query)
    ).order_by('-submitted_at')[:50]
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
def assessment_search(request):
    """Financial Analyst: search applications by case number, docket number, or applicant name."""
    assessment_search.required_role = 'Financial Analyst'
    query = request.query_params.get('q', '').strip()
    if not query:
        return Response([])
    apps = Application.objects.exclude(status=ApplicationStatus.PENDING_UPLOAD).filter(
        Q(case_number__icontains=query) |
        Q(docket_number__icontains=query) |
        Q(applicant_profile__business_name__icontains=query)
    ).order_by('-submitted_at')[:50]
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
def cashier_search(request):
    """Cashier: search applications by case number, docket number, or applicant name."""
    cashier_search.required_role = 'Cashier'
    query = request.query_params.get('q', '').strip()
    if not query:
        return Response([])
    apps = Application.objects.exclude(status=ApplicationStatus.PENDING_UPLOAD).filter(
        Q(case_number__icontains=query) |
        Q(docket_number__icontains=query) |
        Q(applicant_profile__business_name__icontains=query)
    ).order_by('-submitted_at')[:50]
    data = [{
        "id": a.id,
        "applicant_name": a.applicant_profile.business_name,
        "cpc_type_name": a.cpc_type.type_name,
        "case_number": a.case_number,
        "docket_number": a.docket_number,
        "status": a.status,
        "payment_status": a.payment.status if hasattr(a, 'payment') else None,
        "submitted_at": a.submitted_at,
    } for a in apps]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def case_search(request):
    """Shared case search — returns all processed applications with a case number.
    Any authenticated user can search; results are read-only."""
    query = request.query_params.get('q', '').strip()
    if not query:
        return Response([])
    apps = Application.objects.filter(
        Q(case_number__icontains=query) |
        Q(docket_number__icontains=query) |
        Q(applicant_profile__business_name__icontains=query)
    ).exclude(
        status__in=[
            ApplicationStatus.PENDING_UPLOAD,
            ApplicationStatus.PENDING_RECEIVING,
        ]
    ).order_by('-submitted_at')[:50]
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


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def receiving_reports(request):
    """Receiving Officer: counts of SUCCESSFUL applications (those that
    passed receiving review and CTDO validation) grouped by status,
    by CPC denomination, and by duration (monthly and yearly)."""
    receiving_reports.required_role = 'Receiving Officer'

    # Successful = forwarded to CTDO and passed validation (moved downstream).
    # Excludes pending uploads, needs correction, pending receiving, pending CTDO.
    successful_statuses = [
        ApplicationStatus.PENDING_ASSESSMENT,
        ApplicationStatus.PENDING_PAYMENT,
        ApplicationStatus.PENDING_LEGAL,
        ApplicationStatus.PENDING_HEARING,
        ApplicationStatus.PENDING_CTDO_ENDORSEMENT,
        ApplicationStatus.PENDING_ORD,
        ApplicationStatus.APPROVED,
        ApplicationStatus.NOT_APPROVED,
        ApplicationStatus.DISMISSED,
    ]
    base = Application.objects.filter(status__in=successful_statuses)

    by_denomination = list(
        base.values('cpc_type__type_name')
        .annotate(total=Count('id'))
        .order_by('-total')
    )
    by_status = list(
        base.values('status')
        .annotate(total=Count('id'))
        .order_by('-total')
    )
    by_month = list(
        base.annotate(month=TruncMonth('submitted_at'))
        .values('month')
        .annotate(total=Count('id'))
        .order_by('month')
    )
    by_year = list(
        base.annotate(year=TruncYear('submitted_at'))
        .values('year')
        .annotate(total=Count('id'))
        .order_by('year')
    )
    return Response({
        "total_successful": base.count(),
        "by_denomination": by_denomination,
        "by_status": by_status,
        "by_month": by_month,
        "by_year": by_year,
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def ctdo_queue(request):
    """List all applications waiting for CTDO legality validation."""
    ctdo_queue.required_role = 'CTDO'
    apps = Application.objects.filter(status='pending_ctdo').order_by('submitted_at')
    serializer = ApplicationDetailSerializer(apps, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasRole])
def ctdo_history(request):
    """CTDO: applications already validated and moved out of the CTDO queue
    (forwarded to the Financial Analyst, sent back for correction, or any
    later stage)."""
    ctdo_history.required_role = 'CTDO'
    apps = Application.objects.exclude(
        status__in=[
            ApplicationStatus.PENDING_UPLOAD,
            ApplicationStatus.PENDING_RECEIVING,
            ApplicationStatus.PENDING_CTDO,
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
    } for a in apps]
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRole])
def flag_document(request, document_id):
    """CTDO flags a specific document as invalid with a reason."""
    flag_document.required_role = 'CTDO'
    try:
        doc = UploadedDocument.objects.get(id=document_id)
    except UploadedDocument.DoesNotExist:
        return Response({"error": "Document not found."}, status=404)

    remarks = request.data.get('remarks', '')
    doc.ocr_status = 'rejected'
    doc.flag_remarks = remarks
    doc.save()
    return Response({"message": "Document flagged as invalid.", "document_id": doc.id})


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRole])
def unflag_document(request, document_id):
    """CTDO dismisses/undoes a flag on a document (e.g. it was flagged by mistake).
    Reverts the document back to a valid/unflagged state. The applicant is only
    asked to re-upload still-flagged documents, so dismissing means this one is
    considered valid again."""
    unflag_document.required_role = 'CTDO'
    try:
        doc = UploadedDocument.objects.get(id=document_id)
    except UploadedDocument.DoesNotExist:
        return Response({"error": "Document not found."}, status=404)

    if doc.ocr_status != 'rejected':
        return Response({"error": "This document is not currently flagged as invalid."}, status=400)

    doc.ocr_status = 'verified'
    doc.flag_remarks = None
    doc.save()
    return Response({"message": "Flag dismissed. Document considered valid again.", "document_id": doc.id})


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasRole])
def ctdo_decision(request, application_id):
    """CTDO finalizes review: forwards to Financial Analyst if all docs valid,
    or sends back to applicant if any document is flagged."""
    ctdo_decision.required_role = 'CTDO'
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    has_flagged = application.documents.filter(ocr_status='rejected').exists()

    if has_flagged:
        application.status = 'needs_correction'
        remarks = 'One or more documents flagged as invalid by CTDO. Sent back to applicant for re-upload.'
    else:
        application.status = 'pending_assessment'
        remarks = 'All documents validated by CTDO. Forwarded to Financial Analyst.'

    application.save()
    ApplicationStatusLog.objects.create(
        application=application, status=application.status,
        changed_by=request.user, remarks=remarks
    )

    # End the current correction round: clear the re-upload markers so that in a
    # future round ONLY the document(s) flagged this time become actionable for
    # the applicant/ROA/CTDO, and previously-validated documents stay locked.
    application.documents.update(is_resubmitted=False)

    if has_flagged:
        # Notify the applicant about each flagged document so they know exactly
        # which ones to re-upload and why.
        from core.models import RequirementType
        user = application.applicant_profile.user
        flagged = application.documents.filter(ocr_status='rejected')
        for doc in flagged:
            req_name = ''
            try:
                req_name = RequirementType.objects.get(id=doc.requirement_type_id).requirement_name
            except RequirementType.DoesNotExist:
                req_name = f'Requirement #{doc.requirement_type_id}'
            reason = doc.flag_remarks or 'No reason provided'
            Notification.objects.create(
                user=user,
                application=application,
                title='Document requires re-upload',
                message=f'{req_name}: {reason}',
            )

    return Response({"message": remarks, "status": application.status})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resubmit_flagged_document(request, document_id):
    """Applicant re-uploads a document that was flagged invalid.
    Only works if the document currently has ocr_status='rejected'."""
    try:
        doc = UploadedDocument.objects.get(id=document_id)
    except UploadedDocument.DoesNotExist:
        return Response({"error": "Document not found."}, status=404)

    if doc.ocr_status != 'rejected':
        return Response({"error": "This document is not flagged for re-upload."}, status=400)

    file = request.FILES.get('file')
    if not file:
        return Response({"error": "No file provided."}, status=400)

    doc.file = file
    doc.ocr_status = 'verified'  # placeholder — real OCR check replaces this in Month 2
    doc.flag_remarks = None
    doc.is_resubmitted = True
    doc.receiving_review_status = 'unchecked'  # RO must re-verify this re-uploaded document
    doc.receiving_review_remarks = None
    doc.save()
    return Response(UploadedDocumentSerializer(doc).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resubmit_application(request, application_id):
    """Applicant confirms all flagged documents are re-uploaded; sends application
    back through Receiving Officer -> CTDO again."""
    try:
        application = Application.objects.get(id=application_id)
    except Application.DoesNotExist:
        return Response({"error": "Not found"}, status=404)

    still_flagged = application.documents.filter(ocr_status='rejected').exists()
    if still_flagged:
        return Response({"error": "Some documents are still flagged. Please re-upload them first."}, status=400)

    application.status = 'pending_receiving'
    application.save()
    ApplicationStatusLog.objects.create(
        application=application, status='pending_receiving',
        changed_by=request.user, remarks='Applicant resubmitted corrected documents.'
    )
    return Response({"message": "Resubmitted for review.", "status": application.status})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_notifications(request):
    """Applicant: list their own notifications, newest first."""
    notifications = Notification.objects.filter(user=request.user)
    data = [{
        "id": n.id,
        "application_id": n.application_id,
        "title": n.title,
        "message": n.message,
        "is_read": n.is_read,
        "created_at": n.created_at,
    } for n in notifications]
    return Response({
        "notifications": data,
        "unread_count": notifications.filter(is_read=False).count(),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notifications_read(request):
    """Applicant: mark notifications as read. Accepts a list of ids; if none
    provided, marks all of the applicant's notifications as read."""
    ids = request.data.get('ids') or []
    qs = Notification.objects.filter(user=request.user)
    if ids:
        qs = qs.filter(id__in=ids)
    qs.update(is_read=True)
    return Response({"ok": True})


import json
from datetime import timedelta
from io import BytesIO

from django.http import FileResponse, HttpResponse, JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .models import QrBridgeUpload

QR_BRIDGE_TTL = timedelta(minutes=15)


def qr_bridge_page(request, code):
    """Standalone phone page opened by scanning the QR. No login needed."""
    return render(request, 'qr_bridge.html', {'code': code})


@csrf_exempt
def qr_bridge_upload(request, code):
    """Phone POSTs a captured document image for this bridge code."""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    image = request.FILES.get('image')
    if not image:
        return JsonResponse({'error': 'No image received'}, status=400)
    QrBridgeUpload.objects.create(
        code=code,
        image=image.read(),
        filename=image.name or 'capture.jpg',
        content_type=image.content_type or 'image/jpeg',
    )
    QrBridgeUpload.objects.filter(code=code, created_at__lt=timezone.now() - QR_BRIDGE_TTL).delete()
    return JsonResponse({'status': 'ok'})


@csrf_exempt
def qr_bridge_pending(request, code):
    """Laptop polls for images the phone has uploaded for this code."""
    if request.method != 'GET':
        return JsonResponse({'error': 'GET required'}, status=405)
    cutoff = timezone.now() - QR_BRIDGE_TTL
    qs = QrBridgeUpload.objects.filter(code=code, created_at__gte=cutoff).order_by('created_at')[:10]
    QrBridgeUpload.objects.filter(code=code, created_at__lt=cutoff).delete()
    items = [{
        'id': u.id,
        'filename': u.filename,
        'content_type': u.content_type,
    } for u in qs]
    return JsonResponse(items, safe=False)


@csrf_exempt
def qr_bridge_download(request, upload_id):
    """Laptop fetches the raw bytes of a pending phone upload."""
    upload = QrBridgeUpload.objects.filter(id=upload_id).first()
    if not upload:
        return HttpResponse(status=404)
    return FileResponse(
        BytesIO(bytes(upload.image)),
        content_type=upload.content_type or 'image/jpeg',
        filename=upload.filename or 'capture.jpg',
    )


@csrf_exempt
def qr_bridge_consume(request, upload_id):
    """Laptop confirms the image was attached; the pending row is removed."""
    if request.method not in ('DELETE', 'POST'):
        return JsonResponse({'error': 'DELETE required'}, status=405)
    QrBridgeUpload.objects.filter(id=upload_id).delete()
    return JsonResponse({'status': 'ok'})