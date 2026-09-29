from django.urls import path
from .views import (
    assessment_queue, list_fees, issue_soa, forward_to_cashier, soa_detail,
    payment_queue, receive_payment, receipt_detail,
    paid_queue, generate_docket_and_forward,
    assessment_history, assessment_reports,
    payment_history, payment_reports,
    my_bill, choose_payment_method, submit_online_payment, my_receipt,
    overdue_queue, confirm_expire, my_payments,
)
from .xendit_views import create_checkout, checkout_status, webhook

urlpatterns = [
    # --- Existing routes ---
    path('assessment-queue/', assessment_queue),
    path('assessment-history/', assessment_history),
    path('assessment-reports/', assessment_reports),
    path('payment-history/', payment_history),
    path('payment-reports/', payment_reports),
    path('fees/', list_fees),
    path('issue-soa/<int:application_id>/', issue_soa),
    path('forward-to-cashier/<int:application_id>/', forward_to_cashier),
    path('soa/<int:application_id>/', soa_detail),
    path('payment-queue/', payment_queue),
    path('receive-payment/<int:application_id>/', receive_payment),
    path('receipt/<int:application_id>/', receipt_detail),
    path('paid-queue/', paid_queue),
    path('generate-docket/<int:application_id>/', generate_docket_and_forward),
    path('my-bill/<int:application_id>/', my_bill),
    path('<int:application_id>/choose-method/', choose_payment_method),
    path('<int:application_id>/submit-online-payment/', submit_online_payment),
    path('my-receipt/<int:application_id>/', my_receipt),
    path('my-payments/', my_payments),
    path('overdue-queue/', overdue_queue),
    path('<int:application_id>/confirm-expire/', confirm_expire),

    # --- Xendit integration ---
    path('xendit/checkout/<int:application_id>/', create_checkout),
    path('xendit/status/<int:application_id>/', checkout_status),
    path('xendit/webhook/', webhook),
]