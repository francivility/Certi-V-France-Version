from django.contrib import admin
from .models import StatementOfAccount, SOAItem, Payment

admin.site.register(StatementOfAccount)
admin.site.register(SOAItem)
admin.site.register(Payment)