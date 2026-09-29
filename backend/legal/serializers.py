from rest_framework import serializers
from .models import Hearing, NoticeOfHearing


class HearingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hearing
        fields = ['id', 'application', 'hearing_date', 'hearing_time', 'scheduled_by', 'scheduled_at']


class NoticeOfHearingSerializer(serializers.ModelSerializer):
    hearing_date = serializers.DateField(source='hearing.hearing_date', read_only=True)
    hearing_time = serializers.TimeField(source='hearing.hearing_time', read_only=True)
    application_id = serializers.IntegerField(source='hearing.application.id', read_only=True)
    docket_number = serializers.CharField(source='hearing.application.docket_number', read_only=True)

    class Meta:
        model = NoticeOfHearing
        fields = [
            'id', 'application_id', 'docket_number', 'hearing_date', 'hearing_time',
            'content', 'sent_at', 'created_at',
            'applicant_name', 'applicant_address', 'applicant_email',
            'case_or_docket_number', 'date_of_filing', 'nature_of_application',
            'route_or_area', 'service_applied_for', 'units_applied_for',
            'hearing_time_label', 'venue_or_platform',
            'opposition_period', 'opposition_address', 'foe_period', 'foe_address',
            'hearing_officer',
            'document_docx', 'document_pdf',
        ]


from .models import DecisionOrder


class DecisionOrderSerializer(serializers.ModelSerializer):
    case_number = serializers.CharField(source='application.case_number', read_only=True)
    docket_number = serializers.CharField(source='application.docket_number', read_only=True)
    applicant_name = serializers.CharField(source='application.applicant_profile.business_name', read_only=True)
    drafted_by_name = serializers.CharField(source='drafted_by.get_full_name', read_only=True)

    class Meta:
        model = DecisionOrder
        fields = [
            'id', 'application', 'applicant_name', 'docket_number', 'case_number',
            'decision_type', 'content', 'status',
            'drafted_by_name', 'drafted_at', 'ctdo_endorsed_at', 'ord_approved_at',
        ]
