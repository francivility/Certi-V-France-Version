from rest_framework import serializers
from .models import User, ApplicantProfile
from core.models import Role


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'email']

    def create(self, validated_data):
        applicant_role, _ = Role.objects.get_or_create(role_name='Applicant')
        user = User(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            role=applicant_role,
        )
        user.set_password(validated_data['password'])  # this uses Django's PBKDF2 hashing automatically
        user.save()
        return user


class ApplicantProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicantProfile
        fields = ['business_name', 'address', 'tin']