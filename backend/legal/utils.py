MAX_SLOTS_PER_DAY = 4

# Office hours for scheduling hearings (8:00 AM - 5:00 PM).
OFFICE_START_HOUR = 8
OFFICE_END_HOUR = 17  # exclusive (last bookable time is 4:59 PM)

# Standard daily hearing time slots (HH:MM).
HEARING_SLOT_TIMES = [
    (9, 0),   # 9:00 AM
    (10, 0),  # 10:00 AM
    (11, 0),  # 11:00 AM
    (14, 0),  # 2:00 PM
]

# Weekends and this weekday index are not hearing days (0=Mon ... 6=Sun).
HEARING_DAY_WEEKDAYS = {0, 1, 2, 3, 4}


def hearing_day_slots(d):
    """Return the list of bookable time slots (datetime.time) for a hearing day,
    or an empty list on non-hearing days (weekends)."""
    from datetime import time as dtime
    if d.weekday() not in HEARING_DAY_WEEKDAYS:
        return []
    return [dtime(h, m, 0) for h, m in HEARING_SLOT_TIMES]


def is_hearing_day(d):
    """True on working days when hearings may be scheduled (Mon-Fri)."""
    return d.weekday() in HEARING_DAY_WEEKDAYS


def within_office_hours(t):
    """True when a time is between 8:00 AM and 5:00 PM (inclusive of 8:00 AM)."""
    from datetime import time as dtime
    return dtime(OFFICE_START_HOUR, 0, 0) <= t < dtime(OFFICE_END_HOUR, 0, 0)


def is_hearing_time_valid(d, t):
    """A hearing time is valid when it falls on a hearing day within office hours."""
    return is_hearing_day(d) and within_office_hours(t)


def day_booking_count(d):
    """Number of hearings already booked for a given date."""
    from .models import HearingSlot
    return HearingSlot.objects.filter(date=d, hearing__isnull=False).count()


def default_notice_content(application):
    hearing = application.hearing
    hearing_dt = application.hearing.hearing_date
    time_str = hearing.hearing_time.strftime('%I:%M %p')
    return (
        "NOTICE OF HEARING\n\n"
        f"Docket No.: {application.docket_number}\n"
        f"Applicant: {application.applicant_profile.business_name}\n"
        f"CPC Type: {application.cpc_type.type_name}\n\n"
        "You are hereby notified that the above-entitled application is set for hearing "
        f"on {hearing_dt.strftime('%B %d, %Y')} at {time_str} before the Land Transportation "
        "Franchising and Regulatory Board, Regional Office No. 5.\n\n"
        "Please appear on the said date with your duly authorized representative "
        "and all necessary documents."
    )

def notice_prefill(application):
    """Default values for the Notice of Hearing form fields (a–p), pulled from
    the Application + Hearing where the data exists. Blank where there is no data."""
    if not hasattr(application, 'hearing'):
        return None
    hearing = application.hearing
    time_label = (
        hearing.hearing_time.strftime('%I:%M %p').lstrip('0')
        if hearing.hearing_time else ''
    )
    profile = application.applicant_profile
    opposition_address = (
        'LTFRB Regional Office No. 5, Peñaranda St., Legazpi City (physical address), '
        'or via email at ltfrb.region5@example.gov.ph'
    )
    return {
        "applicant_name": profile.business_name,
        "applicant_address": profile.address,
        "applicant_email": profile.user.email,
        "case_or_docket_number": application.case_number or application.docket_number or '',
        "date_of_filing": application.submitted_at.date(),
        "nature_of_application": application.cpc_type.type_name,
        "route_or_area": '',
        "service_applied_for": application.cpc_type.type_name,
        "units_applied_for": '',
        "hearing_date": hearing.hearing_date,
        "hearing_time_label": time_label,
        "venue_or_platform": '',
        "opposition_period": 'fifteen (15) days from receipt of this Notice',
        "opposition_address": opposition_address,
        "foe_period": 'the date of the hearing or as fixed by the hearing officer',
        "foe_address": opposition_address,
        "hearing_officer": '',
    }


def _ntxt(v):
    """Coerce a notice field value to text (dates/datetimes -> str)."""
    if v is None:
        return ''
    return str(v)


def build_notice_content(f):
    """Assemble the formal Notice of Hearing letter text from the form fields (a–q)."""
    def _t(k):
        return (f.get(k) or '') if f.get(k) is not None else ''

    def _d(*keys):
        parts = [_ntxt(f.get(k)) for k in keys if f.get(k)]
        return parts[0] if parts else ''

    return (
        "REPUBLIC OF THE PHILIPPINES\n"
        "DEPARTMENT OF TRANSPORTATION\n"
        "LAND TRANSPORTATION FRANCHISING AND REGULATORY BOARD\n"
        "REGIONAL OFFICE NO. 5\n"
        "Peñaranda St., Legazpi City\n\n"
        "                                  NOTICE OF HEARING\n\n"
        "In the matter of the application for a Certificate of Public Convenience "
        "to operate a public land transport service, namely:\n\n"
        "APPLICANT                        : " + _t('applicant_name') + "\n"
        "ADDRESS OF APPLICANT             : " + _t('applicant_address') + "\n"
        "EMAIL ADDRESS OF APPLICANT       : " + _t('applicant_email') + "\n"
        "CASE / DOCKET NUMBER             : " + _t('case_or_docket_number') + "\n"
        "DATE OF FILING                   : " + _d('date_of_filing') + "\n"
        "NATURE OF THE APPLICATION        : " + _t('nature_of_application') + "\n"
        "ROUTE OR AREA OF OPERATIONS      : " + _t('route_or_area') + "\n"
        "SERVICE APPLIED FOR              : " + _t('service_applied_for') + "\n"
        "NUMBER OF UNIT/S APPLIED FOR     : " + _t('units_applied_for') + "\n"
        "DATE OF HEARING                  : " + _d('hearing_date') + "\n"
        "TIME OF HEARING                  : " + _t('hearing_time_label') + "\n"
        "VENUE / VIRTUAL PLATFORM         : " + _t('venue_or_platform') + "\n"
        "HEARING OFFICER                  : " + _t('hearing_officer') + "\n\n"
        "NOTICE IS HEREBY GIVEN that the above-entitled application is set for hearing "
        "on " + _d('hearing_date') + " at " + _t('hearing_time_label')
        + " at " + _t('venue_or_platform')
        + ", before this Board, or any of its designated hearing officers.\n\n"
        "All interested parties may file their opposition within "
        + _t('opposition_period') + ". Oppositions may be filed at the "
        "following address: " + _t('opposition_address') + "\n\n"
        "All interested parties are likewise required to submit their Formal Offer of "
        "Evidence within " + _t('foe_period') + ". The Formal Offer of Evidence "
        "may be filed or submitted at the following address: "
        + _t('foe_address') + "\n\n"
        "SO ORDERED."
    )


from datetime import date


def generate_case_number():
    """Format: 05-2026-028 (Region 5 - year - nth application this year)"""
    from applications.models import Application
    today = date.today()
    year = today.year

    count_this_year = Application.objects.filter(
        case_number__isnull=False
    ).exclude(case_number='').filter(case_number__contains=f"-{year}-").count()
    sequence = count_this_year + 1

    return f"05-{year}-{sequence:03d}"