from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, ApplicantProfile


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Extra', {'fields': ('role', 'contact_no')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Extra', {'fields': ('role', 'contact_no')}),
    )


admin.site.register(ApplicantProfile)
