from rest_framework import serializers
from .models import CPCRelease


class CPCReleaseSerializer(serializers.ModelSerializer):
    applicant_name = serializers.CharField(source='application.applicant_profile.business_name', read_only=True)
    case_number = serializers.CharField(source='application.case_number', read_only=True)
    docket_number = serializers.CharField(source='application.docket_number', read_only=True)
    released_by_name = serializers.CharField(source='released_by.get_full_name', read_only=True)

    class Meta:
        model = CPCRelease
        fields = [
            'id', 'application', 'applicant_name', 'docket_number', 'case_number',
            'claim_method', 'released_by_name', 'released_at',
        ]