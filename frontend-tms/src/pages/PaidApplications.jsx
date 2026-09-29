import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck2, Banknote, Inbox, ArrowUpRight } from 'lucide-react';
import api from '../api/axios';

const fmt = (n) => parseFloat(n).toLocaleString('en-PH', { minimumFractionDigits: 2 });

function PaidApplications() {
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('payments/paid-queue/')
      .then((res) => setApplications(res.data))
      .catch(() => setError('Could not load paid queue.'));
  }, []);

  const totalCollected = applications.reduce(
    (sum, app) => sum + (app.total_amount ? parseFloat(app.total_amount) : 0),
    0
  );

  const kpis = [
    {
      label: 'Awaiting Docket',
      value: applications.length,
      sub: 'Paid applications pending docket number',
      icon: Inbox,
      tint: 'bg-navy-800/5 text-navy-800',
    },
    {
      label: 'Total Collected',
      value: `₱${fmt(totalCollected)}`,
      sub: 'Sum of paid SOAs in this queue',
      icon: Banknote,
      tint: 'bg-navy-800/5 text-navy-800',
    },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-navy-800">Paid / Docket</h2>
        <p className="text-gov-gray-500 text-sm mt-1 font-medium">
          Applications the Cashier has collected and are ready for docket assignment and forwarding to Legal.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white border border-gov-gray-200 shadow-sm rounded-2xl p-5 flex items-center justify-between hover:shadow-md transition-all">
              <div>
                <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-1">{k.label}</p>
                <p className="text-3xl font-black text-navy-800">{k.value}</p>
                <p className="text-[10px] text-gov-gray-400 font-medium mt-1">{k.sub}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${k.tint}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl overflow-hidden">
        <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800 text-lg">Paid Applications</h3>
              <p className="text-xs text-gov-gray-500 font-medium">Verify the OR and assign a docket number</p>
            </div>
          </div>
          <span className="inline-flex px-3 py-1.5 rounded text-xs font-bold text-gov-green bg-gov-green-light shrink-0">
            {applications.length} to process
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[860px]">
            <thead>
              <tr className="border-b border-gov-gray-200">
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Reference No.</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Applicant Name</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">CPC Type</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Control No.</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">OR Number</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest text-right">Total Paid</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Paid At</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b border-gov-gray-100 hover:bg-gov-gray-50 transition-colors">
                  <td className="p-4 font-bold text-gov-gray-500 text-sm">#{app.id}</td>
                  <td className="p-4 font-bold text-navy-800">{app.applicant_name}</td>
                  <td className="p-4 text-sm font-bold text-gov-gray-600">{app.cpc_type_name}</td>
                  <td className="p-4 text-sm font-medium text-gov-gray-500">{app.control_number || '—'}</td>
                  <td className="p-4 text-sm font-medium text-gov-gray-500">{app.or_number || '—'}</td>
                  <td className="p-4 text-right text-sm font-bold text-navy-800">₱{fmt(app.total_amount || 0)}</td>
                  <td className="p-4 text-sm font-medium text-gov-gray-500">
                    {app.paid_at ? new Date(app.paid_at).toLocaleString() : '—'}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => navigate(`/paid/${app.id}`)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-navy-800 text-white rounded-xl text-xs font-bold shadow-md hover:bg-gov-blue transition-colors cursor-pointer"
                    >
                      <ArrowUpRight className="w-4 h-4" /> Docket
                    </button>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-10 text-center">
                    <div className="text-sm text-gov-gray-500 font-medium flex flex-col items-center gap-2">
                      No paid applications waiting for docket assignment.
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

export default PaidApplications;