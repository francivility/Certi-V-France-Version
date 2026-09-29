import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Banknote, CalendarClock, CheckCircle2, Receipt, Wallet } from 'lucide-react';
import api from '../api/axios';

const fmt = (n) => (n ? parseFloat(n).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '—');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

function Payments() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('payments/my-payments/')
      .then((res) => setBills(res.data))
      .catch(() => setError('Could not load your payment records.'))
      .finally(() => setLoading(false));
  }, []);

  const chip = (b) => {
    if (b.payment_status === 'paid')
      return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700"><CheckCircle2 className="w-3.5 h-3.5" /> Paid</span>;
    if (b.status === 'expired')
      return <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Expired (Invalid)</span>;
    if (b.overdue || b.status === 'overdue')
      return <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">Overdue</span>;
    if (b.total_amount)
      return <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">Pending Payment</span>;
    return <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">No Assessment</span>;
  };

  const paid = () => bills.filter((b) => b.payment_status === 'paid').length;
  const pending = () => bills.filter((b) => b.total_amount && b.payment_status !== 'paid').length;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-6 py-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2 mb-5 rounded-md bg-white border border-gray-200 text-sm font-medium text-[#0E2036] hover:border-[#C9A227] hover:text-[#C9A227] transition-colors no-underline"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="mb-6">
        <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[#0E2036]">Payments</h2>
        <p className="text-gray-500 text-sm mt-1.5">
          Payment order slips and receipts for your CPC applications.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {!loading && bills.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-md bg-amber-50 flex items-center justify-center text-amber-600">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0E2036]">{pending()}</p>
              <p className="text-xs text-gray-500 font-medium">Awaiting payment</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-md bg-green-50 flex items-center justify-center text-green-600">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0E2036]">{paid()}</p>
              <p className="text-xs text-gray-500 font-medium">Paid</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 md:px-8 py-5 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#0E2036]/5 flex items-center justify-center text-[#0E2036]">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-semibold text-[#0E2036]">Payment Order Slips</h3>
            <p className="text-xs text-gray-500">{bills.length} application(s)</p>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading payment records&hellip;</div>
        ) : bills.length === 0 ? (
          <div className="p-12 text-center">
            
            <h3 className="font-serif text-xl font-semibold text-[#0E2036] mb-2">No payment records yet</h3>
            <p className="text-sm text-gray-500">Assessed fees will appear here once your application is forwarded for payment.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {bills.map((b) => (
              <div key={b.id} className="px-6 md:px-8 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-[#0E2036] text-sm truncate">{b.cpc_type_name}</p>
                    {chip(b)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Application #{b.id}</p>
                  {b.control_number && (
                    <p className="text-xs text-gray-500 mt-0.5">Control No. {b.control_number}</p>
                  )}
                  {b.or_number && (
                    <p className="text-xs text-gray-500 mt-0.5">OR No. {b.or_number}</p>
                  )}
                  {(b.due_date || b.paid_at) && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" />
                      {b.payment_status === 'paid'
                        ? `Paid on ${fmtDate(b.paid_at)}`
                        : b.status === 'expired' ? 'Payment deadline passed — application expired'
                        : `Due by ${fmtDate(b.due_date)}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 sm:self-center">
                  <p className={`text-lg font-bold ${b.payment_status === 'paid' ? 'text-green-600' : 'text-[#0E2036]'}`}>
                    {b.total_amount ? `₱${fmt(b.total_amount)}` : '—'}
                  </p>
                  <button
                    onClick={() => navigate(`/pay/${b.id}`)}
                    disabled={!b.total_amount && b.status !== 'expired'}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0E2036] text-white rounded-lg text-xs font-semibold hover:bg-[#152C48] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {b.payment_status === 'paid' ? 'View Receipt' : b.status === 'expired' ? 'View Details' : 'View Bill'} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Payments;