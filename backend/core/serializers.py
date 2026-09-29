from rest_framework import serializers
from .models import CPCType, RequirementType


class CPCTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CPCType
        fields = ['id', 'type_name', 'description', 'is_active']


class RequirementTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequirementType
        fields = ['id', 'requirement_name', 'description']