from django.urls import path
from .views import (
    register_step1, register_step2, register_state, register_verify_status,
    login_view, staff_login_view, account_info, change_password,
    google_auth_view,
    password_reset_request, password_reset_confirm,
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/step1/', register_step1),
    path('register/step2/', register_step2),
    path('register/state/', register_state),
    path('register/verify/status/<str:code>/', register_verify_status),
    path('login/', login_view),
    path('staff-login/', staff_login_view),
    path('account/', account_info),
    path('change-password/', change_password),
    path('google/', google_auth_view),
    path('password-reset/request/', password_reset_request),
    path('password-reset/confirm/<str:uidb64>/<str:token>/', password_reset_confirm),
    path('token/refresh/', TokenRefreshView.as_view()),
]