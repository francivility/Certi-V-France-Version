from rest_framework.authentication import BaseAuthentication
from rest_framework.permissions import BasePermission
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import PendingRegistration
from .staging import hash_token


class RegistrationTokenAuthentication(BaseAuthentication):
    """Accepts either a staging registration token or a normal JWT."""

    def authenticate(self, request):
        header = request.META.get('HTTP_AUTHORIZATION', '')
        token = None
        if header.lower().startswith('bearer '):
            token = header[7:].strip()
        if token:
            pending = PendingRegistration.objects.filter(token_hash=hash_token(token)).first()
            if pending is not None and pending.status != PendingRegistration.Status.VERIFIED:
                return (pending, pending)
        return JWTAuthentication().authenticate(request)


class IsRegistrationOrJWT(BasePermission):
    """Allows an in-progress staging registration or an authenticated user."""

    def has_permission(self, request, view):
        if isinstance(getattr(request, 'auth', None), PendingRegistration):
            return True
        return bool(request.user and request.user.is_authenticated)