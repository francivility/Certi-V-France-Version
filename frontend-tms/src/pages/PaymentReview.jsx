import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Receipt, Printer, Loader2, CheckCheck,
  HandCoins, BadgeCheck, Info, Store,
} from 'lucide-react';
import api from '../api/axios';
import ApplicantDetailCard from '../components/ApplicantDetailCard';

const fmt = (n) => parseFloat(n).toLocaleString('en-PH', { minimumFractionDigits: 2 });

function PaymentReview() {
  const { applicationId } = useParams();
  const [soa, setSoa] = useState(null);
  const [application, setApplication] = useState(null);
  const [appChoice, setAppChoice] = useState(null);
  const [method, setMethod] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`payments/soa/${applicationId}/`)
      .then((res) => setSoa(res.data))
      .catch(() => setError('Could not load the Payment Order Slip for this application.'));
    api.get(`applications/${applicationId}/detail/`)
      .then((res) => setApplication(res.data))
      .catch(() => {});
    // The applicant chooses the payment method (online / onsite), not the cashier.
    api.get('payments/payment-queue/')
      .then((res) => {
        const row = res.data.find((a) => String(a.id) === String(applicationId));
        if (row) {
          setAppChoice(row.method || null);
          const normalized = row.method === 'online' ? 'online' : row.method === 'onsite' || row.method === 'f2f' ? 'onsite' : '';
          if (normalized) setMethod(normalized);
          if (row.method === 'online') setReferenceNo(row.reference_no || '');
        }
      })
      .catch(() => {});
  }, [applicationId]);

  const handleReceivePayment = async () => {
    setError('');
    setProcessing(true);
    try {
      const res = await api.post(`payments/receive-payment/${applicationId}/`, {
        method,
        reference_no: referenceNo,
      });
      setReceipt(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not process payment.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full">
      <div className="px-5 sm:px-8 lg:px-12 pt-8">
        <Link
          to="/payment/queue"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-gov-gray-200 text-sm font-medium text-navy-800 hover:border-gold hover:text-gold transition-colors no-underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Payment Queue
        </Link>
      </div>

      <div className="w-full px-5 sm:px-8 lg:px-12 py-8">
        <div className="mb-6">
          <h2 className="font-serif text-3xl font-semibold text-navy-800">Collect Payment</h2>
        <p className="text-gov-gray-500 text-sm mt-1">
          Verify the Payment Order Slip and issue the official receipt for this application.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-md px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        {receipt ? (
          <div className="bg-white border border-gov-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
                <BadgeCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-800 text-base">Official Receipt</h3>
                <p className="text-xs text-gov-gray-500">OR # {receipt.or_number}</p>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-6">
                <Field label="Control Number" value={receipt.control_number || 'N/A'} />
                <Field label="OR Number" value={receipt.or_number} />
                <Field label="Operator Name" value={receipt.operator_name || 'N/A'} />
                <Field label="Denomination" value={receipt.denomination} />
                <Field label="Plate Number" value={receipt.plate_number || 'N/A'} />
                <Field label="Received By" value={receipt.verified_by_name || 'N/A'} />
                <Field label="Method" value={receipt.method === 'online' ? 'Online' : 'On-site (Cash)'} />
                {receipt.reference_no && <Field label="Reference No." value={receipt.reference_no} />}
              </div>

              <div className="overflow-x-auto rounded-md border border-gov-gray-200">
                <table className="w-full text-left border-collapse min-w-[420px]">
                  <thead>
                    <tr className="border-b border-gov-gray-200 bg-gov-gray-50/60">
                      <th className="p-4 text-xs font-semibold text-gov-gray-500">Fee Name</th>
                      <th className="p-4 text-xs font-semibold text-gov-gray-500 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.items.map((item) => (
                      <tr key={item.id} className="border-b border-gov-gray-100">
                        <td className="p-4 font-semibold text-navy-800 text-sm">{item.fee_name}</td>
                        <td className="p-4 text-right font-semibold text-gov-gray-600">P{fmt(item.amount)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="p-4 font-semibold text-navy-800">Total Paid</td>
                      <td className="p-4 text-right font-semibold text-navy-800 text-lg">P{fmt(receipt.total_amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gov-gray-100 text-gov-gray-700 rounded-md text-sm font-semibold hover:bg-gov-gray-200 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print {receipt.method === 'online' ? 'Digital Receipt' : 'Receipt'}
                </button>
                <button
                  onClick={() => navigate('/payment/queue')}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gov-blue text-white text-sm font-semibold rounded-md shadow-md hover:bg-gov-blue-dark transition-all cursor-pointer"
                >
                  <Receipt className="w-4 h-4" /> Back to Payment Queue
                </button>
              </div>
            </div>
          </div>
        ) : soa ? (
          <div className="bg-white border border-gov-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
                <BadgeCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-800">Collect Payment</h3>
                <p className="text-xs text-gov-gray-500">The applicant chose how to pay — verify and confirm below</p>
              </div>
            </div>

            <div className="p-6 md:p-8">
              {/* Applicant's chosen method (read-only) */}
              <div className="mb-5">
                <label className="text-xs font-semibold text-gov-gray-400">Applicant's payment choice</label>
                <div className="mt-2">
                  {appChoice === null ? (
                    <div className="flex items-start gap-2.5 rounded-lg bg-gov-amber-light/60 border border-gov-amber/30 px-4 py-3 text-sm font-medium text-gov-amber">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>The applicant has not chosen a payment method yet. Ask them to select Online or On-site in their account.</span>
                    </div>
                  ) : method === 'online' ? (
                    <div className="flex items-center gap-3 rounded-lg border border-gov-gray-200 bg-gov-gray-50 px-4 py-3">
                      <span className="w-9 h-9 rounded-md bg-navy-800 text-white flex items-center justify-center shrink-0">
                        <BadgeCheck className="w-5 h-5" />
                      </span>
                      <span>
                        <span className="block font-semibold text-navy-800 text-sm">Online</span>
                        <span className="block text-xs text-gov-gray-500">Applicant will pay online (GCash / Maya / bank)</span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-gov-gray-200 bg-gov-gray-50 px-4 py-3">
                      <span className="w-9 h-9 rounded-md bg-navy-800 text-white flex items-center justify-center shrink-0">
                        <Store className="w-5 h-5" />
                      </span>
                      <span>
                        <span className="block font-semibold text-navy-800 text-sm">On-site (Cash)</span>
                        <span className="block text-xs text-gov-gray-500">Applicant pays at the cashier counter</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {method === 'online' ? (
                <div className="mb-5">
                  <label className="text-xs font-semibold text-gov-gray-400">Reference Number (from applicant)</label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="e.g. GCash / bank reference number"
                    className="mt-2 w-full bg-gov-gray-50 border border-gov-gray-300 rounded-md py-3.5 px-4 text-sm font-medium text-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent"
                  />
                </div>
              ) : (
                <div className="mb-5 rounded-lg bg-gov-gray-50 border border-gov-gray-200 px-4 py-3 text-sm font-medium text-gov-gray-600 flex items-center gap-2.5">
                  <HandCoins className="w-4 h-4 shrink-0" />
                  Collect the cash payment from the applicant at the counter.
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gov-gray-50 border border-gov-gray-200 rounded-lg px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold text-gov-gray-400">Total to Collect</p>
                  <p className="text-xl font-semibold text-navy-800">P{fmt(soa.total_amount)}</p>
                </div>
                <button
                  onClick={handleReceivePayment}
                  disabled={processing || (method === 'online' && !referenceNo.trim()) || !method}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-navy-800 text-white text-sm font-semibold rounded-md hover:bg-navy-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCheck className="w-5 h-5" />}
                  Confirm &amp; Issue Receipt
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 py-16 text-center text-sm text-gov-gray-500 font-medium">
            {error || 'Loading Payment Order Slip...'}
          </div>
        )}

        <div className="flex flex-col gap-6">
          {application ? (
            <ApplicantDetailCard
              application={application}
              statusCls="bg-gov-amber-light text-gov-amber"
              statusText="Awaiting Payment"
            />
          ) : (
            <div className="bg-white border border-gov-gray-200 rounded-xl p-6">
              <p className="text-sm text-gov-gray-500">Loading application details...</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gov-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-navy-800">{value}</p>
    </div>
  );
}

export default PaymentReview;
