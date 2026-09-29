import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Plus, ChevronRight, FileText, ClipboardList, Landmark, FileCheck2, Clock } from 'lucide-react';
import api from '../api/axios';

function Dashboard() {
  const [userName, setUserName] = useState('Applicant');
  const [cpcTypes, setCpcTypes] = useState([]);
  const [apps, setApps] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('applications/mine/')
      .then((res) => setApps(res.data))
      .catch(() => {});
    api.get('applications/drafts/')
      .then((res) => setDrafts(res.data))
      .catch(() => {});
    api.get('cpc-types/')
      .then((res) => setCpcTypes(res.data))
      .catch(() => {});
  }, []);

  const getTypeName = (id) => {
    const t = cpcTypes.find((c) => c.id === id);
    return t ? t.type_name : `CPC #${id}`;
  };

  const activeApps = apps.filter((a) => a.status !== 'approved' && a.status !== 'dismissed' && a.status !== 'not_approved');
  const approvedApps = apps.filter((a) => a.status === 'approved');

  const stats = [
    { label: 'Total applications', value: apps.length, icon: FileText },
    { label: 'In progress', value: activeApps.length, icon: Clock },
    { label: 'Approved', value: approvedApps.length, icon: FileCheck2 },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 px-4 md:px-6 py-8">
      {/* Header */}
      <div className="bg-[#0E2036] text-white rounded-xl p-8 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <svg width="220" height="220" viewBox="0 0 220 220" fill="none" className="absolute -right-12 -top-12 opacity-[0.06] pointer-events-none">
          <circle cx="110" cy="110" r="108" stroke="#C9A227" strokeWidth="2" />
          <circle cx="110" cy="110" r="86" stroke="#C9A227" strokeWidth="1.5" />
          <circle cx="110" cy="110" r="64" stroke="#C9A227" strokeWidth="1" />
        </svg>

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 bg-white/10 text-white/85 px-3 py-1.5 rounded-md text-xs font-medium mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C9A227]" /> Applicant Portal
          </span>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold">Applicant Central</h2>
          <p className="text-white/70 text-sm mt-1.5">
            Manage your CPC franchise applications and documents.
          </p>
        </div>
        <Link
          to="/apply"
          className="relative inline-flex items-center gap-2 px-6 py-3.5 bg-white text-[#0E2036] font-semibold rounded-md text-sm hover:bg-gray-100 transition-colors no-underline shrink-0"
        >
          <Plus className="w-4.5 h-4.5" /> New CPC Application
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-md bg-[#0E2036]/5 flex items-center justify-center text-[#0E2036] shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-semibold text-[#0E2036] leading-none">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1.5">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - available actions */}
        <div className="md:col-span-2 space-y-4">
          {/* Apply for CPC card */}
          <Link
            to="/apply"
            className="block bg-white border border-gray-200 border-l-4 border-l-[#0E2036] rounded-lg p-6 hover:border-l-[#C9A227] transition-colors no-underline group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-md bg-[#0E2036]/5 flex items-center justify-center text-[#0E2036] shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#0E2036] text-base">Apply for CPC</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-md">
                    Submit a new Certificate of Public Convenience application. Choose your transport denomination and upload the required documents.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4.5 h-4.5 text-gray-300 group-hover:text-[#C9A227] transition-colors shrink-0 mt-1" />
            </div>
          </Link>

          {drafts.length > 0 && (
            <Link
              to={`/apply/${drafts[0].id}/documents`}
              className="block bg-white border border-gray-200 border-l-4 border-l-amber-500 rounded-lg p-6 hover:border-l-[#C9A227] transition-colors no-underline group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-md bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#0E2036] text-base">Continue Draft {drafts.length > 1 ? `(${drafts.length} pending)` : ''}</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-md">
                      {drafts[0].documents?.length || 0} requirement{drafts[0].documents?.length === 1 ? '' : 's'} uploaded so far. Finish uploading and submit to officially create your application.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4.5 h-4.5 text-gray-300 group-hover:text-[#C9A227] transition-colors shrink-0 mt-1" />
              </div>
            </Link>
          )}

          {/* My Applications card */}
          <Link
            to="/my-applications"
            className="block bg-white border border-gray-200 rounded-lg p-6 hover:border-[#C9A227] transition-colors no-underline group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-md bg-[#0E2036]/5 flex items-center justify-center text-[#0E2036] shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#0E2036] text-base">My Applications</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-md">
                    View all submitted applications and their current processing status.
                  </p>
                  {apps.length > 0 && (
                    <span className="inline-flex items-center gap-1 mt-3 bg-[#0E2036]/5 text-[#0E2036] rounded-md px-2.5 py-1 text-xs font-medium">
                      {apps.filter((a) => a.status !== 'dismissed' && a.status !== 'not_approved').length} active application{apps.filter((a) => a.status !== 'dismissed' && a.status !== 'not_approved').length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4.5 h-4.5 text-gray-300 group-hover:text-[#C9A227] transition-colors shrink-0 mt-1" />
            </div>
          </Link>
        </div>

        {/* Right column - recent activity */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col h-fit">
          <h3 className="font-semibold text-[#0E2036] mb-4 text-base">Recent applications</h3>
          {apps.length === 0 ? (
            <p className="text-xs text-gray-500">
              No applications yet. Start by applying for a CPC.
            </p>
          ) : (
            <div className="space-y-2.5">
              {apps.slice(0, 3).map((app) => (
                <div key={app.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#0E2036] truncate">{getTypeName(app.cpc_type)}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Application #{app.id}</p>
                  </div>
                  <span className="text-[10px] font-medium text-gray-500 capitalize shrink-0 ml-2">
                    {app.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
              <Link
                to="/my-applications"
                className="block text-center mt-3 py-2.5 text-sm font-medium text-[#0E2036] hover:text-[#C9A227] transition-colors no-underline"
              >
                View all applications
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Branding footer */}
      <div className="flex items-center justify-center gap-2 pt-2 text-gray-400">
        <Landmark className="w-4 h-4" />
        <span className="text-xs">LTFRB Region V &mdash; Public Convenience Engine</span>
      </div>
    </div>
  );
}

export default Dashboard;