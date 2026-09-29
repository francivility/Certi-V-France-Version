from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from applications.views import qr_bridge_page
from verification.views import verify_page

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('api/accounts/', include('accounts.urls')),
    path('api/applications/', include('applications.urls')),
    path('api/verification/', include('verification.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/legal/', include('legal.urls')),
    path('api/records/', include('records.urls')),
    path('qr/<str:code>/', qr_bridge_page),
    path('v/<str:code>/', verify_page),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)