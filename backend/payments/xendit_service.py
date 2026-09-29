"""
Xendit payment gateway service.

Uses the Xendit REST API directly (via `requests`) instead of the SDK to
avoid version-specific quirks. Handles:
  - creating a hosted checkout invoice (the page the applicant is redirected to)
  - reading an invoice's current status (used after payment to confirm it)
"""

from base64 import b64encode

import requests
from django.conf import settings


XENDIT_API_BASE = 'https://api.xendit.co'


def _auth_header():
    """Basic auth using the secret key as the username and empty password."""
    key = settings.XENDIT_SECRET_KEY
    token = b64encode(f'{key}:'.encode()).decode()
    return {'Authorization': f'Basic {token}'}


def create_invoice(*, external_id, amount, payer_email, description,
                   success_url, failure_url):
    """Create a Xendit hosted checkout invoice.

    Returns the Xendit JSON payload containing at minimum:
      - id            (Xendit invoice id, e.g. 'inv_...')
      - invoice_url   (the page to redirect the applicant to)
      - status        (PENDING / PAID / EXPIRED / SETTLED)
    """
    payload = {
        'external_id': external_id,
        'amount': float(amount),
        'payer_email': payer_email or 'noreply@certi-v.local',
        'description': description,
        'currency': 'PHP',
        'success_redirect_url': success_url,
        'failure_redirect_url': failure_url,
    }
    resp = requests.post(
        f'{XENDIT_API_BASE}/v2/invoices',
        json=payload,
        headers={**_auth_header(), 'Content-Type': 'application/json'},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def get_invoice(invoice_id):
    """Fetch the current state of an invoice directly from Xendit."""
    resp = requests.get(
        f'{XENDIT_API_BASE}/v2/invoices/{invoice_id}',
        headers=_auth_header(),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()