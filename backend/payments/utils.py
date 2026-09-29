from datetime import date, timedelta
from .models import StatementOfAccount


def generate_control_number():
    today = date.today()
    date_str = today.strftime('%m%d%Y')

    todays_count = StatementOfAccount.objects.filter(
        issued_at__date=today
    ).count()

    sequence = todays_count + 1
    return f"{date_str}{sequence:04d}"

import string


def denomination_code(cpc_type_name):
    """Rough abbreviation from CPC type name, e.g. 'Truck for Hire' -> 'TFH'."""
    words = cpc_type_name.split()
    code = ''.join(word[0].upper() for word in words if word[0].isalpha())
    return code[:4] or 'GEN'


def generate_docket_number(cpc_type_name):
    from applications.models import Application
    today = date.today()
    year = today.year
    month_letter = string.ascii_uppercase[today.month - 1]  # Jan=A, Feb=B, etc.

    count_this_year = Application.objects.filter(
        docket_number__isnull=False,
        docket_number__contains=f"-{year}-"
    ).count()
    sequence = count_this_year + 1

    code = denomination_code(cpc_type_name)
    return f"R5-NC-{code}-{year}-{month_letter}-{sequence}"

from dateutil.relativedelta import relativedelta

def calculate_cpc_expiry():
    """CPC validity: 3 years and 2 months from date of assessment/issuance."""
    return date.today() + relativedelta(years=3, months=2)\
    
def generate_or_number(soa):
    """Simple OR number tied to the control number, e.g. OR-082620260001"""
    return f"OR-{soa.control_number}"


def business_days_later(start_date, days):
    """Return the date that is `days` business days (Mon–Fri) after start_date."""
    result = start_date
    added = 0
    while added < days:
        result = result + timedelta(days=1)
        if result.weekday() < 5:
            added += 1
    return result


def calculate_payment_due_date():
    """Payment deadline: five (5) business days from today."""
    return business_days_later(date.today(), 5)