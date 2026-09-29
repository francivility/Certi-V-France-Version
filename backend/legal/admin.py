from django.contrib import admin
from .models import Hearing, HearingSlot, NoticeOfHearing, DecisionOrder

admin.site.register(Hearing)
admin.site.register(HearingSlot)
admin.site.register(NoticeOfHearing)
admin.site.register(DecisionOrder)