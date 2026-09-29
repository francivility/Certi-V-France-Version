from rest_framework import serializers
from .models import Application, UploadedDocument, ApplicationDraft, DraftDocument


class ApplicationSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source='applicant_profile.business_name', read_only=True)
    cpc_type_name = serializers.CharField(source='cpc_type.type_name', read_only=True)
    released = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    payment_method = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    due_date = serializers.SerializerMethodField()
    overdue = serializers.SerializerMethodField()
    has_soa = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = ['id', 'cpc_type', 'cpc_type_name', 'business_name', 'plate_number', 'status',
                  'submitted_at', 'released', 'payment_status', 'payment_method', 'total_amount',
                  'due_date', 'overdue', 'has_soa']
        read_only_fields = ['status', 'submitted_at']

    def get_released(self, obj):
        return hasattr(obj, 'release')

    def get_payment_status(self, obj):
        return getattr(getattr(obj, 'payment', None), 'status', None)

    def get_payment_method(self, obj):
        return getattr(getattr(obj, 'payment', None), 'method', None)

    def get_total_amount(self, obj):
        soa = getattr(obj, 'soa', None)
        return str(soa.total_amount) if soa else None

    def get_due_date(self, obj):
        p = getattr(obj, 'payment', None)
        return p.due_date.strftime('%Y-%m-%d') if p and p.due_date else None

    def get_overdue(self, obj):
        return bool(getattr(getattr(obj, 'payment', None), 'overdue', False))

    def get_has_soa(self, obj):
        return hasattr(obj, 'soa')


class UploadedDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedDocument
        fields = ['id', 'application', 'requirement_type', 'file', 'ocr_status', 'flag_remarks',
                  'receiving_review_status', 'receiving_review_remarks', 'uploaded_at', 'is_resubmitted']
        read_only_fields = ['ocr_status', 'uploaded_at', 'receiving_review_status', 'receiving_review_remarks']


class DraftDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DraftDocument
        fields = ['id', 'draft', 'requirement_type', 'file', 'uploaded_at']
        read_only_fields = ['uploaded_at']


class ApplicationDraftSerializer(serializers.ModelSerializer):
    documents = DraftDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = ApplicationDraft
        fields = ['id', 'cpc_type', 'plate_number', 'created_at', 'updated_at', 'documents']
        read_only_fields = ['created_at', 'updated_at']

class ApplicationDetailSerializer(serializers.ModelSerializer):
    documents = UploadedDocumentSerializer(many=True, read_only=True)
    applicant_name = serializers.CharField(source='applicant_profile.business_name', read_only=True)
    cpc_type_name = serializers.CharField(source='cpc_type.type_name', read_only=True)

    class Meta:
        model = Application
        fields = ['id', 'applicant_name', 'cpc_type_name', 'plate_number', 'case_number', 'status', 'submitted_at', 'documents']