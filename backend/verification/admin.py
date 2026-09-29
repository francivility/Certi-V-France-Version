from django.contrib import admin
from .models import VerificationSession


@admin.register(VerificationSession)
class VerificationSessionAdmin(admin.ModelAdmin):
    list_display = ('code', 'user', 'status', 'id_type', 'blink_count', 'match_passed', 'created_at')
    list_filter = ('status', 'match_passed')
    search_fields = ('code', 'user__username')
    readonly_fields = ('created_at', 'updated_at')