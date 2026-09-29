import { useEffect, useState, Fragment } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, FileText, FileImage, Loader2,
  AlertCircle, CheckCheck, XCircle, ClipboardCheck, RefreshCcw,
} from 'lucide-react';
import api from '../api/axios';
import ApplicantDetailCard from '../components/ApplicantDetailCard';

function ReceivingReview() {
  const { applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [requirementTypes, setRequirementTypes] = useState([]);
  const [reviews, setReviews] = useState({});
  const [drafts, setDrafts] = useState({});
  const [selected, setSelected] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [forwarding, setForwarding] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`applications/${applicationId}/detail/`)
      .then((res) => {
        setApplication(res.data);
        const init = {};
        const selInit = {};
        (res.data.documents || []).forEach((doc) => {
          const s = doc.receiving_review_status || 'unchecked';
          init[doc.id] = s;
          selInit[doc.id] = s === 'good' ? 'good' : s === 'not_good' ? 'attention' : null;
        });
        setReviews(init);
        setSelected(selInit);
      })
      .catch(() => setError('Could not load application.'));
    api.get('requirement-types/')
      .then((res) => setRequirementTypes(res.data))
      .catch(() => {});
  }, [applicationId]);

  const getReqName = (id) => {
    const r = requirementTypes.find((t) => t.id === id);
    return r ? r.requirement_name : `Requirement #${id}`;
  };

  const saveReview = async (doc, status) => {
    const remarks = (drafts[doc.id] || '').trim();
    if (status === 'not_good' && !remarks) {
      setError(`Please provide a remark for "${getReqName(doc.requirement_type)}" before marking it as Not Good.`);
      return;
    }
    setSavingId(doc.id);
    setError('');
    try {
      await api.post(`applications/review-document/${doc.id}/`, {
        review_status: status,
        remarks: status === 'not_good' ? remarks : '',
      });
      setReviews((prev) => ({ ...prev, [doc.id]: status }));
      setSelected((prev) => ({
        ...prev,
        [doc.id]: status === 'good' ? 'good' : status === 'not_good' ? 'attention' : null,
      }));
      setDrafts((prev) => {
        const next = { ...prev };
        if (status !== 'not_good') next[doc.id] = undefined;
        return next;
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the review.');
    } finally {
      setSavingId(null);
    }
  };

  const toggleGood = (doc) => {
    if (selected[doc.id] === 'good') {
      setSelected((prev) => ({ ...prev, [doc.id]: null }));
      saveReview(doc, 'unchecked');
    } else {
      setSelected((prev) => ({ ...prev, [doc.id]: 'good' }));
      saveReview(doc, 'good');
    }
  };

  const toggleAttention = (doc) => {
    if (selected[doc.id] === 'attention') {
      setSelected((prev) => ({ ...prev, [doc.id]: null }));
      setDrafts((prev) => ({ ...prev, [doc.id]: undefined }));
      saveReview(doc, 'unchecked');
    } else {
      setSelected((prev) => ({ ...prev, [doc.id]: 'attention' }));
      setDrafts((prev) => ({ ...prev, [doc.id]: '' }));
    }
  };

  const handleForward = async () => {
    setForwarding(true);
    try {
      await api.post(`applications/${applicationId}/forward-to-ctdo/`);
      setMessage('Application forwarded to CTDO successfully.');
      setTimeout(() => navigate('/receiving/queue'), 1200);
    } catch {
      setError('Could not forward application.');
      setForwarding(false);
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
  const allPresent = docs.length > 0;
  const reFlow = docs.some((d) => d.is_resubmitted);
  const canEdit = application.status === 'pending_receiving';
  const actionable = docs.filter((d) => (reFlow ? d.is_resubmitted : true));
  const pending = actionable.filter((d) => reviews[d.id] === 'unchecked').length;

  return (
    <div className="w-full">
      <div className="px-5 sm:px-8 lg:px-12 pt-8">
        <Link
          to="/receiving/queue"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-gov-gray-200 text-sm font-medium text-navy-800 hover:border-gold hover:text-gold transition-colors no-underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Receiving Queue
        </Link>
      </div>

      <div className="w-full px-5 sm:px-8 lg:px-12 py-8">
        <div className="mb-6">
          <h2 className="font-serif text-3xl font-semibold text-navy-800">Review Application</h2>
        <p className="text-gov-gray-500 text-sm mt-1">
          {reFlow
            ? 'This application was re-submitted after CTDO corrections. Only the re-uploaded document(s) need to be verified; the rest were already validated by the CTDO.'
            : 'Check off each requirement that is good, or flag it as Requires Attention with a remark for the CTDO.'}
        </p>
      </div>

      {message && (
        <div className="mb-6 bg-gov-green-light border border-gov-green/30 text-gov-green rounded-md px-4 py-3 text-sm font-medium">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-md px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {reFlow && (
        <div className="mb-6 bg-gov-blue-light/50 border border-gov-blue/30 rounded-lg px-4 py-3 flex items-start gap-3">
          <RefreshCcw className="w-5 h-5 text-navy-800 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-gov-blue mb-0.5">Re-uploaded application</p>
            <p className="text-xs text-gov-gray-600 leading-relaxed">
              A previously flagged document was replaced by the applicant. Verify {actionable.length} re-uploaded document{actionable.length !== 1 ? 's' : ''}; all other requirements were already validated by the CTDO.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        <div className="flex flex-col gap-6">
        <div className="bg-white border border-gov-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
                <ClipboardCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-800 text-base">Digital Checklist</h3>
                <p className="text-xs text-gov-gray-500">Check off items that are good — flag the rest for attention</p>
              </div>
            </div>
            <span className="inline-flex px-3 py-1.5 rounded-md text-xs font-semibold text-gov-blue bg-gov-blue-light shrink-0">
              {pending} unchecked
            </span>
          </div>

          {docs.length === 0 ? (
            <div className="py-12 text-center text-sm text-gov-gray-500">
              No documents have been uploaded for this application yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gov-gray-200 bg-gov-gray-50/60">
                    <th className="p-4 text-xs font-semibold text-gov-green text-center w-16">Good</th>
                    <th className="p-4 text-xs font-semibold text-gov-gray-500">Requirement</th>
                    <th className="p-4 text-xs font-semibold text-gov-gray-500 text-center">Document</th>
                    <th className="p-4 text-xs font-semibold text-gov-gray-500 text-center">Requires Attention</th>
                  </tr>
                </thead>
                <tbody>
                    {docs.map((doc) => {
                      const isActionableDoc = reFlow ? doc.is_resubmitted : true;
                      return (
                      <Fragment key={doc.id}>
                      <tr className="border-b border-gov-gray-100 align-top">
                        <td className="p-4 text-center align-middle">
                          {selected[doc.id] === 'attention' ? null : isActionableDoc && (
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={selected[doc.id] === 'good'}
                              onClick={() => toggleGood(doc)}
                              disabled={!canEdit || savingId === doc.id}
                              title={selected[doc.id] === 'good' ? 'Click to unmark' : 'Mark as Good'}
                              className={`w-7 h-7 rounded-md border-[2.5px] flex items-center justify-center transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                selected[doc.id] === 'good'
                                  ? 'bg-gov-green border-gov-green'
                                  : 'bg-white border-navy-800 hover:border-navy-800 hover:bg-navy-50'
                              }`}
                            >
                              {savingId === doc.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-gov-green" />
                              ) : selected[doc.id] === 'good' ? (
                                <CheckCheck className="w-5 h-5 text-white" strokeWidth={3} />
                              ) : null}
                            </button>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800 shrink-0">
                              <FileText className="w-4.5 h-4.5" />
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-semibold text-navy-800 text-sm">{getReqName(doc.requirement_type)}</h5>
                              <p className="text-xs text-gov-gray-500 mt-0.5">
                                OCR: {doc.ocr_status === 'verified' ? 'Verified' : doc.ocr_status === 'rejected' ? 'Flagged Invalid' : 'Pending'}
                              </p>
                              {doc.is_resubmitted && (
                                <span className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold text-gov-blue bg-gov-blue-light">
                                  <RefreshCcw className="w-3 h-3" /> Re-uploaded
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center align-middle">
                          <a
                            href={`http://127.0.0.1:8000${doc.file}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-4 h-9 whitespace-nowrap bg-navy-800 text-white border border-navy-800 rounded-md text-xs font-semibold hover:bg-white hover:text-navy-800 transition-colors no-underline"
                          >
                            <FileImage className="w-4 h-4" /> View Document
                          </a>
                        </td>
                        {!isActionableDoc ? (
                          <td className="p-4 text-center align-middle">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold text-gov-green bg-gov-green-light">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Validated by CTDO
                            </span>
                          </td>
                        ) : (
                        <td className="p-4 text-center align-middle">
                          {reviews[doc.id] === 'not_good' ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-gov-amber">
                                <XCircle className="w-3.5 h-3.5" /> Requires Attention
                              </span>
                              {isActionableDoc && canEdit && (
                                <button
                                  onClick={() => toggleAttention(doc)}
                                  disabled={savingId === doc.id}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-md border border-gov-gray-300 text-gov-gray-600 text-[11px] font-semibold transition-colors cursor-pointer hover:border-gov-red hover:text-gov-red disabled:opacity-60"
                                >
                                  {savingId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                                  Undo
                                </button>
                              )}
                            </div>
                          ) : selected[doc.id] === 'good' ? null : (
                            <button
                              onClick={() => toggleAttention(doc)}
                              disabled={!canEdit || savingId === doc.id}
                              title={selected[doc.id] === 'attention' ? 'Click to unmark' : 'Mark as Requires Attention'}
                              className={`inline-flex items-center justify-center gap-1.5 px-3.5 h-9 whitespace-nowrap rounded-md text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                selected[doc.id] === 'attention'
                                  ? 'bg-gov-amber text-white'
                                  : 'bg-white border border-gov-gray-200 text-gov-gray-600 hover:border-gov-amber hover:text-gov-amber'
                              }`}
                            >
                              {savingId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                              {selected[doc.id] === 'attention' ? 'Attention' : 'Mark'}
                            </button>
                          )}
                        </td>
                        )}
                      </tr>
                      {isActionableDoc && selected[doc.id] === 'attention' && reviews[doc.id] !== 'not_good' && (
                        <tr className="bg-gov-gray-50/50">
                          <td className="p-4" />
                          <td colSpan="3" className="px-4 md:px-6 py-4">
                            <label className="text-xs font-semibold text-gov-gray-500">
                              Remarks for &ldquo;{getReqName(doc.requirement_type)}&rdquo; {reviews[doc.id] === 'not_good' ? '(saved)' : '(required)'}
                            </label>
                            <div className="mt-2 flex flex-col md:flex-row gap-3">
                              <textarea
                                rows="2"
                                value={drafts[doc.id] || ''}
                                onChange={(e) => setDrafts((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                                placeholder="Explain what needs attention so the CTDO can act faster..."
                                className="w-full bg-white border border-gov-gray-300 rounded-md px-4 py-2.5 text-sm text-navy-800 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-colors"
                              />
                              <button
                                onClick={() => saveReview(doc, 'not_good')}
                                disabled={savingId === doc.id}
                                className="inline-flex shrink-0 items-center justify-center gap-2 px-6 py-2.5 bg-gov-amber text-white rounded-md text-xs font-semibold hover:bg-gov-amber/90 transition-colors cursor-pointer disabled:opacity-60"
                              >
                                {savingId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                                Save &amp; Flag
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
          )}
        </div>

        <div className="flex flex-col gap-3">
          {!canEdit ? (
            <p className="text-xs text-gov-red font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" /> This application has already been forwarded to CTDO and can no longer be re-marked or re-sent.
            </p>
          ) : !allPresent ? (
            <p className="text-xs text-gov-amber font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" /> Forward requires at least one uploaded document.
            </p>
          ) : pending > 0 ? (
            <p className="text-xs text-gov-amber font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" /> {reFlow
                ? `Verify the ${actionable.length} re-uploaded document${actionable.length !== 1 ? 's' : ''} before forwarding — ${pending}/${actionable.length}.`
                : `Rate all requirements before forwarding — ${pending}/${actionable.length}.`}
            </p>
          ) : (
            <p className="text-xs text-gov-gray-500 font-medium">
              All requirements rated.
            </p>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleForward}
              disabled={!canEdit || !allPresent || pending > 0 || forwarding}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-navy-800 text-white text-sm font-semibold rounded-md hover:bg-navy-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {forwarding ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCheck className="w-5 h-5" /> Confirm Complete &amp; Forward to CTDO</>}
            </button>
          </div>
        </div>
        </div>

        <div className="flex flex-col gap-6">
          <ApplicantDetailCard application={application} statusCls="bg-gov-amber-light text-gov-amber" />
        </div>
      </div>
    </div>
    </div>
  );
}

export default ReceivingReview;