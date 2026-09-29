from django.urls import path
from .views import health_check, list_cpc_types, list_requirement_types

urlpatterns = [
    path('health/', health_check),
    path('cpc-types/', list_cpc_types),
    path('requirement-types/', list_requirement_types),
]