from django.contrib import admin
from .models import Application, UploadedDocument, ApplicationStatusLog

admin.site.register(Application)
admin.site.register(UploadedDocument)
admin.site.register(ApplicationStatusLog)