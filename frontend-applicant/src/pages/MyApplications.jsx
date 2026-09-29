import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CalendarCheck, ClipboardList, FileCheck2, RefreshCcw,
  UploadCloud, Download, ChevronRight, Landmark, AlertTriangle, Wallet,
} from 'lucide-react';
import api from '../api/axios';

const STATUS_LABELS = {
  pending_upload: 'Pending Upload',
  pending_receiving: 'Pending Receiving',
  needs_correction: 'Needs Correction',
  pending_ctdo: 'Pending CTDO Validation',
  pending_assessment: 'Pending Assessment',
  pending_payment: 'Pending Payment',
  pending_legal: 'Pending Legal',
  pending_hearing: 'Pending Hearing',
  pending_ctdo_endorsement: 'Pending CTDO Endorsement',
  pending_ord: 'Pending ORD Approval',
  approved: 'Approved',
  not_approved: 'Not Approved',
  dismissed: 'Dismissed',
  overdue: 'Overdue',
  expired: 'Expired (Invalid)',
};

const STATUS_STYLES = {
  pending_upload: 'bg-gray-100 text-gray-600',
  pending_receiving: 'bg-amber-50 text-amber-700',
  needs_correction: 'bg-red-50 text-red-700',
  pending_ctdo: 'bg-blue-50 text-blue-700',
  pending_assessment: 'bg-blue-50 text-blue-700',
  pending_payment: 'bg-amber-50 text-amber-700',
  pending_legal: 'bg-blue-50 text-blue-700',
  pending_hearing: 'bg-blue-50 text-blue-700',
  pending_ctdo_endorsement: 'bg-blue-50 text-blue-700',
  pending_ord: 'bg-blue-50 text-blue-700',
  approved: 'bg-green-50 text-green-700',
  not_approved: 'bg-red-50 text-red-700',
  dismissed: 'bg-gray-100 text-gray-600',
  overdue: 'bg-red-50 text-red-700',
  expired: 'bg-red-50 text-red-700',
};

function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [cpcTypes, setCpcTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('applications/mine/'),
      api.get('applications/drafts/'),
      api.get('cpc-types/'),
    ])
      .then(([appsRes, draftsRes, typesRes]) => {
        setApplications(appsRes.data);
        setDrafts(draftsRes.data);
        setCpcTypes(typesRes.data);
      })
      .catch(() => setError('Could not load applications.'))
      .finally(() => setLoading(false));
  }, []);

  const getCpcName = (id) => {
    const t = cpcTypes.find((c) => c.id === id);
    return t ? t.type_name : `Type #${id}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-6 py-8">
      {/* Header */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2 mb-5 rounded-md bg-white border border-gray-200 text-sm font-medium text-[#0E2036] hover:border-[#C9A227] hover:text-[#C9A227] transition-colors no-underline"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-semibold text-[#0E2036]">My Applications</h2>
          <p className="text-gray-500 text-sm mt-1.5">
            Track the status of all your CPC franchise applications.
          </p>
        </div>
        <Link
          to="/apply"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#0E2036] text-white font-semibold rounded-md hover:bg-[#152C48] transition-colors no-underline shrink-0"
        >
          <ClipboardList className="w-4.5 h-4.5" /> New Application
        </Link>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}
      {loading && (
        <div className="py-16 text-center text-sm text-gray-500">Loading applications&hellip;</div>
      )}

      {!loading && applications.length === 0 && drafts.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="w-14 h-14 rounded-md bg-gray-100 flex items-center justify-center mx-auto mb-4 text-gray-400">
            <FileCheck2 className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-semibold text-[#0E2036] mb-2">No applications yet</h3>
          <p className="text-sm text-gray-500 mb-6">
            Start your first Certificate of Public Convenience application today.
          </p>
          <Link
            to="/apply"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#0E2036] text-white font-semibold rounded-md hover:bg-[#152C48] transition-colors no-underline"
          >
            Apply for CPC <ArrowRight className="w-4.5 h-4.5" />
          </Link>
        </div>
      )}

      {drafts.length > 0 && (
        <h3 className="text-xl font-semibold text-[#0E2036] mt-8 mb-3">In-progress drafts</h3>
      )}

      <div className="space-y-4">
        {drafts.map((app) => {
          const docCount = app.documents ? app.documents.length : 0;
          return (
            <div
              key={`draft-${app.id}`}
              className="bg-white border border-dashed border-gray-300 rounded-xl p-6 md:p-7 hover:border-[#C9A227]/50 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-5">
                {/* Left: identity */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-lg bg-[#0E2036]/5 flex items-center justify-center text-[#0E2036] shrink-0">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-semibold text-[#0E2036] truncate">{getCpcName(app.cpc_type)}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{docCount} / {cpcTypes.length > 0 ? 'all' : docCount} requirements uploaded</p>
                  </div>
                </div>

                {/* Right: status + actions */}
                <div className="flex flex-col items-start md:items-end gap-3 shrink-0 md:ml-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                    <RefreshCcw className="w-3 h-3" /> Status: In progress (draft)
                  </span>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => navigate(`/apply/${app.id}/documents`)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#0E2036] text-white rounded-md text-xs font-semibold hover:bg-[#152C48] transition-colors cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4" /> Continue Upload
                    </button>
                    <button
                      onClick={() => { if (window.confirm('Discard this draft application? This cannot be undone.')) { api.delete(`applications/drafts/${app.id}/delete/`).then(() => { setDrafts((d) => d.filter((x) => x.id !== app.id)); }); } }}
                      className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-red-200 text-red-700 rounded-md text-xs font-semibold hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {applications.length > 0 && (
        <h3 className="text-xl font-semibold text-[#0E2036] mt-8 mb-3">Submitted applications</h3>
      )}

      <div className="space-y-4">
        {applications.map((app) => {
          const statusStyle = STATUS_STYLES[app.status] || 'bg-gray-100 text-gray-600';
          const isReleased = app.released;
          return (
            <div
              key={app.id}
              className="bg-white border border-gray-200 rounded-xl p-6 md:p-7 hover:border-[#C9A227]/50 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-5">
                {/* Left: identity + meta */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-lg bg-[#0E2036]/5 flex items-center justify-center text-[#0E2036] shrink-0">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-semibold text-[#0E2036] truncate">
                      {app.cpc_type_name || getCpcName(app.cpc_type)}
                    </h4>
                    <p className="text-sm font-medium text-gray-600 mt-0.5 truncate">{app.business_name}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarCheck className="w-3.5 h-3.5" /> Submitted: {new Date(app.submitted_at).toLocaleDateString()}
                      </span>
                      {isReleased && (
                        <span className="inline-flex items-center gap-1.5">
                          <Download className="w-3.5 h-3.5" /> CPC released
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: status + action */}
                <div className="flex flex-col items-start md:items-end gap-3 shrink-0 md:ml-6">
                  <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold ${statusStyle}`}>
                    Status: {STATUS_LABELS[app.status] || app.status}
                  </span>
                  {isReleased ? (
                    <Link
                      to={`/cpc-release/${app.id}`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md text-xs font-semibold hover:bg-green-700 transition-colors no-underline"
                    >
                      <Download className="w-4 h-4" /> Download CPC
                    </Link>
                  ) : app.status === 'expired' ? (
                    <span className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-500 rounded-md text-xs font-semibold cursor-not-allowed">
                      Invalid — file a new application
                    </span>
                  ) : (app.has_soa && app.payment_status !== 'paid') || app.status === 'pending_payment' || app.status === 'overdue' ? (
                    <button
                      onClick={() => navigate(`/pay/${app.id}`)}
                      className={`inline-flex items-center gap-2 px-6 py-3 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        app.overdue || app.status === 'overdue'
                          ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                          : 'bg-[#0E2036] text-white hover:bg-[#152C48]'
                      }`}
                    >
                      {app.overdue || app.status === 'overdue' ? <AlertTriangle className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                      {app.overdue || app.status === 'overdue' ? 'Pay / View overdue' : 'Pay fees'}
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/apply/${app.id}/documents`)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-[#0E2036] text-[#0E2036] rounded-md text-xs font-semibold hover:bg-[#0E2036] hover:text-white transition-colors cursor-pointer"
                    >
                      View <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MyApplications;