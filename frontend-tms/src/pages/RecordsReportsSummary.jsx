import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, FileText, FileCheck2, XCircle, Layers } from 'lucide-react';
import { STATUS_LABEL } from '../constants';
import api from '../api/axios';

function RecordsReportsSummary() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('records/reports-summary/')
      .then((res) => setSummary(res.data))
      .catch(() => setError('Could not load report summary.'));
  }, []);

  const kpis = [
    {
      label: 'Total Applications',
      value: summary ? summary.total_applications : '—',
      icon: FileText,
      tint: 'bg-gov-blue-light text-gov-blue',
    },
    {
      label: 'Approved',
      value: summary ? summary.approved_count : '—',
      icon: FileCheck2,
      tint: 'bg-gov-green-light text-gov-green',
    },
    {
      label: 'Not Approved',
      value: summary ? summary.not_approved_count : '—',
      icon: XCircle,
      tint: 'bg-gov-red-light text-gov-red',
    },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-navy-800">Reports &amp; Statistics</h2>
        <p className="text-gov-gray-500 text-sm mt-1 font-medium">
          Summary counts across all applications and CPC denominations.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white border border-gov-gray-200 shadow-sm rounded-2xl p-5 flex items-center justify-between hover:shadow-md transition-all">
              <div>
                <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-1">{k.label}</p>
                <p className="text-3xl font-black text-navy-800">{k.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${k.tint}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl overflow-hidden">
          <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800 text-lg">By CPC Denomination</h3>
              <p className="text-xs text-gov-gray-500 font-medium">Total per CPC classification</p>
            </div>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gov-gray-200">
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">CPC Type</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.by_denomination || []).map((row) => (
                <tr key={row.cpc_type__type_name} className="border-b border-gov-gray-100 hover:bg-gov-gray-50 transition-colors">
                  <td className="p-4 font-bold text-navy-800 text-sm">{row.cpc_type__type_name}</td>
                  <td className="p-4 text-right font-black text-navy-800 text-sm">{row.total}</td>
                </tr>
              ))}
              {summary && summary.by_denomination.length === 0 && (
                <tr>
                  <td colSpan="2" className="p-8 text-center text-sm text-gov-gray-500 font-medium">No data yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl overflow-hidden">
          <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800 text-lg">By Status</h3>
              <p className="text-xs text-gov-gray-500 font-medium">Total per application status</p>
            </div>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gov-gray-200">
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Status</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.by_status || []).map((row) => {
                const st = STATUS_LABEL[row.status] || { label: row.status.replace(/_/g, ' '), cls: 'bg-gov-gray-200 text-gov-gray-600' };
                return (
                  <tr key={row.status} className="border-b border-gov-gray-100 hover:bg-gov-gray-50 transition-colors">
                    <td className="p-4">
                      <span className={`inline-flex px-3 py-1 text-[10px] font-extrabold rounded capitalize ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="p-4 text-right font-black text-navy-800 text-sm">{row.total}</td>
                  </tr>
                );
              })}
              {summary && summary.by_status.length === 0 && (
                <tr>
                  <td colSpan="2" className="p-8 text-center text-sm text-gov-gray-500 font-medium">No data yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6">
        <Link to="/records" className="inline-flex items-center gap-1.5 text-xs font-bold text-gov-blue hover:underline no-underline">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default RecordsReportsSummary;