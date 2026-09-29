import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Download, FileText, MapPin, Clock, CheckCircle2, Loader2, BadgeCheck,
} from 'lucide-react';
import api from '../api/axios';

function CPCRelease() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get(`records/my-cpc/${applicationId}/`)
      .then((res) => setRelease(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not load your CPC.'))
      .finally(() => setLoading(false));
  }, [applicationId]);

  const handleDownload = async () => {
    // The generated CPC softcopy is not yet wired to a file endpoint.
    // This is the design placeholder for the GenMonth document generation feature.
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      navigate(`/apply/${applicationId}/documents`);
    }, 1500);
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
        <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[#0E2036]">View &amp; Claim CPC</h2>
        <p className="text-gray-500 text-sm mt-1.5">
          Your approved Certificate of Public Convenience (CPC) for Application #{applicationId}.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}
      {loading && (
        <div className="py-16 text-center text-sm text-gray-500">Loading your CPC&hellip;</div>
      )}

      {!loading && !error && release && (
        <div className="space-y-6">
          {/* Ready banner */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
              <BadgeCheck className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-xl font-semibold text-[#0E2036]">Your CPC is ready</h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                The Records Officer has sent your CPC. Download the softcopy below, or claim a hardcopy at the
                LTFRB Region V office during office hours.
              </p>
            </div>
          </div>

          {/* Download softcopy */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-5 h-5 text-[#0E2036]" />
              <h3 className="font-serif text-lg font-semibold text-[#0E2036]">Download Soft Copy</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Get the digital copy of your Certificate of Public Convenience. Click the button below to download the file.
            </p>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#0E2036] text-white text-sm font-semibold rounded-md hover:bg-[#152C48] transition-colors cursor-pointer disabled:opacity-70"
            >
              {downloading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <><Download className="w-4.5 h-4.5" /> Click here to download</>}
            </button>
          </div>

          {/* Claim hardcopy */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-[#0E2036]" />
              <h3 className="font-serif text-lg font-semibold text-[#0E2036]">Claim a Hard Copy</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-5">
              You may also claim the physical (hardcopy) of your CPC in person at the LTFRB Region V office.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#0E2036] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Office Location</p>
                  <p className="text-sm font-semibold text-[#0E2036] mt-0.5">
                    {release.office_location || 'LTFRB Region V (Bicol) office, Peñaranda St., Legazpi City'}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#0E2036] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Office Hours</p>
                  <p className="text-sm font-semibold text-[#0E2036] mt-0.5">
                    {release.office_hours || '8:00 AM to 5:00 PM, Mondays to Fridays'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Release summary */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-[#0E2036]" />
              <h3 className="font-serif text-lg font-semibold text-[#0E2036]">Application Summary</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#0E2036] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Applicant</p>
                  <p className="text-sm font-semibold text-[#0E2036] mt-0.5">{release.applicant_name}</p>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 flex items-start gap-3">
                <FileText className="w-4 h-4 text-[#0E2036] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Case Number</p>
                  <p className="text-sm font-semibold text-[#0E2036] font-mono mt-0.5">{release.case_number || '—'}</p>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 flex items-start gap-3">
                <FileText className="w-4 h-4 text-[#0E2036] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Docket Number</p>
                  <p className="text-sm font-semibold text-[#0E2036] font-mono mt-0.5">{release.docket_number || '—'}</p>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#0E2036] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sent</p>
                  <p className="text-sm font-semibold text-[#0E2036] mt-0.5">
                    {release.released_by_name} on {release.released_at ? new Date(release.released_at).toLocaleString() : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CPCRelease;