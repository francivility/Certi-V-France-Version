import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Receipt, Eye, ArrowRight, CalendarClock } from 'lucide-react';
import api from '../api/axios';

const fmt = (n) => parseFloat(n).toLocaleString('en-PH', { minimumFractionDigits: 2 });

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const methodLabel = (m) =>
  m === 'online' ? 'Online'
  : m === 'onsite' || m === 'f2f' ? 'On-site'
  : null;

function PaymentQueue() {
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('payments/payment-queue/')
      .then((res) => setApplications(res.data))
      .catch(() => setError('Could not load the payment queue.'));
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-navy-800">Payment Queue</h2>
        <p className="text-gov-gray-500 text-sm mt-1 font-medium">
          Applications with an issued POS, awaiting collection.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl overflow-hidden">
        <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-navy-800 text-lg">Awaiting Payment</h3>
            <p className="text-xs text-gov-gray-500 font-medium">{applications.length} application(s) in the queue</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[920px]">
            <thead>
              <tr className="border-b border-gov-gray-200">
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Reference No.</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Applicant Name</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">CPC Type</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Control No.</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest text-right">Amount</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Method</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Due Date</th>
                <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => {
                const method = methodLabel(app.method);
                const overdue = app.overdue || app.status === 'overdue';
                const dueOverdue = overdue || (app.due_date && app.due_date < new Date().toISOString().slice(0, 10));
                return (
                  <tr key={app.id} className={`border-b border-gov-gray-100 hover:bg-gov-gray-50 transition-colors ${dueOverdue ? 'bg-gov-red-light/30' : ''}`}>
                    <td className="p-4 font-bold text-gov-gray-500 text-sm">#{app.id}</td>
                    <td className="p-4 font-bold text-navy-800">{app.applicant_name}</td>
                    <td className="p-4 text-sm font-bold text-gov-gray-600">{app.cpc_type_name}</td>
                    <td className="p-4 text-sm font-medium text-gov-gray-500">{app.control_number || '—'}</td>
                    <td className="p-4 text-right text-sm font-bold text-navy-800">
                      {app.total_amount ? `₱${fmt(app.total_amount)}` : '—'}
                    </td>
                    <td className="p-4">
                      {method ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          app.method === 'online' ? 'bg-gov-blue-light text-gov-blue' : 'bg-gov-gray-100 text-gov-gray-600'
                        }`}>
                          {app.method === 'online' ? <span className="w-1.5 h-1.5 rounded-full bg-gov-blue" /> : <span className="w-1.5 h-1.5 rounded-full bg-gov-gray-500" />}
                          {method}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gov-gray-400">Not chosen</span>
                      )}
                    </td>
                    <td className="p-4">
                      {dueOverdue ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gov-red">
                          <CalendarClock className="w-3.5 h-3.5" /> {fmtDate(app.due_date)} · Overdue
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-gov-gray-600">{fmtDate(app.due_date)}</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => navigate(`/payment/${app.id}`)}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-navy-800 text-white rounded-xl text-xs font-bold shadow-md hover:bg-gov-blue transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" /> Receive Payment
                      </button>
                    </td>
                  </tr>
                );
              })}
              {applications.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-10 text-center">
                    <div className="text-sm text-gov-gray-500 font-medium flex flex-col items-center gap-2">
                      No applications waiting for payment.
                      <Link to="/payment/history" className="inline-flex items-center gap-1.5 text-xs font-bold text-gov-blue hover:underline no-underline mt-2">
                        View Collected Applications <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
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

export default PaymentQueue;