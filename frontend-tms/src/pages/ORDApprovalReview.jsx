import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, FileText, Building2, User, CalendarCheck, Hash,
  CheckCheck, Loader2, PenLine, ShieldCheck, Scale,
} from 'lucide-react';
import api from '../api/axios';

function OrdApprovalReview() {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [decision, setDecision] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    api.get(`legal/decision-for-approval/${applicationId}/`)
      .then((res) => setDecision(res.data))
      .catch(() => setError('Could not load Decision/Order for this application.'));
  }, [applicationId]);

  const handleApprove = async () => {
    setError('');
    setApproving(true);
    try {
      const res = await api.post(`legal/approve-decision/${applicationId}/`);
      setDecision(res.data);
      setMessage('Decision/Order finalized. Forwarded to the Records Officer for release.');
      setTimeout(() => navigate('/ord-queue'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not approve this Decision/Order.');
    } finally {
      setApproving(false);
    }
  };

  if (!decision) {
    return (
      <div className="px-6 py-16 text-center text-sm text-gov-gray-500 font-medium">
        {error || 'Loading Decision/Order...'}
      </div>
    );
  }

  const isFinalized = decision.status === 'finalized';

  return (
    <div className="w-full">
      <div className="px-5 sm:px-8 lg:px-12 pt-8">
        <Link
          to="/ord-queue"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gov-gray-200 text-sm font-bold text-navy-800 hover:bg-navy-50 hover:border-gov-blue transition-colors no-underline shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Approval Queue
        </Link>
      </div>

      <div className="w-full px-5 sm:px-8 lg:px-12 py-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="font-serif text-3xl font-extrabold text-navy-800">Review for Approval</h2>
        <p className="text-gov-gray-500 text-sm mt-1 font-medium">
          Review the endorsed Decision/Order and attach the ORD electronic signature to finalize.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-6 bg-gov-green-light border border-gov-green/30 text-gov-green rounded-xl px-4 py-3 text-sm font-semibold">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_310px] xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="flex flex-col gap-6">
        <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl overflow-hidden">
          <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800">Decision / Order Content</h3>
              <p className="text-xs text-gov-gray-500 font-medium">Endorsed by the Legal Officer and CTDO</p>
            </div>
          </div>
          <div className="p-6 md:p-8">
            <div className="whitespace-pre-wrap text-sm text-navy-800 font-medium leading-relaxed bg-gov-gray-50 border border-gov-gray-200 rounded-xl p-5">
              {decision.content || 'No content available.'}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          {!isFinalized ? (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gov-blue text-white text-sm font-bold rounded-xl shadow-md hover:bg-gov-blue-dark transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {approving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><PenLine className="w-5 h-5" /> Attach E-Signature &amp; Approve</>}
            </button>
          ) : (
            <span className="inline-flex items-center gap-2 px-6 py-3 bg-gov-green-light text-gov-green rounded-xl text-sm font-bold">
              <CheckCheck className="w-5 h-5" /> Finalized · Approved on {new Date(decision.ord_approved_at).toLocaleDateString()}
            </span>
          )}
        </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-lg bg-navy-800 flex items-center justify-center text-white font-serif font-bold text-lg">
                #{applicationId}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-navy-800 text-base truncate">{decision.applicant_name}</h3>
                <p className="text-[11px] text-gov-gray-500 font-medium">App #{applicationId}</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold mb-5 ${
              isFinalized ? 'text-gov-green bg-gov-green-light' : 'text-gov-amber bg-gov-amber-light'
            }`}>
              <ShieldCheck className="w-4 h-4" /> {isFinalized ? 'Finalized' : 'Pending ORD Approval'}
            </span>

            <div className="space-y-3">
              <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-xl px-3 py-2.5 flex items-start gap-3">
                <Building2 className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest">Decision</p>
                  <p className="text-sm font-bold text-navy-800 capitalize">{decision.decision_type?.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-xl px-3 py-2.5 flex items-start gap-3">
                <Scale className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest">Case No.</p>
                  <p className="text-sm font-bold text-navy-800 font-mono break-all">{decision.case_number || '\u2014'}</p>
                </div>
              </div>
              <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-xl px-3 py-2.5 flex items-start gap-3">
                <Hash className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest">Docket No.</p>
                  <p className="text-sm font-bold text-navy-800 font-mono break-all">{decision.docket_number || '\u2014'}</p>
                </div>
              </div>
              <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-xl px-3 py-2.5 flex items-start gap-3">
                <User className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest">Drafted By</p>
                  <p className="text-sm font-bold text-navy-800 break-words">{decision.drafted_by_name || '\u2014'}</p>
                </div>
              </div>
              <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-xl px-3 py-2.5 flex items-start gap-3">
                <CalendarCheck className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest">CTDO Endorsed</p>
                  <p className="text-sm font-bold text-navy-800">
                    {decision.ctdo_endorsed_at ? new Date(decision.ctdo_endorsed_at).toLocaleDateString() : '\u2014'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold text-gov-gray-400">
        <Hash className="w-4 h-4" /> Approval finalizes the Decision/Order and forwards it to the Records Officer for release.
      </div>
    </div>
    </div>
  );
}

export default OrdApprovalReview;
