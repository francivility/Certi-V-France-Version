/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, CreditCard, MapPin, Smartphone, CheckCircle2, Landmark,
  ReceiptText, AlertTriangle, Loader2, Store, Wallet, ChevronRight,
  FileText, ExternalLink,
} from 'lucide-react';
import api from '../api/axios';

const fmt = (n) =>
  n == null ? '—' : parseFloat(n).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function PayBill() {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [saveMethod, setSaveMethod] = useState(false);
  const [onlinePaying, setOnlinePaying] = useState(false);

  const loadBill = () => {
    setLoading(true);
    api
      .get(`payments/my-bill/${applicationId}/`)
      .then((res) => setBill(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not load your bill.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBill();
  }, [applicationId]);

  const handleChooseMethod = async (m) => {
    setError('');
    setSaveMethod(true);
    try {
      const res = await api.post(`payments/${applicationId}/choose-method/`, { method: m });
      setBill(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save your payment method.');
    } finally {
      setSaveMethod(false);
    }
  };

  const handlePayWithXendit = async () => {
    setError('');
    setOnlinePaying(true);
    try {
      const res = await api.post(`payments/xendit/checkout/${applicationId}/`);
      const url = res.data.invoice_url;
      if (!url) {
        throw new Error('Xendit did not return a checkout URL.');
      }
      window.location.href = url;
    } catch (err) {
      setError(err.response?.data?.error || 'Could not start the payment session.');
      setOnlinePaying(false);
    }
  };

  const dueDate = bill?.due_date ? new Date(bill.due_date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'long', day: 'numeric' }) : '—';

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-6 py-8">
      <Link
        to="/my-applications"
        className="inline-flex items-center gap-2 px-4 py-2 mb-5 rounded-md bg-white border border-gray-200 text-sm font-medium text-[#0E2036] hover:border-[#C9A227] hover:text-[#C9A227] transition-colors no-underline"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Applications
      </Link>

      <div className="mb-6">
        <h2 className="text-3xl md:text-4xl font-semibold text-[#0E2036]">Pay assessed fees</h2>
        <p className="text-gray-500 text-sm mt-1.5">
          {bill ? `${bill.cpc_type_name} · ${bill.business_name}` : 'Your payment order slip'}
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {loading && (
        <div className="py-16 text-center text-sm text-gray-500">Loading your bill&hellip;</div>
      )}

      {!loading && !bill && !error && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="w-14 h-14 rounded-md bg-gray-100 flex items-center justify-center mx-auto mb-4 text-gray-400">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-semibold text-[#0E2036] mb-2">No bill found</h3>
          <p className="text-sm text-gray-500">
            This application has not been assessed yet.
          </p>
        </div>
      )}

      {bill && (
        <div className="space-y-6">
          {bill.overdue && bill.status === 'overdue' && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-medium text-red-700 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                This application is <strong>Overdue</strong> — the 5-business-day deadline has passed.
              </span>
            </div>
          )}
          {bill.status === 'expired' && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-medium text-red-700 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                This application has expired and is <strong>invalid</strong>. Please file a new application.
              </span>
            </div>
          )}
          {bill.payment_status === 'paid' && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm font-medium text-green-700 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Payment confirmed. Your official receipt is shown below.</span>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 md:px-7 py-5 bg-[#0E2036] text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <ReceiptText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold leading-tight">Payment Order Slip</h3>
                <p className="text-xs text-white/60">Control No. {bill.control_number}</p>
              </div>
            </div>

            <div className="px-6 md:px-7 py-5">
              <ul className="divide-y divide-gray-100">
                {bill.items.map((it, i) => (
                  <li key={i} className="py-2.5 flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-700">
                      {it.fee}
                      {it.qty > 1 && <span className="text-gray-400"> × {it.qty}</span>}
                    </span>
                    <span className="text-sm font-medium text-[#0E2036] shrink-0">₱{fmt(it.amount)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#0E2036]">Total amount to pay</span>
                <span className="text-xl font-bold text-[#0E2036]">₱{fmt(bill.total_amount)}</span>
              </div>

              <div className={`mt-4 rounded-lg px-4 py-3 flex items-start gap-2.5 border ${
                bill.overdue
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-sm">
                  {bill.overdue
                    ? 'Deadline already passed.'
                    : <>Pay on or before <strong>{dueDate}</strong> — within five (5) business days.</>}
                </p>
              </div>
            </div>
          </div>

          {bill.payment_status === 'paid' && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-6 md:px-7 py-5 bg-green-600 text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold leading-tight">Official Receipt</h3>
                  <p className="text-xs text-white/70">OR {bill.or_number}</p>
                </div>
              </div>
              <div className="px-6 md:px-7 py-5 grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Paid via</p>
                  <p className="font-medium text-[#0E2036]">{bill.method === 'online' ? 'Online (Xendit)' : 'On-site'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Reference No.</p>
                  <p className="font-medium text-[#0E2036]">{bill.reference_no || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Paid at</p>
                  <p className="font-medium text-[#0E2036]">{bill.paid_at}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Total paid</p>
                  <p className="text-lg font-bold text-[#0E2036]">₱{fmt(bill.total_amount)}</p>
                </div>
              </div>
            </div>
          )}

          {bill.payment_status !== 'paid' && bill.status !== 'expired' && (
            <>
              {!bill.method && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-7">
                  <h3 className="text-lg font-semibold text-[#0E2036] mb-1.5">Choose how to pay</h3>
                  <p className="text-sm text-gray-500 mb-5">Select your preferred payment channel.</p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => handleChooseMethod('online')}
                      disabled={saveMethod}
                      className="text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-[#C9A227] hover:shadow-sm transition-all cursor-pointer disabled:opacity-60"
                    >
                      <div className="w-11 h-11 rounded-lg bg-[#0E2036]/5 flex items-center justify-center text-[#0E2036] mb-3">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <p className="font-semibold text-[#0E2036]">Pay online</p>
                      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                        Pay through GCash, Maya, cards, or online banking via Xendit.
                      </p>
                    </button>

                    <button
                      onClick={() => handleChooseMethod('onsite')}
                      disabled={saveMethod}
                      className="text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-[#C9A227] hover:shadow-sm transition-all cursor-pointer disabled:opacity-60"
                    >
                      <div className="w-11 h-11 rounded-lg bg-[#0E2036]/5 flex items-center justify-center text-[#0E2036] mb-3">
                        <Store className="w-5 h-5" />
                      </div>
                      <p className="font-semibold text-[#0E2036]">Pay on-site</p>
                      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                        Pay in cash at the LTFRB Regional Office cashier.
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {bill.method === 'online' && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-7">
                  <h3 className="text-lg font-semibold text-[#0E2036] mb-1.5 flex items-center gap-2">
                    <Smartphone className="w-5 h-5" /> Complete online payment
                  </h3>
                  <p className="text-sm text-gray-500 mb-5">
                    You will be redirected to Xendit's secure checkout page where you can pay using
                    GCash, Maya, credit/debit card, or online banking.
                  </p>

                  <div className="grid sm:grid-cols-4 gap-3 mb-5">
                    <div className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl border border-gray-200">
                      <Smartphone className="w-5 h-5 text-[#0E2036]" />
                      <span className="text-sm font-medium text-[#0E2036]">GCash</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl border border-gray-200">
                      <Wallet className="w-5 h-5 text-[#0E2036]" />
                      <span className="text-sm font-medium text-[#0E2036]">Maya</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl border border-gray-200">
                      <CreditCard className="w-5 h-5 text-[#0E2036]" />
                      <span className="text-sm font-medium text-[#0E2036]">Card</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl border border-gray-200">
                      <Landmark className="w-5 h-5 text-[#0E2036]" />
                      <span className="text-sm font-medium text-[#0E2036]">Bank</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePayWithXendit}
                    disabled={onlinePaying}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#0E2036] text-white font-semibold rounded-md hover:bg-[#152C48] transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {onlinePaying ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to Xendit&hellip;</>
                    ) : (
                      <>Pay ₱{fmt(bill.total_amount)} via Xendit <ExternalLink className="w-4 h-4" /></>
                    )}
                  </button>

                  <p className="mt-3 text-center text-xs text-gray-400">
                    You'll be redirected to Xendit. Do not close the page while payment is in progress.
                  </p>
                </div>
              )}

              {bill.method === 'onsite' && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-7">
                  <h3 className="text-lg font-semibold text-[#0E2036] mb-1.5 flex items-center gap-2">
                    <Store className="w-5 h-5" /> Pay on-site
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4">
                    Visit the LTFRB Regional Office cashier and pay the assessed amount within the deadline.
                    Bring your control number: <strong>{bill.control_number}</strong>.
                  </p>
                  <div className="rounded-lg bg-[#0E2036]/5 border border-[#0E2036]/10 px-4 py-3 flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-[#0E2036] shrink-0 mt-0.5" />
                    <p className="text-xs text-[#0E2036]/70 leading-relaxed">
                      LTFRB Region V (Bicol) office, Peñaranda St., Legazpi City ·
                      Office hours: 8:00 AM to 5:00 PM, Mondays to Fridays.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/my-applications')}
                    className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-[#0E2036] text-[#0E2036] font-semibold rounded-md hover:bg-[#0E2036] hover:text-white transition-colors cursor-pointer"
                  >
                    Done — I'll pay at the office <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default PayBill;