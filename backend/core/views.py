from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import CPCType, RequirementType
from .serializers import CPCTypeSerializer, RequirementTypeSerializer


@api_view(['GET'])
def health_check(request):
    return Response({"status": "ok", "message": "Certi-V backend is running"})


@api_view(['GET'])
def list_cpc_types(request):
    types = CPCType.objects.filter(is_active=True)
    serializer = CPCTypeSerializer(types, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def list_requirement_types(request):
    reqs = RequirementType.objects.all()
    serializer = RequirementTypeSerializer(reqs, many=True)
    return Response(serializer.data)