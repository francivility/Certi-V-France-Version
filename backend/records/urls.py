from django.urls import path
from .views import release_queue, release_cpc, expiry_monitor, reports_summary, my_cpc_release, records_history

urlpatterns = [
    path('release-queue/', release_queue),
    path('release-cpc/<int:application_id>/', release_cpc),
    path('history/', records_history),
    path('expiry-monitor/', expiry_monitor),
    path('reports-summary/', reports_summary),
    path('my-cpc/<int:application_id>/', my_cpc_release),
]