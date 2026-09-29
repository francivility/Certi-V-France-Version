import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, FileText, Building2, Hash, CalendarCheck, PenLine,
  CheckCheck, Loader2, ShieldCheck, User,
} from 'lucide-react';
import api from '../api/axios';

function CtdoEndorsementReview() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [decision, setDecision] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [endorsing, setEndorsing] = useState(false);

  useEffect(() => {
    api.get(`legal/decision-for-endorsement/${applicationId}/`)
      .then((res) => setDecision(res.data))
      .catch(() => setError('Could not load the Decision/Order for this application.'));
  }, [applicationId]);

  const handleEndorse = async () => {
    setError('');
    setEndorsing(true);
    try {
      const res = await api.post(`legal/endorse-decision/${applicationId}/`);
      setDecision(res.data);
      setMessage('Decision/Order endorsed. Forwarded to the Office of the Regional Director.');
      setTimeout(() => navigate('/ctdo-endorsement-queue'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not endorse this Decision/Order.');
    } finally {
      setEndorsing(false);
    }
  };

  if (!decision) {
    return (
      <div className="px-6 py-16 text-center text-sm text-gov-gray-500 font-medium">
        {error || 'Loading Decision/Order...'}
      </div>
    );
  }

  const isEndorsed = decision.status && decision.status !== 'pending_ctdo';

  return (
    <div className="w-full">
      <div className="px-5 sm:px-8 lg:px-12 pt-8">
        <Link
          to="/ctdo-endorsement-queue"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gov-gray-200 text-sm font-bold text-navy-800 hover:bg-navy-50 hover:border-gov-blue transition-colors no-underline shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Endorsement Queue
        </Link>
      </div>

      <div className="w-full px-5 sm:px-8 lg:px-12 py-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="font-serif text-3xl font-extrabold text-navy-800">Endorse Decision / Order</h2>
          <p className="text-gov-gray-500 text-sm mt-1 font-medium">
            Review the drafted Decision/Order prepared by the Legal Officer before endorsing to the ORD.
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

      <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl p-6 md:p-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-navy-800 flex items-center justify-center text-white font-serif font-bold text-lg">
              #{applicationId}
            </div>
            <div>
              <h3 className="font-bold text-navy-800 text-lg">{decision.applicant_name}</h3>
              <p className="text-xs text-gov-gray-500 font-medium">
                Case No. {decision.case_number || '—'} · Docket No. {decision.docket_number || '—'}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold self-start md:self-auto ${
            isEndorsed ? 'text-gov-green bg-gov-green-light' : 'text-gov-amber bg-gov-amber-light'
          }`}>
            <ShieldCheck className="w-4 h-4" /> {isEndorsed ? 'Endorsed to ORD' : 'Pending Endorsement'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-2xl p-4 flex items-start gap-3">
            <Building2 className="w-5 h-5 text-navy-800 shrink-0" />
            <div>
              <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest">Decision</p>
              <p className="text-sm font-bold text-navy-800 capitalize">{decision.decision_type.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-2xl p-4 flex items-start gap-3">
            <User className="w-5 h-5 text-navy-800 shrink-0" />
            <div>
              <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest">Drafted By</p>
              <p className="text-sm font-bold text-navy-800">{decision.drafted_by_name || '—'}</p>
            </div>
          </div>
          <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-2xl p-4 flex items-start gap-3">
            <CalendarCheck className="w-5 h-5 text-navy-800 shrink-0" />
            <div>
              <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest">Endorsed</p>
              <p className="text-sm font-bold text-navy-800">
                {decision.ctdo_endorsed_at ? new Date(decision.ctdo_endorsed_at).toLocaleString() : 'Not yet'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-2xl p-5">
          <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Decision / Order Content
          </p>
          <div className="whitespace-pre-wrap text-sm text-navy-800 font-medium leading-relaxed bg-white border border-gov-gray-200 rounded-xl p-4">
            {decision.content || 'No content drafted yet.'}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        {!isEndorsed ? (
          <button
            onClick={handleEndorse}
            disabled={endorsing}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gov-blue text-white text-sm font-bold rounded-xl shadow-md hover:bg-gov-blue-dark transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {endorsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><PenLine className="w-5 h-5" /> Attach E-Signature &amp; Endorse to ORD</>}
          </button>
        ) : (
          <span className="inline-flex items-center gap-2 px-6 py-3 bg-gov-green-light text-gov-green rounded-xl text-sm font-bold">
            <CheckCheck className="w-5 h-5" /> Endorsed · Status: {decision.status.replace(/_/g, ' ')}
          </span>
        )}
      </div>
      <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold text-gov-gray-400">
        <Hash className="w-4 h-4" /> Endorsement forwards the Decision/Order to the Office of the Regional Director for approval.
      </div>
    </div>
    </div>
  );
}

export default CtdoEndorsementReview;
