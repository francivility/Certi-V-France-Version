export const STATUS_LABEL = {
  pending_upload: { label: 'Pending Upload', cls: 'bg-gov-gray-200 text-gov-gray-600' },
  pending_receiving: { label: 'Pending Review', cls: 'bg-gov-amber-light text-gov-amber' },
  needs_correction: { label: 'Needs Correction', cls: 'bg-gov-amber-light text-gov-amber' },
  pending_ctdo: { label: 'With CTDO', cls: 'bg-gov-blue-light text-gov-blue' },
  pending_assessment: { label: 'Assessment', cls: 'bg-gov-blue-light text-gov-blue' },
  pending_payment: { label: 'Pending Payment', cls: 'bg-gov-blue-light text-gov-blue' },
  pending_legal: { label: 'Legal Review', cls: 'bg-gov-blue-light text-gov-blue' },
  pending_hearing: { label: 'Hearing', cls: 'bg-gov-blue-light text-gov-blue' },
  pending_ctdo_endorsement: { label: 'CTDO Endorsement', cls: 'bg-gov-blue-light text-gov-blue' },
  pending_ord: { label: 'ORD Approval', cls: 'bg-gov-blue-light text-gov-blue' },
  approved: { label: 'Approved', cls: 'bg-gov-green-light text-gov-green' },
  not_approved: { label: 'Not Approved', cls: 'bg-gov-gray-200 text-gov-gray-600' },
  dismissed: { label: 'Dismissed', cls: 'bg-gov-gray-200 text-gov-gray-600' },
};

export function statusBadge(status) {
  return STATUS_LABEL[status] || { label: status, cls: 'bg-gov-gray-200 text-gov-gray-600' };
}