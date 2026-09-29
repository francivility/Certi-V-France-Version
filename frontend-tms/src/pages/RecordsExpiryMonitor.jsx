import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, AlertTriangle, ShieldCheck, Search } from 'lucide-react';
import api from '../api/axios';

function RecordsExpiryMonitor() {
  const [days, setDays] = useState(60);
  const [expiring, setExpiring] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`records/expiry-monitor/?days=${days}`)
      .then((res) => setExpiring(res.data))
      .catch(() => setError('Could not load expiry monitor.'));
  }, [days]);

  const daysLeft = (expiryDate) => {
    const now = new Date();
    const exp = new Date(expiryDate + 'T00:00:00');
    return Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-navy-800">CPC Expiry Monitoring</h2>
        <p className="text-gov-gray-500 text-sm mt-1 font-medium">
          Approved CPCs approaching their franchise renewal date.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl overflow-hidden">
        <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800 text-lg">Expiring CPCs</h3>
              <p className="text-xs text-gov-gray-500 font-medium">{expiring.length} within the selected window</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-gov-gray-500">Show CPCs expiring within:</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-gov-gray-600 border border-gov-gray-200 focus:outline-none focus:ring-2 focus:ring-navy-600 cursor-pointer"
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
            </select>
          </div>
        </div>

        {expiring.length === 0 && !error ? (
          <div className="p-10 text-center">
            <div className="text-sm text-gov-gray-500 font-medium flex flex-col items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-navy-800" />
              No CPCs expiring within this window.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-gov-gray-200">
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Reference No.</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Applicant Name</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">CPC Type</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Case No.</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Expiry Date</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest text-right">Days Left</th>
                </tr>
              </thead>
              <tbody>
                {expiring.map((e) => {
                  const dl = daysLeft(e.expiry_date);
                  return (
                    <tr key={e.application_id} className="border-b border-gov-gray-100 hover:bg-gov-gray-50 transition-colors">
                      <td className="p-4 font-bold text-gov-gray-500 text-sm">#{e.application_id}</td>
                      <td className="p-4 font-bold text-navy-800">{e.applicant_name}</td>
                      <td className="p-4 text-sm font-bold text-gov-gray-600">{e.cpc_type_name}</td>
                      <td className="p-4 text-sm font-medium text-gov-gray-500 font-mono">{e.case_number || '—'}</td>
                      <td className="p-4 text-sm font-medium text-gov-gray-500">
                        {new Date(e.expiry_date + 'T00:00:00').toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 text-[10px] font-extrabold rounded ${
                          dl <= 30 ? 'bg-gov-red-light text-gov-red' : dl <= 90 ? 'bg-gov-amber-light text-gov-amber' : 'bg-gov-green-light text-gov-green'
                        }`}>
                          {dl <= 30 && <AlertTriangle className="w-3 h-3" />} {dl} days
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] font-semibold text-gov-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gov-red-light border border-gov-red/20" /> â‰¤ 30 days
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gov-amber-light border border-gov-amber/20" /> 31–90 days
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gov-green-light border border-gov-green/20" /> 91+ days
        </span>
        <Link to="/records/case-search" className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-gov-blue hover:underline no-underline">
          <Search className="w-3.5 h-3.5" /> Go to Case Search
        </Link>
      </div>
    </div>
  );
}

export default RecordsExpiryMonitor;