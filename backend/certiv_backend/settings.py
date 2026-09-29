"""
Django settings for certiv_backend project.
"""

import mimetypes as _mimetypes

_mimetypes.add_type("text/javascript", ".mjs", strict=True)

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


SECRET_KEY = 'django-insecure-@542706*o2fy$$2!bx+#-ya2vg%*!_fjv5klk60o7v0#frmqst'

DEBUG = True

ALLOWED_HOSTS = ['*']


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'accounts',
    'applications',
    'payments',
    'legal',
    'records',
    'core',
    'verification',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'certiv_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'certiv_backend.wsgi.application'


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'certiv_db',
        'USER': 'certiv_user',
        'PASSWORD': 'certiv_pass123',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}


AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'


# --- Email (password reset) - Gmail SMTP ---
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'jasarenofrancemhary@gmail.com'
EMAIL_HOST_PASSWORD = 'lbxi zwnt anxu igyo'
DEFAULT_FROM_EMAIL = 'Certi-V <jasarenofrancemhary@gmail.com>'

# Password reset links + Xendit redirects use the public ngrok URL so they
# work from any device (laptop, phone on Wi-Fi, phone on mobile data).
FRONTEND_URL = 'https://helpful-compost-upheld.ngrok-free.dev'


CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "https://helpful-compost-upheld.ngrok-free.dev",
]

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://192\.168\.\d{1,3}\.\d{1,3}:\d+$",
    r"^https://[a-z0-9-]+\.trycloudflare\.com$",
    r"^https://[a-z0-9-]+\.ngrok-free\.dev$",
    r"^https://[a-z0-9-]+\.ngrok-free\.app$",
    r"^https://[a-z0-9-]+\.ngrok\.io$",
]

AUTH_USER_MODEL = 'accounts.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'URL_FORMAT_OVERRIDE': None,
}

from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=2),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
}

import os

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DATA_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024

# ---------------------------------------------------------------------------
# Google Sign-In
# ---------------------------------------------------------------------------

GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')

# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------

PASSWORD_RESET_TIMEOUT = 60 * 60 * 24

# ---------------------------------------------------------------------------
# Xendit Payment Gateway (Sandbox / Test Mode)
# ---------------------------------------------------------------------------

XENDIT_SECRET_KEY = 'xnd_development_LcFm9gJqDLkHcDaZAz4Z3qlZIITRWnf5uxso6K11MKS6lJky87K1rA6WbvrKFrc'

XENDIT_SUCCESS_URL = 'https://helpful-compost-upheld.ngrok-free.dev/payment-success'
XENDIT_FAILURE_URL = 'https://helpful-compost-upheld.ngrok-free.dev/payment-failed'