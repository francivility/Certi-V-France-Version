import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Receipt, CheckCheck, Loader2, FileCheck2, Banknote,
  Building2, CalendarCheck, Hash, ArrowUpRight,
} from 'lucide-react';
import api from '../api/axios';

const fmt = (n) => parseFloat(n).toLocaleString('en-PH', { minimumFractionDigits: 2 });

function DocketForward() {
  const { applicationId } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [forwarding, setForwarding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`payments/receipt/${applicationId}/`)
      .then((res) => setReceipt(res.data))
      .catch(() => setError('Could not load receipt for this application.'));
  }, [applicationId]);

  const handleForward = async () => {
    setError('');
    setForwarding(true);
    try {
      const res = await api.post(`payments/generate-docket/${applicationId}/`);
      setReceipt(res.data);
      setMessage('Docket number generated and forwarded to Legal Officer.');
      setTimeout(() => navigate('/paid'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not forward to Legal Officer.');
      setForwarding(false);
    }
  };

  if (!receipt) {
    return (
      <div className="px-6 py-16 text-center text-sm text-gov-gray-500 font-medium">
        {error || 'Loading receipt...'}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="px-4 sm:px-6 lg:px-8 pt-8">
        <Link
          to="/paid"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gov-gray-200 text-sm font-bold text-navy-800 hover:bg-navy-50 hover:border-gov-blue transition-colors no-underline shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Paid / Docket Queue
        </Link>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="font-serif text-3xl font-extrabold text-navy-800">Docket Assignment</h2>
          <p className="text-gov-gray-500 text-sm mt-1 font-medium">
            Confirm the payment receipt, then generate the docket number and forward to the Legal Officer.
          </p>
        </div>

      {message && (
        <div className="mb-6 bg-gov-green-light border border-gov-green/30 text-gov-green rounded-xl px-4 py-3 text-sm font-semibold">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_310px] xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl overflow-hidden">
          <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800">Fee Breakdown</h3>
              <p className="text-xs text-gov-gray-500 font-medium">Assessment items and total amount</p>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <div className="overflow-x-auto rounded-2xl border border-gov-gray-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gov-gray-200 bg-gov-gray-50/60">
                    <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Fee Name</th>
                    <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(receipt.items || []).map((item) => (
                    <tr key={item.id} className="border-b border-gov-gray-100">
                      <td className="p-4 font-bold text-navy-800 text-sm">{item.fee_name}</td>
                      <td className="p-4 text-right font-bold text-gov-gray-600">P{fmt(item.amount)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="p-4 font-extrabold text-navy-800">Grand Total Paid</td>
                    <td className="p-4 text-right font-black text-navy-800 text-lg">P{fmt(receipt.total_amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Hash className="w-5 h-5 text-navy-800 shrink-0" />
                <div>
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest">Docket Number</p>
                  <p className="text-lg font-black text-navy-800">{receipt.docket_number || 'Not yet assigned'}</p>
                </div>
              </div>
              {receivedButUnforwarded(receipt) ? (
                <button
                  onClick={handleForward}
                  disabled={forwarding}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gov-blue text-white text-sm font-bold rounded-xl shadow-md hover:bg-gov-blue-dark transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {forwarding ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ArrowUpRight className="w-5 h-5" /> Generate Docket &amp; Forward</>}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-gov-green bg-gov-green-light">
                  <FileCheck2 className="w-4 h-4" /> Docketed &amp; forwarded to Legal
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-lg bg-navy-800 flex items-center justify-center text-white font-serif font-bold text-lg">
                #{applicationId}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-navy-800 text-base truncate">{receipt.operator_name}</h3>
                <p className="text-[11px] text-gov-gray-500 font-medium">Paid Application #{applicationId}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold text-gov-green bg-gov-green-light mb-5">
              <CheckCheck className="w-4 h-4" /> Payment Verified
            </span>

            <div className="space-y-3">
              <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-xl px-3 py-2.5 flex items-start gap-3">
                <Receipt className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest">Control Number</p>
                  <p className="text-sm font-bold text-navy-800">{receipt.control_number}</p>
                </div>
              </div>
              <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-xl px-3 py-2.5 flex items-start gap-3">
                <Banknote className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest">OR Number</p>
                  <p className="text-sm font-bold text-navy-800">{receipt.or_number || '\u2014'}</p>
                </div>
              </div>
              <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-xl px-3 py-2.5 flex items-start gap-3">
                <Building2 className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest">Denomination</p>
                  <p className="text-sm font-bold text-navy-800">{receipt.denomination}</p>
                </div>
              </div>
              <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-xl px-3 py-2.5 flex items-start gap-3">
                <CalendarCheck className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest">Paid At</p>
                  <p className="text-sm font-bold text-navy-800">
                    {receipt.paid_at ? new Date(receipt.paid_at).toLocaleString() : '\u2014'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

function receivedButUnforwarded(receipt) {
  return !receipt.docket_number;
}

export default DocketForward;
