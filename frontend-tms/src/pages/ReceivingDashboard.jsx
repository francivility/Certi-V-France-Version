import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ClipboardCheck, Inbox, ArrowRight, History, Search, FileText, ClipboardList } from 'lucide-react';
import api from '../api/axios';
import { getAuth } from '../api/auth';
import WorkspaceCard from '../components/WorkspaceCard';

function ReceivingDashboard() {
  const [tasks, setTasks] = useState([]);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const name = getAuth().name || 'Officer';

  const load = () => {
    api.get('applications/receiving-queue/')
      .then((res) => {
        const queue = res.data || [];
        setRecent(queue.slice(0, 5));
        setTasks([
          {
            id: 'review-pending',
            label: 'Applications awaiting receiving review',
            count: queue.length,
            to: '/receiving/queue',
            icon: ClipboardCheck,
            tint: 'bg-navy-800/5 text-navy-800',
          },
          {
            id: 'recent',
            label: 'Latest submitted applications to assess',
            count: queue.slice(0, 5).length,
            to: '/receiving/queue',
            icon: Inbox,
            tint: 'bg-navy-800/5 text-navy-800',
          },
        ]);
      })
      .catch(() => setError('Could not load dashboard.'));
  };

  useEffect(() => { load(); }, []);

  const links = [
    { to: '/receiving/queue', label: 'Receiving Queue', desc: 'Review and assess submitted applications', icon: Inbox },
    { to: '/receiving/applications', label: 'Application History', desc: 'Browse previously received applications', icon: History },
    { to: '/receiving/search', label: 'Case Search', desc: 'Find applications by reference or applicant', icon: Search },
    { to: '/receiving/reports', label: 'Reports', desc: 'Summary counts and statistics', icon: FileText },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="font-serif text-3xl md:text-4xl font-semibold text-navy-800">Hello, {name}</h2>
        <p className="text-gov-gray-500 text-sm mt-1">
          Receiving Dashboard &middot; here's what needs your attention today.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-md px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      <WorkspaceCard links={links} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gov-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
                <ClipboardCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-800 text-base">Applications to handle</h3>
                <p className="text-xs text-gov-gray-500">Latest 5 applications awaiting your review</p>
              </div>
            </div>
            <Link to="/receiving/queue" className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 hover:text-gold transition-colors no-underline shrink-0">
              View full queue <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-gov-gray-200">
                  <th className="p-4 text-xs font-semibold text-gov-gray-500">Reference No.</th>
                  <th className="p-4 text-xs font-semibold text-gov-gray-500">Applicant Name</th>
                  <th className="p-4 text-xs font-semibold text-gov-gray-500">CPC Type</th>
                  <th className="p-4 text-xs font-semibold text-gov-gray-500">Submitted</th>
                  <th className="p-4 text-xs font-semibold text-gov-gray-500 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((app) => (
                  <tr key={app.id} className="border-b border-gov-gray-100 hover:bg-gov-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gov-gray-500 text-sm">#{app.id}</td>
                    <td className="p-4 font-medium text-navy-800">{app.applicant_name}</td>
                    <td className="p-4 text-sm text-gov-gray-600">{app.cpc_type_name}</td>
                    <td className="p-4 text-sm text-gov-gray-500">
                      {new Date(app.submitted_at).toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => navigate(`/receiving/${app.id}`)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy-800 text-white rounded-md text-xs font-semibold hover:bg-navy-700 transition-colors cursor-pointer"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-10 text-center text-sm text-gov-gray-500">
                      No applications waiting for review.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 border-t border-gov-gray-200 flex justify-center bg-gov-gray-50/40">
            <button onClick={load} className="text-xs font-semibold text-navy-700 hover:text-gold transition-colors cursor-pointer">
              Refresh ⟳
            </button>
          </div>
        </div>

        <div className="lg:col-span-1 bg-white border border-gov-gray-200 rounded-xl overflow-hidden self-start">
          <div className="px-6 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
              <ClipboardList className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-semibold text-navy-800 text-base">Things to do</h3>
              <p className="text-xs text-gov-gray-500">Your pending action items</p>
            </div>
          </div>

          <div className="divide-y divide-gov-gray-100">
            {tasks.map((t) => {
              const Icon = t.icon;
              return (
                <Link to={t.to} key={t.id} className="flex items-center gap-4 px-6 py-5 hover:bg-gov-gray-50 transition-colors no-underline">
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${t.tint}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-navy-800 leading-tight">{t.label}</p>
                    <p className="text-xs text-gov-gray-500 mt-0.5">
                      {t.count > 0 ? `${t.count} to process` : 'All caught up'}
                    </p>
                  </div>
                  <span className="text-xl font-semibold text-navy-800 shrink-0">{t.count}</span>
                  <ArrowRight className="w-4 h-4 text-gov-gray-400 shrink-0" />
                </Link>
              );
            })}
            {tasks.length === 0 && (
              <p className="px-6 py-10 text-center text-sm text-gov-gray-500">Loading your tasks...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReceivingDashboard;