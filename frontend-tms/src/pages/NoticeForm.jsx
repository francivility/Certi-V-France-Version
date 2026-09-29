import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, CheckCheck, ClipboardList, Download, FileText,
  Loader2, PencilLine, Printer, SendHorizonal, Stamp, User,
} from 'lucide-react';
import api from '../api/axios';

const FIELD_LABELS = {
  applicant_name: { label: 'Name of Applicant', letter: 'a' },
  applicant_address: { label: 'Address of Applicant', letter: 'b' },
  applicant_email: { label: 'Email Address of Applicant', letter: 'c' },
  case_or_docket_number: { label: 'Case / Docket Number', letter: 'd' },
  date_of_filing: { label: 'Date of Filing', letter: 'e' },
  nature_of_application: { label: 'Nature of the Application', letter: 'f' },
  route_or_area: { label: 'Route or Area of Operations', letter: 'g' },
  service_applied_for: { label: 'Service Applied For', letter: 'h' },
  units_applied_for: { label: 'Number of Unit/s Applied For', letter: 'i' },
  hearing_date: { label: 'Date of Hearing', letter: 'j' },
  hearing_time_label: { label: 'Time of Hearing', letter: 'k' },
  venue_or_platform: { label: 'Venue / Virtual Platform', letter: 'l' },
  opposition_period: { label: 'Period within which Oppositions may be Filed', letter: 'm' },
  opposition_address: { label: 'Address (Physical and Electronic) where Oppositions may be Filed', letter: 'n' },
  foe_period: { label: 'Period within which to Submit Formal Offer of Evidence (FOE)', letter: 'o' },
  foe_address: { label: 'Address where the FOE may be Filed / Submitted', letter: 'p' },
  hearing_officer: { label: 'Hearing Officer', letter: 'q' },
};

function Field({ letter, label, type = 'text', value, onChange, span = '' }) {
  return (
    <div className={span}>
      <label className="flex items-center gap-2 text-sm font-bold text-navy-800 mb-2">
        <span className="w-6 h-6 rounded-lg bg-navy-800/10 text-navy-800 border border-navy-800/15 inline-flex items-center justify-center text-xs font-black shrink-0">
          {letter}
        </span>
        {label}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${label}`}
        className="w-full bg-gov-gray-50 border border-gov-gray-300 rounded-xl py-3 px-4 text-sm font-bold text-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent placeholder:text-gov-gray-400 placeholder:font-medium"
      />
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="bg-white border border-gov-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 sm:px-6 py-4 bg-gov-gray-50/80 border-b border-gov-gray-200 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-navy-800 text-white flex items-center justify-center shrink-0">
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-navy-800">{title}</h3>
          <p className="text-[11px] text-gov-gray-500 font-medium">{subtitle}</p>
        </div>
      </div>
      <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">{children}</div>
    </section>
  );
}

function NoticeForm() {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [documentUrl, setDocumentUrl] = useState('');
  const [fields, setFields] = useState({});

  useEffect(() => {
    api.get(`legal/notice/${applicationId}/`)
      .then((res) => {
        setNotice(res.data);
        setFields({
          applicant_name: res.data.applicant_name || '',
          applicant_address: res.data.applicant_address || '',
          applicant_email: res.data.applicant_email || '',
          case_or_docket_number: res.data.case_or_docket_number || res.data.docket_number || '',
          date_of_filing: res.data.date_of_filing || '',
          nature_of_application: res.data.nature_of_application || '',
          route_or_area: res.data.route_or_area || '',
          service_applied_for: res.data.service_applied_for || '',
          units_applied_for: res.data.units_applied_for || '',
          hearing_date: res.data.hearing_date || '',
          hearing_time_label: res.data.hearing_time_label || '',
          venue_or_platform: res.data.venue_or_platform || '',
          opposition_period: res.data.opposition_period || '',
          opposition_address: res.data.opposition_address || '',
          foe_period: res.data.foe_period || '',
          foe_address: res.data.foe_address || '',
          hearing_officer: res.data.hearing_officer || '',
        });
        if (res.data.notice_sent) {
          api.get(`legal/notice-document/${applicationId}/?format=pdf`, { responseType: 'blob' })
            .then((file) => setDocumentUrl(URL.createObjectURL(file.data)))
            .catch(() => setError('Could not load the sent Notice of Hearing document.'));
        }
      })
      .catch((err) => setError(err.response?.data?.error || 'Could not load notice details.'))
      .finally(() => setLoading(false));
  }, [applicationId]);

  const fetchDocument = async (format = 'pdf', download = false) => {
    const res = await api.get(`legal/notice-document/${applicationId}/?format=${format}`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    if (download) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `Notice_of_Hearing.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      setDocumentUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
    }
  };

  const handleGenerate = async () => {
    setError('');
    setGenerating(true);
    try {
      const res = await api.post(`legal/preview-notice/${applicationId}/`, fields, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      setDocumentUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
      setPreview(true);
    } catch (err) {
      const data = err.response?.data;
      if (data instanceof Blob) {
        try {
          const text = JSON.parse(await data.text());
          if (text?.error) return setError(text.error);
        } catch { /* not a JSON error payload */ }
      }
      setError(err.response?.data?.error || 'Could not generate the Notice of Hearing preview.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    setError('');
    setMessage('');
    setSending(true);
    try {
      const res = await api.post(`legal/send-notice/${applicationId}/`, {
        ...fields,
      });
      setNotice(res.data);
      await fetchDocument();
      setMessage('Notice of Hearing successfully sent to the applicant.');
      setTimeout(() => navigate('/legal/queue'), 1800);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send the notice.');
    } finally {
      setSending(false);
    }
  };

  const setField = (key, value) => setFields((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="px-6 py-16 text-center text-sm text-gov-gray-500 font-medium">
        Loading notice details...
      </div>
    );
  }

  const sent = !!notice?.notice_sent;
  const totalFields = Object.keys(FIELD_LABELS).length;
  const filledCount = Object.values(fields).filter((v) => String(v || '').trim()).length;

  return (
    <div className="w-full">
      <div className="px-4 sm:px-6 lg:px-8 pt-8">
        <Link
          to={sent ? '/decision-queue' : `/legal/${applicationId}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gov-gray-200 text-sm font-bold text-navy-800 hover:border-gold hover:text-gold transition-colors no-underline"
        >
          <ArrowLeft className="w-4 h-4" /> {sent ? 'Back to Decision Queue' : 'Back to Hearing Schedule'}
        </Link>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl font-extrabold text-navy-800">Notice of Hearing</h2>
            <p className="text-gov-gray-500 text-sm mt-1 font-medium">
              Application #{applicationId} — complete the notice form, generate the official file, then send it to the applicant.
            </p>
          </div>
          {sent && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gov-green bg-gov-green-light">
              <CheckCheck className="w-4 h-4" /> Sent on {new Date(notice.sent_at).toLocaleString()}
            </span>
          )}
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

        {sent && !preview ? (
          <>
            <div className="bg-white border border-gov-gray-200 rounded-3xl shadow-sm p-2">
              <div className="bg-white rounded-2xl border border-gov-gray-200 overflow-hidden">
                {documentUrl ? <iframe title="Sent Notice of Hearing" src={documentUrl} className="w-full h-[72vh]" /> : <div className="p-10 text-sm text-gov-gray-500">Loading official document…</div>}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-3 pt-4">
              <button onClick={() => fetchDocument('docx', true)} className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-navy-800 text-navy-800 text-sm font-bold rounded-xl hover:bg-navy-800 hover:text-white transition-colors cursor-pointer">
                <Download className="w-4 h-4" /> Download DOCX
              </button>
              <button onClick={() => fetchDocument('pdf', true)} className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-navy-800 text-navy-800 text-sm font-bold rounded-xl hover:bg-navy-800 hover:text-white transition-colors cursor-pointer">
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <button
                onClick={() => documentUrl && window.open(documentUrl, '_blank')?.print()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-navy-800 text-white text-sm font-bold rounded-xl hover:bg-navy-700 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          </>
        ) : preview ? (
          <>
            <div className="bg-white border border-gov-gray-200 rounded-3xl shadow-sm p-2">
              <div className="bg-white rounded-2xl border border-gov-gray-200 overflow-hidden">
                {documentUrl && <iframe title="Notice of Hearing preview" src={documentUrl} className="w-full h-[72vh]" />}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-3 pt-4">
              <button
                onClick={() => { setPreview(false); setDocumentUrl((old) => { if (old) URL.revokeObjectURL(old); return ''; }); }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-navy-800 text-navy-800 rounded-xl text-sm font-bold hover:bg-navy-800 hover:text-white transition-colors cursor-pointer"
              >
                <PencilLine className="w-4 h-4" /> Edit Details
              </button>
              <button
                onClick={() => documentUrl && window.open(documentUrl, '_blank')?.print()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-navy-800 text-navy-800 rounded-xl text-sm font-bold hover:bg-navy-800 hover:text-white transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !documentUrl}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-navy-800 text-white text-sm font-bold rounded-xl shadow-md hover:bg-navy-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><SendHorizonal className="w-4 h-4" /> Send to Applicant</>}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Completeness indicator */}
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gov-blue-light text-gov-blue text-sm font-extrabold">
              <CheckCheck className="w-5 h-5" /> {filledCount} of {totalFields} details filled
            </div>

            <div className="space-y-6">
              {/* Applicant */}
              <Section icon={User} title="Applicant Details" subtitle="Party filing the certificate of public convenience application">
                <Field letter="a" label={FIELD_LABELS.applicant_name.label} value={fields.applicant_name} onChange={(v) => setField('applicant_name', v)} />
                <Field letter="c" label={FIELD_LABELS.applicant_email.label} value={fields.applicant_email} onChange={(v) => setField('applicant_email', v)} />
                <Field letter="b" label={FIELD_LABELS.applicant_address.label} value={fields.applicant_address} onChange={(v) => setField('applicant_address', v)} span="md:col-span-2" />
              </Section>

              {/* Application */}
              <Section icon={ClipboardList} title="Application Information" subtitle="Details of the pending application as submitted">
                <Field letter="d" label={FIELD_LABELS.case_or_docket_number.label} value={fields.case_or_docket_number} onChange={(v) => setField('case_or_docket_number', v)} />
                <Field letter="e" label={FIELD_LABELS.date_of_filing.label} type="date" value={fields.date_of_filing} onChange={(v) => setField('date_of_filing', v)} />
                <Field letter="f" label={FIELD_LABELS.nature_of_application.label} value={fields.nature_of_application} onChange={(v) => setField('nature_of_application', v)} span="md:col-span-2" />
                <Field letter="g" label={FIELD_LABELS.route_or_area.label} value={fields.route_or_area} onChange={(v) => setField('route_or_area', v)} span="md:col-span-2" />
                <Field letter="h" label={FIELD_LABELS.service_applied_for.label} value={fields.service_applied_for} onChange={(v) => setField('service_applied_for', v)} />
                <Field letter="i" label={FIELD_LABELS.units_applied_for.label} value={fields.units_applied_for} onChange={(v) => setField('units_applied_for', v)} />
              </Section>

              {/* Hearing */}
              <Section icon={CalendarDays} title="Hearing Schedule" subtitle="Presiding officer, date, time, and venue of the hearing">
                <Field letter="j" label={FIELD_LABELS.hearing_date.label} type="date" value={fields.hearing_date} onChange={(v) => setField('hearing_date', v)} />
                <Field letter="k" label={FIELD_LABELS.hearing_time_label.label} value={fields.hearing_time_label} onChange={(v) => setField('hearing_time_label', v)} />
                <Field letter="l" label={FIELD_LABELS.venue_or_platform.label} value={fields.venue_or_platform} onChange={(v) => setField('venue_or_platform', v)} span="md:col-span-2" />
                <Field letter="q" label={FIELD_LABELS.hearing_officer.label} value={fields.hearing_officer} onChange={(v) => setField('hearing_officer', v)} span="md:col-span-2" />
              </Section>

              {/* Opposition & FOE */}
              <Section icon={Stamp} title="Opposition & Evidence" subtitle="Where and when oppositions and the Formal Offer of Evidence may be filed">
                <Field letter="m" label={FIELD_LABELS.opposition_period.label} value={fields.opposition_period} onChange={(v) => setField('opposition_period', v)} />
                <Field letter="o" label={FIELD_LABELS.foe_period.label} value={fields.foe_period} onChange={(v) => setField('foe_period', v)} />
                <Field letter="n" label={FIELD_LABELS.opposition_address.label} value={fields.opposition_address} onChange={(v) => setField('opposition_address', v)} span="md:col-span-2" />
                <Field letter="p" label={FIELD_LABELS.foe_address.label} value={fields.foe_address} onChange={(v) => setField('foe_address', v)} span="md:col-span-2" />
              </Section>
            </div>

            <div className="pt-6 mt-8 border-t border-gov-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs text-gov-gray-500 font-medium">
                Fields are lettered to match the official LTFRB Notice of Hearing form.
              </p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-navy-800 text-white text-sm font-bold rounded-xl shadow-md hover:bg-navy-700 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Generate Notice of Hearing File
              </button>
            </div>
          </>
        )}

        {sent && preview && (
          <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold text-gov-gray-400">
            <CheckCheck className="w-4 h-4" /> This notice was already sent. Changes here are not saved.
          </div>
        )}
      </div>
    </div>
  );
}

export default NoticeForm;