import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCheck, Loader2, ShieldAlert, X } from 'lucide-react';
import api from '../api/axios';

const fmt = (n) => (n ? parseFloat(n).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '—');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

function OverdueApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(null);
  const [expiring, setExpiring] = useState(null);
  const [processing, setProcessing] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('payments/overdue-queue/')
      .then((res) => setApplications(res.data))
      .catch(() => setError('Could not load the overdue queue.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleConfirmExpire = async () => {
    setProcessing(true);
    setError('');
    try {
      await api.post(`payments/${confirming.id}/confirm-expire/`);
      setConfirming(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not expire the application.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-navy-800">Overdue & Expiration</h2>
        <p className="text-gov-gray-500 text-sm mt-1 font-medium">
          Applications that missed their 5-business-day payment deadline.
        </p>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-gov-amber/40 bg-gov-amber-light/50 px-5 py-4">
        <ShieldAlert className="w-5 h-5 text-gov-amber shrink-0 mt-0.5" />
        <p className="text-sm font-medium text-gov-gray-700 leading-relaxed">
          Overdue assessments expire at the end of the month. Confirm the expiration below to
          <span className="font-bold text-navy-800"> invalidate</span> the application — the applicant will be notified
          and must file a new application.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-2xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      {loading && (
        <div className="py-16 text-center text-sm text-gov-gray-500 font-medium">Loading overdue applications&hellip;</div>
      )}

      {!loading && (
        <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl overflow-hidden">
          <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800 text-lg">Overdue / Expired Applications</h3>
              <p className="text-xs text-gov-gray-500 font-medium">{applications.length} application(s) for review</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[880px]">
              <thead>
                <tr className="border-b border-gov-gray-200">
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Reference No.</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Applicant Name</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">CPC Type</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Control No.</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest text-right">Amount</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Due Date</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Status</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => {
                  const expired = app.status === 'expired';
                  return (
                    <tr key={app.id} className={`border-b border-gov-gray-100 hover:bg-gov-gray-50 transition-colors ${expired ? 'bg-gov-gray-50/60' : 'bg-gov-red-light/30'}`}>
                      <td className="p-4 font-bold text-gov-gray-500 text-sm">#{app.id}</td>
                      <td className="p-4 font-bold text-navy-800">{app.applicant_name}</td>
                      <td className="p-4 text-sm font-bold text-gov-gray-600">{app.cpc_type_name}</td>
                      <td className="p-4 text-sm font-medium text-gov-gray-500">{app.control_number || '—'}</td>
                      <td className="p-4 text-right text-sm font-bold text-navy-800">{app.total_amount ? `₱${fmt(app.total_amount)}` : '—'}</td>
                      <td className="p-4 text-sm font-medium text-gov-gray-600">{fmtDate(app.due_date)}</td>
                      <td className="p-4">
                        {expired ? (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold bg-gov-gray-200 text-gov-gray-600">Expired</span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold bg-gov-red-light text-gov-red">Overdue</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {expired ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gov-gray-400">
                            <X className="w-4 h-4" /> Invalid
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirming(app)}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gov-red text-white rounded-xl text-xs font-bold shadow-md hover:bg-gov-red/90 transition-colors cursor-pointer"
                          >
                            <AlertTriangle className="w-4 h-4" /> Confirm Expiration
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {applications.length === 0 && (
                  <tr>
                    <td colSpan="8" className="p-10 text-center">
                      <div className="text-sm text-gov-gray-500 font-medium flex flex-col items-center gap-2">
                        No overdue applications. All payments were received on time.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-navy-900/50" onClick={() => setConfirming(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="w-12 h-12 rounded-xl bg-gov-red-light flex items-center justify-center text-gov-red mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-bold text-navy-800 mb-2">Confirm Expiration?</h3>
            <p className="text-sm text-gov-gray-600 leading-relaxed mb-4">
              Application <span className="font-bold text-navy-800">#{confirming.id}</span>{' '}
              (from <span className="font-bold text-navy-800">{confirming.applicant_name}</span>) is{' '}
              <span className="font-bold text-navy-800">overdue</span>. Expiring it will make the application
              <span className="font-bold text-navy-800"> invalid</span> and notify the applicant to file a new one.
              This action cannot be undone.
            </p>
            {error && (
              <div className="mb-3 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-md px-4 py-2.5 text-sm font-medium">
                {error}
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirming(null)}
                disabled={processing}
                className="px-5 py-2.5 bg-gov-gray-100 text-gov-gray-600 rounded-md text-xs font-semibold hover:bg-gov-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmExpire}
                disabled={processing}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gov-red text-white rounded-md text-xs font-semibold hover:bg-gov-red/90 transition-colors cursor-pointer disabled:opacity-60"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                Expire Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OverdueApplications;