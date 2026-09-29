from rest_framework.permissions import BasePermission


class HasRole(BasePermission):
    """Usage: add `required_role = 'Receiving Officer'` as a class attribute
    on any view that should only be accessible to that role."""

    def has_permission(self, request, view):
        required_role = getattr(view, 'required_role', None)
        if required_role is None:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role is not None and request.user.role.role_name == required_role