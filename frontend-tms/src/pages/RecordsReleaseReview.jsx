import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, PackageCheck, Send, MapPin, Clock, FileText, Bell,
  CheckCheck, Loader2, BadgeCheck,
} from 'lucide-react';
import api from '../api/axios';
import ApplicantDetailCard from '../components/ApplicantDetailCard';

const OFFICE_HOURS = '8:00 AM to 5:00 PM, Mondays to Fridays';
const OFFICE_LOCATION = 'LTFRB Region V (Bicol) office, Peñaranda St., Legazpi City';

function RecordsReleaseReview() {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [release, setRelease] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get(`applications/${applicationId}/detail/`)
      .then((res) => setApplication(res.data))
      .catch(() => {});
  }, [applicationId]);

  const handleSend = async () => {
    setError('');
    setSending(true);
    try {
      const res = await api.post(`records/release-cpc/${applicationId}/`, {});
      setRelease(res.data);
      setTimeout(() => navigate('/records/release-queue'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send the CPC.');
    } finally {
      setSending(false);
    }
  };

  if (release) {
    return (
      <div className="w-full px-5 sm:px-8 lg:px-12 py-8 max-w-2xl mx-auto">
        <div className="bg-white border border-gov-gray-200 rounded-xl p-8 text-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-navy-800/5 flex items-center justify-center text-navy-800 mx-auto mb-4">
            <BadgeCheck className="w-7 h-7" />
          </div>
          <h2 className="font-serif text-3xl font-semibold text-navy-800 mb-1">CPC Sent to Applicant</h2>
          <p className="text-gov-gray-500 text-sm mb-6">
            The drafted CPC has been sent to {release.applicant_name}. The applicant has been notified with a
            download option for the softcopy and instructions to claim a hardcopy at the LTFRB office.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mb-6">
            <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-md p-4 flex items-start gap-3">
              <PackageCheck className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold text-gov-gray-400">Applicant</p>
                <p className="text-sm font-semibold text-navy-800">{release.applicant_name}</p>
              </div>
            </div>
            <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-md p-4 flex items-start gap-3">
              <PackageCheck className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold text-gov-gray-400">Case No.</p>
                <p className="text-sm font-semibold text-navy-800 font-mono">{release.case_number}</p>
              </div>
            </div>
            <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-md p-4 flex items-start gap-3">
              <PackageCheck className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold text-gov-gray-400">Docket No.</p>
                <p className="text-sm font-semibold text-navy-800 font-mono">{release.docket_number}</p>
              </div>
            </div>
            <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-md p-4 flex items-start gap-3">
              <Clock className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold text-gov-gray-400">LTFRB Office Hours</p>
                <p className="text-sm font-semibold text-navy-800">{release.office_hours || OFFICE_HOURS}</p>
              </div>
            </div>
            <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-md p-4 sm:col-span-2 flex items-start gap-3">
              <MapPin className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold text-gov-gray-400">Hardcopy Pickup Location</p>
                <p className="text-sm font-semibold text-navy-800">{release.office_location || OFFICE_LOCATION}</p>
              </div>
            </div>
            <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-md p-4 sm:col-span-2 flex items-start gap-3">
              <MapPin className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold text-gov-gray-400">Sent</p>
                <p className="text-sm font-semibold text-navy-800">
                  {release.released_by_name} on {new Date(release.released_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <span className="inline-flex items-center gap-2 text-xs font-medium text-gov-green">
            <CheckCheck className="w-4 h-4" /> Redirecting to the release queue...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="px-5 sm:px-8 lg:px-12 pt-8">
        <Link
          to="/records/release-queue"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-gov-gray-200 text-sm font-medium text-navy-800 hover:border-gold hover:text-gold transition-colors no-underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Release Queue
        </Link>
      </div>

      <div className="w-full px-5 sm:px-8 lg:px-12 py-8">
        <div className="mb-6">
          <h2 className="font-serif text-3xl font-semibold text-navy-800">Draft &amp; Send CPC</h2>
        <p className="text-gov-gray-500 text-sm mt-1">
          Application #{applicationId} — draft the approved CPC and send it to the applicant for download and hardcopy pickup.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-md px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        <div className="flex flex-col gap-6">
          {/* Step 1: Draft the CPC */}
          <div className="bg-white border border-gov-gray-200 rounded-xl p-6 md:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-800">1. Draft the CPC</h3>
                <p className="text-xs text-gov-gray-500">
                  The Certificate of Public Convenience for this approved application is prepared here.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gov-gray-50 border border-gov-gray-200 rounded-md px-5 py-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-navy-800 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-gov-gray-400">CPC Document</p>
                  <p className="text-sm font-semibold text-navy-800">
                    {application ? `${application.cpc_type_name || 'CPC'} — Application #${applicationId}` : 'Preparing...'}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-gov-blue bg-gov-blue-light shrink-0 self-start sm:self-auto">
                <CheckCheck className="w-3.5 h-3.5" /> Drafted
              </span>
            </div>
          </div>

          {/* Step 2: Send to applicant + message preview */}
          <div className="bg-white border border-gov-gray-200 rounded-xl p-6 md:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
                <Send className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-800">2. Send to Applicant</h3>
                <p className="text-xs text-gov-gray-500">
                  Sends the softcopy and notifies the applicant with hardcopy pickup instructions.
                </p>
              </div>
            </div>

            <div className="rounded-md border border-gov-gray-200 bg-gov-gray-50 p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-navy-800" />
                <p className="text-xs font-semibold text-navy-800 uppercase tracking-widest">The applicant will be notified</p>
              </div>
              <p className="text-sm text-gov-gray-600 leading-relaxed">
                Your Certificate of Public Convenience (CPC) has been drafted and sent to you. You can download the
                softcopy from your application. Alternatively, you may claim the hardcopy at the{' '}
                <span className="font-semibold text-navy-800">{OFFICE_LOCATION}</span> during office hours{' '}
                (<span className="font-semibold text-navy-800">{OFFICE_HOURS}</span>).
              </p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white border border-gov-gray-200 rounded-md px-4 py-3 flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-gov-gray-400">Pickup Location</p>
                    <p className="text-xs font-semibold text-navy-800">{OFFICE_LOCATION}</p>
                  </div>
                </div>
                <div className="bg-white border border-gov-gray-200 rounded-md px-4 py-3 flex items-start gap-3">
                  <Clock className="w-4 h-4 text-navy-800 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-gov-gray-400">Office Hours</p>
                    <p className="text-xs font-semibold text-navy-800">{OFFICE_HOURS}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-gov-gray-500">
                Once sent, the applicant can download the softcopy and claim a hardcopy at the office.
              </p>
              <button
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-navy-800 text-white text-sm font-medium rounded-md hover:bg-navy-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Send CPC to Applicant</>}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {application ? (
            <ApplicantDetailCard
              application={application}
              statusCls="bg-gov-blue-light text-gov-blue"
              statusText="Ready for Send"
            />
          ) : (
            <div className="bg-white border border-gov-gray-200 rounded-xl p-6">
              <p className="text-sm text-gov-gray-500">Loading application details...</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

export default RecordsReleaseReview;