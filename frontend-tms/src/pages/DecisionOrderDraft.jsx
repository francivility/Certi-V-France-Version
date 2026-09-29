import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, FileText, Hash, Save, SendHorizonal,
  CheckCheck, Scale, User,
} from 'lucide-react';
import api from '../api/axios';
import ApplicantDetailCard from '../components/ApplicantDetailCard';

function DecisionOrderDraft() {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [decision, setDecision] = useState(null);
  const [decisionType, setDecisionType] = useState('approved');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get(`legal/decision/${applicationId}/`)
      .then((res) => {
        setDecision(res.data);
        if (res.data.decision_type) setDecisionType(res.data.decision_type);
        setContent(res.data.content || '');
      })
      .catch(() => setError('Could not load decision details.'));
  }, [applicationId]);

  const isForwarded = decision?.status && decision.status !== 'draft';

  const handleSaveDraft = async () => {
    setError('');
    try {
      const res = await api.post(`legal/draft-decision/${applicationId}/`, {
        decision_type: decisionType,
        content,
      });
      setDecision(res.data);
      setMessage(`Draft saved. Case Number assigned: ${res.data.case_number}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save draft.');
    }
  };

  const handleForward = async () => {
    setError('');
    try {
      const res = await api.post(`legal/forward-to-ctdo/${applicationId}/`);
      setDecision(res.data);
      setMessage('Decision/Order forwarded to CTDO for endorsement.');
      setTimeout(() => navigate('/decision-queue'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not forward to CTDO.');
    }
  };

  if (!decision) {
    return (
      <div className="px-6 py-16 text-center text-sm text-gov-gray-500 font-medium">
        {error || 'Loading Decision/Order...'}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="px-5 sm:px-8 lg:px-12 pt-8">
        <Link
          to="/decision-queue"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gov-gray-200 text-sm font-bold text-navy-800 hover:bg-navy-50 hover:border-gov-blue transition-colors no-underline shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Decision Queue
        </Link>
      </div>

      <div className="w-full px-5 sm:px-8 lg:px-12 py-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="font-serif text-3xl font-extrabold text-navy-800">Draft Decision / Order</h2>
        <p className="text-gov-gray-500 text-sm mt-1 font-medium">
          Prepare the Decision/Order content after the hearing. Save drafts or forward to CTDO for endorsement.
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
        <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl p-6 md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800">Decision Content</h3>
              <p className="text-xs text-gov-gray-500 font-medium">Type the decision type and the body of the order</p>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-2">
              Decision Type
            </label>
            <div className="relative">
              <select
                value={decisionType}
                disabled={isForwarded}
                onChange={(e) => setDecisionType(e.target.value)}
                className="w-full sm:w-64 appearance-none bg-gov-gray-50 border border-gov-gray-300 rounded-xl py-3 px-4 pr-10 text-sm font-bold text-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                <option value="approved">Approved</option>
                <option value="not_approved">Not Approved</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gov-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Decision / Order Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isForwarded}
              rows={16}
              placeholder="Draft the Decision/Order content here..."
              className="w-full bg-gov-gray-50 border border-gov-gray-300 rounded-xl p-4 text-sm font-medium text-navy-800 font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed placeholder:text-gov-gray-400"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3">
          {!isForwarded ? (
            <>
              <button
                onClick={handleSaveDraft}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-navy-800 text-navy-800 rounded-xl text-xs font-bold hover:bg-navy-800 hover:text-white transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Draft
              </button>
              <button
                onClick={handleForward}
                disabled={!decision.case_number}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gov-blue text-white text-xs font-bold rounded-xl shadow-md hover:bg-gov-blue-dark transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SendHorizonal className="w-4 h-4" /> Forward to CTDO
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-2 px-6 py-3 bg-gov-green-light text-gov-green rounded-xl text-sm font-bold">
              <CheckCheck className="w-5 h-5" /> Forwarded · Status: {decision.status.replace(/_/g, ' ')}
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
            {isForwarded && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold text-gov-green bg-gov-green-light mb-5">
                <CheckCheck className="w-4 h-4" /> {decision.status.replace(/_/g, ' ')}
              </span>
            )}

            <div className="space-y-3">
              <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-xl px-3 py-2.5 flex items-start gap-3">
                <Building2 className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest">Applicant</p>
                  <p className="text-sm font-bold text-navy-800 break-words">{decision.applicant_name}</p>
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
                <Scale className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest">Case No.</p>
                  <p className="text-sm font-bold text-navy-800 font-mono break-all">{decision.case_number || 'Assigned on save'}</p>
                </div>
              </div>
              <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-xl px-3 py-2.5 flex items-start gap-3">
                <User className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest">Hearing Date</p>
                  <p className="text-sm font-bold text-navy-800">
                    {decision.hearing_date ? new Date(decision.hearing_date).toLocaleDateString() : '\u2014'}
                    {decision.hearing_time ? ` · ${decision.hearing_time}` : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold text-gov-gray-400">
        <Hash className="w-4 h-4" /> A case number is automatically assigned when you first save the draft.
      </div>
    </div>
    </div>
  );
}

export default DecisionOrderDraft;
