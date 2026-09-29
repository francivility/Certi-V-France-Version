from django.urls import path
from . import views

urlpatterns = [
    path('session/', views.create_session),
    path('session/<str:code>/', views.session_status),
    path('submit/<str:code>/', views.submit),
]