import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, CheckCircle2, FileText, Loader2, QrCode, RefreshCcw,
  Send, ShieldCheck, Smartphone, UploadCloud, X, XCircle,
} from 'lucide-react';
import QRCode from 'qrcode';
import api from '../api/axios';
import { qrBridgeUrl } from '../config';

function SubmitRequirements() {
  const { applicationId } = useParams();
  const [mode, setMode] = useState('loading'); // 'draft' | 'application' | 'error'
  const [requirementTypes, setRequirementTypes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [refId, setRefId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [uploadingId, setUploadingId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReqId, setSelectedReqId] = useState(null);
  const [qrModal, setQrModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [qrReqId, setQrReqId] = useState(null);
  const [qrStatus, setQrStatus] = useState('idle');
  const [qrError, setQrError] = useState('');
  const navigate = useNavigate();

  const loadData = useCallback(() => {
    api.get('requirement-types/').then((res) => setRequirementTypes(res.data));
    if (mode === 'draft') {
      api.get(`applications/drafts/${applicationId}/`).then((res) => {
        setDocuments(res.data.documents || []);
      });
    } else if (mode === 'application') {
      api.get(`applications/${applicationId}/documents/`).then((res) => setDocuments(res.data));
    }
  }, [applicationId, mode]);

  // Resolve whether this id is a draft or an already-submitted application.
  useEffect(() => {
    api.get(`applications/drafts/${applicationId}/`)
      .then((res) => {
        setMode('draft');
        setRefId(`D-${res.data.id}`);
      })
      .catch(() => {
        api.get(`applications/${applicationId}/documents/`)
          .then(() => { setMode('application'); setRefId(`#${applicationId}`); })
          .catch(() => { setMode('error'); setError('Application not found.'); });
      });
  }, [applicationId]);

  useEffect(() => {
    if (mode !== 'draft' && mode !== 'application') return;
    loadData();
  }, [mode, loadData]);

  const getDocFor = (reqId) => documents.find((d) => d.requirement_type === reqId);

  const handleUpload = useCallback(async (requirementTypeId, file) => {
    if (!file) return;
    setError('');
    setUploadingId(requirementTypeId);
    const existingDoc = getDocFor(requirementTypeId);

    const formData = new FormData();
    formData.append('file', file);

    try {
      if (mode === 'draft') {
        formData.append('requirement_type', requirementTypeId);
        await api.post(`applications/drafts/${applicationId}/documents/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (existingDoc) {
        await api.post(`applications/resubmit-document/${existingDoc.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        formData.append('application', applicationId);
        formData.append('requirement_type', requirementTypeId);
        await api.post('applications/upload-document/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      loadData();
    } catch {
      setError('Upload failed.');
    } finally {
      setUploadingId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, documents, mode, loadData]);

  const handleDrop = (reqId, e) => {
    e.preventDefault();
    setDraggingId(null);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleUpload(reqId, file);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let res;
      if (mode === 'draft') {
        res = await api.post(`applications/drafts/${applicationId}/finalize/`);
        setMessage(res.data.message);
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        res = await api.post(`applications/${applicationId}/submit-for-review/`);
        setMessage(res.data.message);
        setTimeout(() => navigate('/dashboard'), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit application.');
      setIsSubmitting(false);
    }
  };

  const anyFlagged = documents.some((d) => d.ocr_status === 'rejected');
  const flaggedCount = documents.filter((d) => d.ocr_status === 'rejected').length;
  const hasResubmitted = documents.some((d) => d.is_resubmitted);
  const reUploadMode = mode === 'application' && (anyFlagged || hasResubmitted);
  const visibleRequirements = reUploadMode
    ? requirementTypes.filter((r) => {
        const doc = getDocFor(r.id);
        return doc && (doc.ocr_status === 'rejected' || doc.is_resubmitted);
      })
    : requirementTypes;
  const allUploaded = requirementTypes.length > 0 && requirementTypes.every((r) => getDocFor(r.id));

  // Keep a valid requirement selected in the right-hand panel as data loads/changes.
  useEffect(() => {
    if (visibleRequirements.length === 0) {
      setSelectedReqId(null);
      return;
    }
    if (!visibleRequirements.some((r) => r.id === selectedReqId)) {
      setSelectedReqId(visibleRequirements[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRequirements.map((r) => r.id).join(','), documents]);

  const selectedReq = visibleRequirements.find((r) => r.id === selectedReqId) || null;

  const handleUploadRef = useRef(handleUpload);
  useEffect(() => { handleUploadRef.current = handleUpload; }, [handleUpload]);

  const openQrBridge = async (reqId) => {
    setQrReqId(reqId);
    setQrError('');
    setQrModal(true);
    setQrStatus('generating');
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const code = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    setQrCode(code);
    try {
      const dataUrl = await QRCode.toDataURL(qrBridgeUrl(code), {
        width: 300,
        margin: 2,
        color: { dark: '#0E2036', light: '#FFFFFF' },
      });
      setQrImage(dataUrl);
      setQrStatus('waiting');
    } catch {
      setQrError('Could not generate the QR code.');
      setQrStatus('error');
    }
  };

  useEffect(() => {
    if (!qrModal || qrStatus !== 'waiting' || !qrCode) return;
    let busy = false;
    const timer = setInterval(async () => {
      if (busy) return;
      try {
        const res = await api.get(`applications/qr-bridge/pending/${qrCode}/`);
        const item = res.data?.[0];
        if (!item) return;
        busy = true;
        setQrStatus('receiving');
        const blobRes = await api.get(`applications/qr-bridge/download/${item.id}/`, { responseType: 'blob' });
        const file = new File([blobRes.data], item.filename || 'capture.jpg', {
          type: item.content_type || 'image/jpeg',
        });
        try {
          await handleUploadRef.current(qrReqId, file);
          await api.delete(`applications/qr-bridge/consume/${item.id}/`);
          setQrStatus('done');
        } catch {
          setQrError('The image could not be attached to the requirement.');
          setQrStatus('error');
        }
      } catch {
        // transient network error; keep polling
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [qrModal, qrStatus, qrCode, qrReqId]);

  if (mode === 'error') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <Link to="/apply" className="inline-flex items-center gap-2 px-4 py-2 mb-4 rounded-md bg-white border border-gray-200 text-sm font-medium text-[#0E2036] hover:border-[#C9A227] hover:text-[#C9A227] transition-colors no-underline">
          <ArrowLeft className="w-4 h-4" /> Back to Apply CPC
        </Link>
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm font-medium">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-8 flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="shrink-0">
        <Link
          to="/apply"
          className="inline-flex items-center gap-2 px-4 py-2 mb-4 rounded-md bg-white border border-gray-200 text-sm font-medium text-[#0E2036] hover:border-[#C9A227] hover:text-[#C9A227] transition-colors no-underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Apply CPC
        </Link>

        <div className="mb-5">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[#0E2036]">
            {mode === 'loading' ? 'Loading…' : reUploadMode ? 'Re-upload Corrected Documents' : 'Submit Requirements'}
          </h2>
          {mode !== 'loading' && (
            <p className="text-gray-500 text-sm mt-1.5">
              {mode === 'draft' ? (
                <>
                  Draft <span className="font-semibold text-[#0E2036]">{refId}</span> &middot; your application is only
                  recorded and numbered once you submit all requirements.
                </>
              ) : reUploadMode ? (
                <>
                  Application <span className="font-semibold text-[#0E2036]">{refId}</span> &middot; only the re-uploaded
                  document(s) are shown here for your reference.
                </>
              ) : (
                <>
                  Application <span className="font-semibold text-[#0E2036]">{refId}</span> &middot; upload all required
                  documents, then submit for review.
                </>
              )}
            </p>
          )}
        </div>

        {message && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-md px-4 py-3 text-sm font-medium">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Notice */}
        {mode !== 'loading' && (
          <div className={`mb-5 ${
            anyFlagged
              ? 'bg-amber-50 border-amber-200'
              : reUploadMode
                ? 'bg-green-50 border-green-200'
                : 'bg-[#0E2036]/[0.04] border-[#0E2036]/15'
          } border rounded-lg p-4 flex items-start gap-3`}>
            {anyFlagged
              ? <RefreshCcw className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              : reUploadMode
                ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                : <ShieldCheck className="w-5 h-5 text-[#0E2036] shrink-0 mt-0.5" />}
            <div>
              <p className={`text-xs font-semibold mb-1 ${
                anyFlagged ? 'text-amber-700' : reUploadMode ? 'text-green-700' : 'text-[#0E2036]'
              }`}>
                {anyFlagged ? 'Re-upload required' : reUploadMode ? 'Corrections uploaded' : mode === 'draft' ? 'Draft — not yet submitted' : 'OCR verification active'}
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                {anyFlagged ? (
                  <>
                    The CTDO flagged {flaggedCount} document{flaggedCount !== 1 ? 's' : ''} as invalid. Only the flagged document(s) are unlocked for re-uploading (see note on the left). Once all are replaced, submit to send the application back through the Receiving Officer and CTDO.
                  </>
                ) : reUploadMode ? (
                  'Your corrected document(s) have been uploaded. Submit to send the application back through the Receiving Officer and CTDO for re-validation.'
                ) : mode === 'draft' ? (
                  'You are building a draft application. Nothing is submitted to the office yet. Upload all required documents, then click "Submit All Requirements" to officially create your application and send it to the Receiving Officer.'
                ) : (
                  'Uploaded documents are verified automatically to confirm the correct document type. Your application will be forwarded to the Receiving Officer once all requirements are uploaded and you click "Submit All Requirements".'
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {mode === 'loading' && (
        <div className="py-16 text-center text-sm text-gray-500">
          Loading requirements&hellip;
        </div>
      )}

      {/* Main two-panel layout */}
      {mode !== 'loading' && (
        <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden flex">

          {/* LEFT: requirements list */}
          <div
            className={`${selectedReqId ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] shrink-0 flex-col border-r border-gray-200 bg-gray-50/60`}
          >
            <div className="px-5 py-4 border-b border-gray-200 shrink-0">
              <h3 className="text-sm font-semibold text-[#0E2036]">Requirements</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {reUploadMode ? 'Flagged documents that need correction.' : 'Select one to upload its document.'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {visibleRequirements.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-gray-500">
                  Loading requirements&hellip;
                </div>
              )}

              {visibleRequirements.map((req) => {
                const doc = getDocFor(req.id);
                const isRejected = doc && doc.ocr_status === 'rejected';
                const isUploadedOk = !!doc && !isRejected;
                const isActive = req.id === selectedReqId;
                return (
                  <button
                    key={req.id}
                    onClick={() => setSelectedReqId(req.id)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors cursor-pointer border-l-2 ${
                      isActive ? 'bg-white border-l-[#C9A227]' : 'border-l-transparent hover:bg-white/70'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                      isRejected
                        ? 'bg-red-50 text-red-600'
                        : isUploadedOk
                          ? 'bg-green-50 text-green-600'
                          : isActive
                            ? 'bg-[#0E2036] text-white'
                            : 'bg-[#0E2036]/5 text-[#0E2036]'
                    }`}>
                      {isRejected ? <XCircle className="w-4.5 h-4.5" /> : isUploadedOk ? <CheckCircle2 className="w-4.5 h-4.5" /> : <FileText className="w-4.5 h-4.5" />}
                    </div>
                    <span className={`flex-1 text-sm leading-snug ${isActive ? 'font-semibold text-[#0E2036]' : 'font-medium text-gray-700'}`}>
                      {req.requirement_name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: upload panel for the selected requirement */}
          <div className={`${selectedReqId ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col overflow-y-auto`}>
            {selectedReq ? (() => {
              const req = selectedReq;
              const doc = getDocFor(req.id);
              const isRejected = doc && doc.ocr_status === 'rejected';
              const isUploadedOk = !!doc && !isRejected;
              const isLocked = mode === 'application' && isUploadedOk;
              const isUploading = uploadingId === req.id;
              const isDragging = draggingId === req.id;

              return (
                <div className="p-6 md:p-10">
                  {/* mobile-only back control */}
                  <button
                    onClick={() => setSelectedReqId(null)}
                    className="md:hidden inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#0E2036] mb-5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> All requirements
                  </button>

                  <div className="flex items-start gap-3 mb-5">
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                      isUploadedOk ? 'bg-green-50 text-green-600' : 'bg-[#0E2036]/5 text-[#0E2036]'
                    }`}>
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif text-xl font-semibold text-[#0E2036] leading-snug">{req.requirement_name}</h3>
                      {req.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{req.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openQrBridge(req.id)}
                      disabled={isLocked}
                      className="inline-flex items-center justify-center gap-1.5 shrink-0 px-3 py-2 rounded-md bg-white border border-gray-300 text-[#0E2036] text-xs font-medium hover:border-[#C9A227] hover:text-[#C9A227] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <QrCode className="w-4 h-4" /> QR Code Bridge
                    </button>
                  </div>

                  {/* Broken-line dropzone — blue on hover, green once a valid document is uploaded */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); if (!isLocked) setDraggingId(req.id); }}
                    onDragLeave={() => setDraggingId(null)}
                    onDrop={(e) => { if (!isLocked) handleDrop(req.id, e); }}
                    onClick={() => { if (!isLocked) document.getElementById(`file-${req.id}`)?.click(); }}
                    className={`rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
                      isLocked ? 'cursor-default' : 'cursor-pointer'
                    } ${
                      isUploadedOk
                        ? 'border-green-400 bg-green-50'
                        : isDragging
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-6 h-6 animate-spin text-[#0E2036] mb-2" />
                        <p className="text-xs font-semibold text-[#0E2036]">Uploading&hellip;</p>
                      </div>
                    ) : isUploadedOk ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle2 className="w-6 h-6 text-green-600 mb-2" />
                        <p className="text-xs font-semibold text-green-700">Document uploaded successfully</p>
                        <p className="text-xs text-gray-500 mt-0.5">{doc?.file?.split('/').pop()}</p>
                        {!isLocked && (
                          <p className="text-[11px] text-gray-400 mt-1">Click or drag a new file to replace</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <UploadCloud className="w-6 h-6 text-[#0E2036] mb-2" />
                        <p className="text-xs font-medium text-[#0E2036]">
                          Drag &amp; drop your file here, or <span className="text-blue-600 underline">browse</span> your device
                        </p>
                        <p className="text-xs text-gray-500 mt-1">For pre-scanned documents (PDF, JPG, PNG)</p>
                      </div>
                    )}
                    <input
                      id={`file-${req.id}`}
                      type="file"
                      className="hidden"
                      onChange={(e) => handleUpload(req.id, e.target.files[0])}
                    />
                  </div>

                  {/* Status / flagged remarks */}
                  {doc && doc.ocr_status === 'rejected' && mode === 'application' && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3 space-y-1.5">
                      <p className="text-[10px] font-semibold text-red-700 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" /> Needs re-upload &middot; invalid as assessed by CTDO
                      </p>
                      <p className="text-xs text-[#0E2036] leading-relaxed">
                        <span className="font-semibold text-red-700">Note from CTDO:</span> {doc.flag_remarks || 'No reason provided. Please replace with a valid document.'}
                      </p>
                    </div>
                  )}
                  {doc && doc.ocr_status === 'verified' && mode === 'application' && (
                    <p className="mt-4 text-xs font-medium text-green-700 flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> OCR type verified
                    </p>
                  )}
                  {doc && doc.ocr_status === 'pending' && mode === 'application' && (
                    <p className="mt-4 text-xs font-medium text-[#0E2036] flex items-center">
                      <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Awaiting OCR verification
                    </p>
                  )}
                  {doc && mode === 'draft' && (
                    <p className="mt-4 text-xs font-medium text-green-700 flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Requirement uploaded (drag a new file to replace)
                    </p>
                  )}
                </div>
              );
            })() : (
              <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center px-10">
                <div className="w-14 h-14 rounded-full bg-[#0E2036]/5 flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-[#0E2036]" />
                </div>
                <h4 className="font-serif text-lg font-semibold text-[#0E2036]">No requirements to show</h4>
                <p className="text-sm text-gray-500 mt-1.5 max-w-xs">
                  Requirements will appear here once they're available.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Code Bridge modal */}
      {qrModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm relative p-6">
            <button
              type="button"
              onClick={() => setQrModal(false)}
              className="absolute right-3 top-3 text-gray-400 hover:text-[#0E2036] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="w-4.5 h-4.5 text-[#0E2036]" />
              <h3 className="font-serif text-lg font-semibold text-[#0E2036]">QR Code Bridge</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              {selectedReq ? `For: ${selectedReq.requirement_name}` : 'Capture a document on your phone.'}
            </p>

            {qrStatus === 'generating' && (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#0E2036]" />
                <p className="text-xs font-medium text-gray-500 mt-3">Generating QR code&hellip;</p>
              </div>
            )}

            {qrStatus === 'waiting' && (
              <div className="flex flex-col items-center">
                <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
                  <img src={qrImage} alt="QR Code Bridge" className="w-56 h-56" />
                </div>
                <p className="text-sm font-semibold text-[#0E2036]">Scan with your phone's camera</p>
                <p className="text-xs text-gray-500 mt-1 text-center leading-relaxed">
                  The camera app will open — capture the document, and it will appear here automatically.
                </p>
                <p className="text-[11px] text-gray-400 mt-3 break-all bg-gray-50 rounded px-2 py-1">
                  {qrBridgeUrl(qrCode)}
                </p>
                <p className="text-[11px] text-amber-700 mt-2 text-center leading-relaxed">
                  Phone must be on the same WiFi as this computer. If the URL is not reachable from your phone,
                  set VITE_QR_BRIDGE_BASE_URL in frontend-applicant/.env to your computer's LAN address, then restart the app.
                </p>
              </div>
            )}

            {qrStatus === 'receiving' && (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#0E2036]" />
                <p className="text-sm font-semibold text-[#0E2036] mt-3">Image received &mdash; uploading&hellip;</p>
              </div>
            )}

            {qrStatus === 'done' && (
              <div className="flex flex-col items-center py-8">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <p className="text-sm font-semibold text-green-700 mt-3">Document uploaded</p>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  It's now attached to this requirement. Close this window or scan again to replace it.
                </p>
              </div>
            )}

            {qrStatus === 'error' && (
              <div className="py-6 text-center">
                <XCircle className="w-8 h-8 text-red-600 mx-auto" />
                <p className="text-sm font-semibold text-red-700 mt-3">{qrError || 'Something went wrong.'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer actions */}
      {mode !== 'loading' && (
        <div className="mt-6 shrink-0 border-t border-gray-200 pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            {anyFlagged ? (
              <>
                <span className="font-semibold text-red-700">{flaggedCount}</span> flagged document{flaggedCount !== 1 ? 's' : ''} still need re-upload
              </>
            ) : reUploadMode ? (
              <>
                Re-uploaded: <span className="font-semibold text-green-700">{documents.filter((d) => d.is_resubmitted).length}</span> document{documents.filter((d) => d.is_resubmitted).length !== 1 ? 's' : ''} corrected
              </>
            ) : (
              <>
                Progress: <span className="font-semibold text-[#0E2036]">{documents.length}</span> / {requirementTypes.length} requirements uploaded
              </>
            )}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {anyFlagged ? (
              <button
                type="button"
                disabled
                title="Re-upload the flagged document(s) first"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-amber-100 text-amber-800 text-sm font-semibold rounded-md opacity-70 cursor-not-allowed"
              >
                <RefreshCcw className="w-4.5 h-4.5" /> Re-upload Flagged Documents First
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!allUploaded || isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#0E2036] text-white text-sm font-semibold rounded-md hover:bg-[#152C48] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <><Send className="w-4.5 h-4.5" /> Submit All Requirements</>}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SubmitRequirements;
