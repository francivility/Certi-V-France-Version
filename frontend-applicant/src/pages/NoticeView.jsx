import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, CalendarDays, CheckCheck, Loader2, Download } from 'lucide-react';
import api from '../api/axios';

function NoticeView() {
  const { applicationId } = useParams();
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');

  useEffect(() => {
    api.get(`legal/applicant-notice/${applicationId}/`)
      .then(async (res) => {
        setNotice(res.data);
        const file = await api.get(`legal/notice-document/${applicationId}/?format=pdf`, { responseType: 'blob' });
        setDocumentUrl(URL.createObjectURL(file.data));
      })
      .catch((err) => setError(err.response?.data?.error || 'Could not load the Notice of Hearing.'))
      .finally(() => setLoading(false));
  }, [applicationId]);

  const downloadDocument = async (format) => {
    try {
      const res = await api.get(`legal/notice-document/${applicationId}/?format=${format}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Notice_of_Hearing.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not download the Notice of Hearing.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <Link
        to="/my-applications"
        className="inline-flex items-center gap-2 px-4 py-2 mb-5 rounded-md bg-white border border-gray-200 text-sm font-medium text-[#0E2036] hover:border-[#C9A227] hover:text-[#C9A227] transition-colors no-underline"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Applications
      </Link>

      <div className="mb-6">
        <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[#0E2036]">Notice of Hearing</h2>
        <p className="text-gray-500 text-sm mt-1.5">
          Application #{applicationId} — the official notice for your scheduled hearing.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {loading && (
        <div className="py-16 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading notice&hellip;
        </div>
      )}

      {!loading && notice && (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-50 text-green-700 text-xs font-semibold">
              <CheckCheck className="w-4 h-4" /> Served on {new Date(notice.sent_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0E2036]/5 text-[#0E2036] text-xs font-semibold">
              <CalendarDays className="w-4 h-4" />{' '}
              {notice.hearing_date ? new Date(notice.hearing_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
              {notice.hearing_time_label ? ` · ${notice.hearing_time_label}` : ''}
            </span>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {documentUrl ? <iframe title="Official Notice of Hearing" src={documentUrl} className="w-full h-[72vh]" /> : <div className="p-12 text-center text-sm text-gray-500">Loading official document…</div>}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-5">
            <button onClick={() => downloadDocument('docx')} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-[#0E2036] text-[#0E2036] text-sm font-medium rounded-md hover:bg-[#0E2036] hover:text-white transition-colors cursor-pointer">
              <Download className="w-4 h-4" /> Download DOCX
            </button>
            <button onClick={() => downloadDocument('pdf')} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-[#0E2036] text-[#0E2036] text-sm font-medium rounded-md hover:bg-[#0E2036] hover:text-white transition-colors cursor-pointer">
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button
              onClick={() => documentUrl && window.open(documentUrl, '_blank')?.print()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0E2036] text-white text-sm font-medium rounded-md hover:bg-[#1b3857] transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default NoticeView;
