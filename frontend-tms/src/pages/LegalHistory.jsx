import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Eye, Search } from 'lucide-react';
import api from '../api/axios';
import { STATUS_LABEL } from '../constants';

function LegalHistory() {
  const [applications, setApplications] = useState([]);
  const [denom, setDenom] = useState('all');
  const [status, setStatus] = useState('all');
  const [range, setRange] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('legal/history/')
      .then((res) => setApplications(res.data))
      .catch(() => setError('Could not load application history.'));
  }, []);

  const inRange = (dateStr) => {
    if (range === 'all') return true;
    const d = new Date(dateStr);
    const now = new Date();
    switch (range) {
      case 'today':
        return d.toDateString() === now.toDateString();
      case 'week': {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        return d >= start && d <= now;
      }
      case 'month':
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      case 'year':
        return d.getFullYear() === now.getFullYear();
      default:
        return true;
    }
  };

  const q = searchQuery.toLowerCase();
  const filtered = applications.filter(
    (a) =>
      (denom === 'all' || a.cpc_type_name === denom) &&
      (status === 'all' || a.status === status) &&
      inRange(a.submitted_at) &&
      (!q || a.applicant_name.toLowerCase().includes(q) || (a.case_number || '').toLowerCase().includes(q) || (a.docket_number || '').toLowerCase().includes(q))
  );

  const denoms = [...new Set(applications.map((a) => a.cpc_type_name))];
  const statuses = [...new Set(applications.map((a) => a.status))];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-navy-800">Application History</h2>
        <p className="text-gov-gray-500 text-sm mt-1 font-medium">
          Applications that have entered or passed through the legal review workflow.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl overflow-hidden">
        <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800 text-lg">Legal Workflow History</h3>
              <p className="text-xs text-gov-gray-500 font-medium">{applications.length} total records</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gov-gray-400" />
              <input
                type="text"
                placeholder="Search name, case no., docket no."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs font-bold bg-white text-gov-gray-600 border border-gov-gray-200 focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>
            <button
              onClick={() => { setDenom('all'); setStatus('all'); setRange('all'); setSearchQuery(''); }}
              className={`px-4 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer border ${
                denom === 'all' && status === 'all' && range === 'all' && searchQuery === ''
                  ? 'bg-navy-800 text-white border-navy-800'
                  : 'bg-white text-gov-gray-600 border-gov-gray-200 hover:border-gov-blue'
              }`}
            >
              All
            </button>

            <select
              value={denom}
              onChange={(e) => setDenom(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-gov-gray-600 border border-gov-gray-200 focus:outline-none focus:ring-2 focus:ring-navy-600 cursor-pointer"
            >
              <option value="all">All CPC Types</option>
              {denoms.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-gov-gray-600 border border-gov-gray-200 focus:outline-none focus:ring-2 focus:ring-navy-600 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {(STATUS_LABEL[s] || { label: s }).label}
                </option>
              ))}
            </select>

            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-gov-gray-600 border border-gov-gray-200 focus:outline-none focus:ring-2 focus:ring-navy-600 cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[860px]">
            <thead>
              <tr className="border-b border-gov-gray-200">
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Reference No.</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Applicant Name</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">CPC Type</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Case No.</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Status</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Submitted</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => {
                const st = STATUS_LABEL[app.status] || { label: app.status, cls: 'bg-gov-gray-200 text-gov-gray-600' };
                return (
                  <tr key={app.id} className="border-b border-gov-gray-100 hover:bg-gov-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gov-gray-500 text-sm">#{app.id}</td>
                    <td className="p-4 font-bold text-navy-800">{app.applicant_name}</td>
                    <td className="p-4 text-sm font-bold text-gov-gray-600">{app.cpc_type_name}</td>
                    <td className="p-4 text-sm font-medium text-gov-gray-500 font-mono">{app.case_number || '—'}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-3 py-1 text-[10px] font-extrabold rounded ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-medium text-gov-gray-500">
                      {new Date(app.submitted_at).toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => navigate(`/legal/history/${app.id}`)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-navy-800 text-white rounded-xl text-xs font-bold shadow-md hover:bg-gov-blue transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-10 text-center">
                    <div className="text-sm text-gov-gray-500 font-medium flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-gov-gray-300" />
                      No applications found for this filter.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default LegalHistory;
