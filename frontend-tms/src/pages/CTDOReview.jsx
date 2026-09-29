import { useEffect, useState, useCallback, Fragment } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, FileText, FileImage, ShieldCheck,
  CheckCircle2, XCircle, CircleDashed, AlertTriangle, CheckCheck, Loader2, ClipboardCheck, RefreshCcw, MessageSquareText, X,
} from 'lucide-react';
import api from '../api/axios';
import ApplicantDetailCard from '../components/ApplicantDetailCard';

function CTDOReview() {
  const { applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [requirementTypes, setRequirementTypes] = useState([]);
  const [flagging, setFlagging] = useState(null);
  const [unflagging, setUnflagging] = useState(null);
  const [flagTarget, setFlagTarget] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagCustom, setFlagCustom] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [viewRemarks, setViewRemarks] = useState(null);
  const navigate = useNavigate();

  const loadApplication = useCallback(() => {
    api.get(`applications/${applicationId}/detail/`)
      .then((res) => setApplication(res.data))
      .catch(() => setError('Could not load application.'));
  }, [applicationId]);

  useEffect(() => {
    loadApplication();
    api.get('requirement-types/')
      .then((res) => setRequirementTypes(res.data))
      .catch(() => {});
  }, [loadApplication]);

  const getReqName = (id) => {
    const r = requirementTypes.find((t) => t.id === id);
    return r ? r.requirement_name : `Requirement #${id}`;
  };

  const statusLabel = (s) =>
    s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : s;

  const openFlagModal = (documentId) => {
    setFlagTarget(documentId);
    setFlagReason('');
    setFlagCustom('');
    setError('');
  };

  const closeFlagModal = () => {
    setFlagTarget(null);
  };

  const confirmFlag = async () => {
    const reason =
      flagReason === 'Others' ? (flagCustom.trim() || null) : (flagReason || null);
    if (!reason) {
      setError('Please select a reason or enter a custom note for the applicant.');
      return;
    }
    setFlagging(flagTarget);
    setError('');
    try {
      await api.post(`applications/flag-document/${flagTarget}/`, { remarks: reason });
      setFlagTarget(null);
      loadApplication();
    } catch {
      setError('Could not flag document.');
    } finally {
      setFlagging(null);
    }
  };

  const dismissFlag = async (documentId) => {
    setUnflagging(documentId);
    setError('');
    try {
      await api.post(`applications/unflag-document/${documentId}/`);
      loadApplication();
    } catch {
      setError('Could not dismiss flag.');
    } finally {
      setUnflagging(null);
    }
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    setError('');
    try {
      const res = await api.post(`applications/${applicationId}/ctdo-decision/`);
      setMessage(res.data.message);
      setTimeout(() => navigate('/ctdo'), 1500);
    } catch {
      setError('Could not finalize decision.');
      setFinalizing(false);
    }
  };

  if (!application) {
    return (
      <div className="px-6 py-16 text-center text-sm text-gov-gray-500">
        {error || 'Loading application...'}
      </div>
    );
  }

  const docs = application.documents || [];
  const canEdit = application.status === 'pending_ctdo';
  const hasFlagged = docs.some((d) => d.ocr_status === 'rejected');
  const flaggedCount = docs.filter((d) => d.ocr_status === 'rejected').length;
  const reFlow = docs.some((d) => d.is_resubmitted);
  const canFlag = (doc) => canEdit && (reFlow ? doc.is_resubmitted : true);

  return (
    <div className="w-full">
      <div className="px-5 sm:px-8 lg:px-12 pt-8">
        <Link
          to="/ctdo/queue"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-gov-gray-200 text-sm font-medium text-navy-800 hover:border-gold hover:text-gold transition-colors no-underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Validation Queue
        </Link>
      </div>

      <div className="w-full px-5 sm:px-8 lg:px-12 py-8">
        <div className="mb-6">
          <h2 className="font-serif text-3xl font-semibold text-navy-800">CTDO Validation</h2>
        <p className="text-gov-gray-500 text-sm mt-1">
          {reFlow
            ? 'This document was re-uploaded after correction. Only the re-uploaded document(s) can be re-flagged; the rest were already validated and are shown read-only.'
            : 'Review the documents and the Receiving Officer\'s annotations before finalizing.'}
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-md px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-6 bg-gov-green-light border border-gov-green/30 text-gov-green rounded-md px-4 py-3 text-sm font-medium">
          {message}
        </div>
      )}

      {reFlow && (
        <div className="mb-6 bg-gov-blue-light/50 border border-gov-blue/30 rounded-lg px-4 py-3 flex items-start gap-3">
          <RefreshCcw className="w-5 h-5 text-navy-800 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-gov-blue mb-0.5">Re-validating a corrected document</p>
            <p className="text-xs text-gov-gray-600 leading-relaxed">
              Only the document the applicant re-uploaded is open for re-flagging. All other requirements were already validated and can no longer be flagged.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        <div className="flex flex-col gap-6">
        <div className="bg-white border border-gov-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
              <ClipboardCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-semibold text-navy-800 text-base">Requirement Validation</h3>
              <p className="text-xs text-gov-gray-500">Receiving Officer annotations + CTDO validity check</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-gov-gray-200 bg-gov-gray-50/60">
                  <th className="p-4 text-xs font-semibold text-gov-gray-500">Requirement</th>
                  <th className="p-4 text-xs font-semibold text-gov-gray-500 text-center">Receiving Mark</th>
                  <th className="p-4 text-xs font-semibold text-gov-gray-500 text-center">CTDO Check</th>
                  <th className="p-4 text-xs font-semibold text-gov-gray-500 text-center">Document</th>
                </tr>
              </thead>
              <tbody>
                {docs.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-10 text-center text-sm text-gov-gray-500">
                      No documents uploaded for this application.
                    </td>
                  </tr>
                )}
                {docs.map((doc) => {
                  const st = doc.receiving_review_status;
                  const isFlagged = doc.ocr_status === 'rejected';
                  return (
                    <Fragment key={doc.id}>
                    <tr className="border-b border-gov-gray-100 align-top">
                      <td className="p-4">
                        <h5 className="font-semibold text-navy-800 text-sm">{getReqName(doc.requirement_type)}</h5>
                        {doc.is_resubmitted && (
                          <span className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold text-gov-blue bg-gov-blue-light">
                            <RefreshCcw className="w-3 h-3" /> Re-uploaded
                          </span>
                        )}
                        {doc.flag_remarks && (
                          <p className="mt-1 text-xs font-medium text-gov-red flex items-start gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {doc.flag_remarks}
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-center align-middle">
                        {st === 'good' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-semibold text-gov-green bg-gov-green-light">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Good
                          </span>
                        )}
                        {(!st || st === 'unchecked') && (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-semibold text-gov-gray-500 bg-gov-gray-200">
                            <CircleDashed className="w-3.5 h-3.5" /> Unchecked
                          </span>
                        )}
                        {st === 'not_good' && (
                          <div className="flex flex-col items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gov-amber">
                              <XCircle className="w-3.5 h-3.5" /> Requires Attention
                            </span>
                            {doc.receiving_review_remarks && (
                              <button
                                onClick={() => setViewRemarks(doc)}
                                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md border border-gov-gray-200 bg-white text-gov-gray-600 text-[11px] font-semibold transition-colors cursor-pointer hover:border-gov-amber hover:text-gov-amber"
                              >
                                <MessageSquareText className="w-3.5 h-3.5" /> View Remarks
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center align-middle">
                        {isFlagged ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gov-red">
                              <XCircle className="w-3.5 h-3.5" /> Flagged Invalid
                            </span>
                            {canEdit && (
                              <button
                                onClick={() => dismissFlag(doc.id)}
                                disabled={unflagging === doc.id}
                                className="inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-md border border-gov-gray-300 text-gov-gray-600 text-[11px] font-semibold transition-colors cursor-pointer hover:border-gov-green hover:text-gov-green disabled:opacity-60"
                              >
                                {unflagging === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                                Undo Flag
                              </button>
                            )}
                          </div>
                        ) : canFlag(doc) ? (
                          <button
                            onClick={() => openFlagModal(doc.id)}
                            disabled={flagging === doc.id}
                            className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-md border border-gov-red text-gov-red text-xs font-semibold transition-colors cursor-pointer hover:bg-gov-red hover:text-white disabled:opacity-60"
                          >
                            {flagging === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                            Flag as Invalid
                          </button>
                        ) : reFlow && canEdit ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-semibold text-gov-green bg-gov-green-light">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Already Validated
                          </span>
                        ) : (
                          <span className="text-xs text-gov-gray-400">Validated</span>
                        )}
                      </td>
                      <td className="p-4 text-center align-middle">
                        <a
                          href={`http://127.0.0.1:8000${doc.file}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 h-9 bg-navy-800 text-white border border-navy-800 rounded-md text-xs font-semibold hover:bg-white hover:text-navy-800 transition-colors no-underline"
                        >
                          <FileImage className="w-4 h-4" /> View
                        </a>
                      </td>
                    </tr>
                    {flagTarget === doc.id && (
                      <tr className="bg-gov-gray-50/50">
                        <td colSpan="4" className="px-6 md:px-8 py-4">
                          <p className="text-xs font-semibold text-gov-red mb-2 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4" /> Flag Document as Invalid
                          </p>
                          <div className="relative mb-2">
                            <select
                              value={flagReason}
                              onChange={(e) => { setFlagReason(e.target.value); setError(''); }}
                              className="w-full sm:w-80 appearance-none bg-white border border-gov-gray-300 rounded-md py-3 px-4 pr-10 text-sm font-medium text-navy-800 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold cursor-pointer"
                            >
                              <option value="" disabled>Select a reason...</option>
                              <option value="Wrong Document">Wrong Document</option>
                              <option value="Blurry">Blurry / Unreadable</option>
                              <option value="Invalid Document">Invalid Document</option>
                              <option value="Expired">Expired</option>
                              <option value="Others">Others (type your own note)</option>
                            </select>
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                              <svg className="w-4 h-4 text-gov-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>
                          {flagReason === 'Others' && (
                            <textarea
                              value={flagCustom}
                              onChange={(e) => setFlagCustom(e.target.value)}
                              placeholder="Write the note to send to the applicant..."
                              rows={2}
                              className="w-full mb-2 bg-white border border-gov-gray-300 rounded-md px-4 py-2.5 text-sm text-navy-800 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold"
                            />
                          )}
                          {error && (
                            <div className="mb-2 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-md px-4 py-2.5 text-sm font-medium">
                              {error}
                            </div>
                          )}
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={closeFlagModal}
                              disabled={flagging === doc.id}
                              className="px-5 py-2.5 bg-gov-gray-100 text-gov-gray-600 rounded-md text-xs font-semibold hover:bg-gov-gray-200 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={confirmFlag}
                              disabled={flagging === doc.id}
                              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gov-red text-white rounded-md text-xs font-semibold hover:bg-gov-red/90 transition-colors cursor-pointer disabled:opacity-60"
                            >
                              {flagging === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                              Flag as Invalid
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {!canEdit ? (
            <p className="text-xs text-gov-gray-500 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 shrink-0" /> This application has already been finalized.
            </p>
          ) : hasFlagged ? (
            <p className="text-xs text-gov-red font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {flaggedCount} document(s) flagged. Finalizing will send the application back to the applicant for correction.
            </p>
          ) : (
            <p className="text-xs text-gov-gray-500 font-medium">
              All documents validated. Finalizing forwards this application to the Financial Analyst.
            </p>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleFinalize}
              disabled={!canEdit || finalizing}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-navy-800 text-white text-sm font-semibold rounded-md hover:bg-navy-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {finalizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCheck className="w-5 h-5" /> Finalize Review</>}
            </button>
          </div>
        </div>
        </div>

        <div className="flex flex-col gap-6">
          <ApplicantDetailCard
            application={application}
            statusCls={canEdit ? 'bg-gov-amber-light text-gov-amber' : 'bg-gov-blue-light text-gov-blue'}
            statusText={canEdit ? 'Pending CTDO Validation' : statusLabel(application.status)}
          />
        </div>
      </div>
      <div className="mt-4 inline-flex items-center gap-2 text-[11px] text-gov-gray-400">
        <FileText className="w-4 h-4" /> The applicant will only be asked to re-upload the flagged document(s), with your note.
      </div>
    </div>

      {viewRemarks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setViewRemarks(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-md bg-gov-amber-light flex items-center justify-center text-gov-amber shrink-0">
                  <MessageSquareText className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-semibold text-navy-800 text-base">Receiving Officer Remarks</h3>
                  <p className="text-xs text-gov-gray-500 mt-0.5">{getReqName(viewRemarks.requirement_type)}</p>
                </div>
              </div>
              <button
                onClick={() => setViewRemarks(null)}
                className="text-gov-gray-400 hover:text-navy-800 transition-colors cursor-pointer"
                aria-label="Close remarks"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 bg-gov-gray-50 border border-gov-gray-200 rounded-md px-4 py-3 text-sm text-navy-800 leading-relaxed break-words whitespace-pre-wrap max-h-64 overflow-y-auto">
              &ldquo;{viewRemarks.receiving_review_remarks}&rdquo;
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setViewRemarks(null)}
                className="px-6 py-2.5 bg-navy-800 text-white rounded-md text-xs font-semibold hover:bg-navy-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CTDOReview;