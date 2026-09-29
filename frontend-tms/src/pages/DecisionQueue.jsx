import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale, FileText, CalendarDays, PenLine } from 'lucide-react';
import api from '../api/axios';

function DecisionQueue() {
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('legal/decision-queue/')
      .then((res) => setApplications(res.data))
      .catch(() => setError('Could not load queue. Are you logged in as Legal Officer?'));
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-navy-800">Decision / Order Draft</h2>
        <p className="text-gov-gray-500 text-sm mt-1 font-medium">
          Applications with completed hearings that require a Decision/Order to be drafted.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl overflow-hidden">
        <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800 text-lg">Awaiting Decision/Order</h3>
              <p className="text-xs text-gov-gray-500 font-medium">Draft, then forward to CTDO for endorsement</p>
            </div>
          </div>
          <span className="inline-flex px-3 py-1.5 rounded text-xs font-bold text-gov-blue bg-gov-blue-light shrink-0">
            {applications.length} pending
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[740px]">
            <thead>
              <tr className="border-b border-gov-gray-200">
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Reference No.</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Applicant Name</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">CPC Type</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Docket No.</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Hearing Date</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b border-gov-gray-100 hover:bg-gov-gray-50 transition-colors">
                  <td className="p-4 font-bold text-gov-gray-500 text-sm">#{app.id}</td>
                  <td className="p-4 font-bold text-navy-800">{app.applicant_name}</td>
                  <td className="p-4 text-sm font-bold text-gov-gray-600">{app.cpc_type_name}</td>
                  <td className="p-4 text-sm font-medium text-gov-gray-500 font-mono">{app.docket_number}</td>
                  <td className="p-4 text-sm font-medium text-gov-gray-500 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-navy-800 shrink-0" />
                    {app.hearing_date}
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      to={`/decision/${app.id}`}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-navy-800 text-white rounded-xl text-xs font-bold shadow-md hover:bg-gov-blue transition-colors no-underline"
                    >
                      <PenLine className="w-4 h-4" /> Draft Decision
                    </Link>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-10 text-center">
                    <div className="text-sm text-gov-gray-500 font-medium">
                      {error ? 'Unable to load the queue.' : 'No applications awaiting a Decision/Order.'}
                    </div>
                    {!error && (
                      <Link to="/decision-queue" className="inline-flex items-center gap-1.5 text-xs font-bold text-gov-blue hover:underline mt-2 no-underline">
                        Refresh
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold text-gov-gray-400">
        <FileText className="w-4 h-4" /> After drafting, forward to the CTDO for endorsement before ORD approval.
      </div>
    </div>
  );
}

export default DecisionQueue;
