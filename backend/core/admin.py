from django.contrib import admin
from .models import Role, CPCType, RequirementType, Fee

admin.site.register(Role)
admin.site.register(CPCType)
admin.site.register(RequirementType)
admin.site.register(Fee)