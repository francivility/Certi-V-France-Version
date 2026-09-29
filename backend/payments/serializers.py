from rest_framework import serializers
from .models import StatementOfAccount, SOAItem, Payment


class SOAItemSerializer(serializers.ModelSerializer):
    fee_name = serializers.CharField(source='fee.fee_name', read_only=True)

    class Meta:
        model = SOAItem
        fields = ['id', 'fee', 'fee_name', 'quantity', 'amount']


class SOASerializer(serializers.ModelSerializer):
    items = SOAItemSerializer(many=True, read_only=True)
    operator_name = serializers.CharField(source='application.applicant_profile.business_name', read_only=True)
    denomination = serializers.CharField(source='application.cpc_type.type_name', read_only=True)
    plate_number = serializers.CharField(source='application.plate_number', read_only=True)
    date_applied = serializers.DateTimeField(source='application.submitted_at', read_only=True)
    assessed_by = serializers.CharField(source='issued_by.get_full_name', read_only=True)
    nature_of_collection = serializers.SerializerMethodField()

    class Meta:
        model = StatementOfAccount
        fields = [
            'id', 'application', 'control_number', 'operator_name', 'denomination',
            'plate_number', 'nature_of_collection', 'expiry_date', 'date_applied',
            'assessed_by', 'items', 'total_amount', 'issued_at'
        ]

    def get_nature_of_collection(self, obj):
        return "CPC Application"

class ReceiptSerializer(serializers.ModelSerializer):
    control_number = serializers.CharField(source='soa.control_number', read_only=True)
    operator_name = serializers.CharField(source='application.applicant_profile.business_name', read_only=True)
    denomination = serializers.CharField(source='application.cpc_type.type_name', read_only=True)
    plate_number = serializers.CharField(source='application.plate_number', read_only=True)
    docket_number = serializers.CharField(source='application.docket_number', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.get_full_name', read_only=True)
    items = SOAItemSerializer(source='soa.items', many=True, read_only=True)
    total_amount = serializers.DecimalField(source='soa.total_amount', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'application', 'control_number', 'or_number', 'operator_name',
            'denomination', 'plate_number', 'docket_number', 'method', 'reference_no',
            'items', 'total_amount', 'status', 'verified_by_name', 'paid_at',
        ]