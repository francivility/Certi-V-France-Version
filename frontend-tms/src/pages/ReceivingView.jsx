import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, FileText, FileImage, CheckCircle2, XCircle, ClipboardCheck, CircleDashed,
} from 'lucide-react';
import api from '../api/axios';
import ApplicantDetailCard from '../components/ApplicantDetailCard';

function ReceivingView() {
  const { applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [requirementTypes, setRequirementTypes] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`applications/${applicationId}/detail/`)
      .then((res) => setApplication(res.data))
      .catch(() => setError('Could not load application.'));
    api.get('requirement-types/')
      .then((res) => setRequirementTypes(res.data))
      .catch(() => {});
  }, [applicationId]);

  const getReqName = (id) => {
    const r = requirementTypes.find((t) => t.id === id);
    return r ? r.requirement_name : `Requirement #${id}`;
  };

  if (!application) {
    return (
      <div className="px-6 py-16 text-center text-sm text-gov-gray-500 font-medium">
        {error || 'Loading application...'}
      </div>
    );
  }

  const docs = application.documents || [];
  const notHidden =
    application.status !== 'pending_upload' && application.status !== 'pending_receiving';

  return (
    <div className="w-full">
      <div className="px-4 sm:px-6 lg:px-8 pt-8">
        <Link
          to="/receiving/applications"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gov-gray-200 text-sm font-bold text-navy-800 hover:bg-navy-50 hover:border-gov-blue transition-colors no-underline shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Application History
        </Link>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="font-serif text-3xl font-extrabold text-navy-800">Application Details</h2>
        <p className="text-gov-gray-500 text-sm mt-1 font-medium">
          Read-only view of the information and requirements sent by the applicant.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl overflow-hidden">
          <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
                <ClipboardCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-bold text-navy-800">Submitted Requirements</h3>
                <p className="text-xs text-gov-gray-500 font-medium">{docs.length} document{docs.length !== 1 ? 's' : ''} sent by the applicant</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gov-gray-200 bg-gov-gray-50/60">
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Requirement</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest text-center">Receiving Mark</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest text-center">Remarks</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest text-center">Doc</th>
                </tr>
              </thead>
              <tbody>
                {docs.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-10 text-center text-sm text-gov-gray-500 font-medium">
                      No documents uploaded for this application.
                    </td>
                  </tr>
                )}
                {docs.map((doc) => {
                  const st = doc.receiving_review_status;
                  return (
                    <tr key={doc.id} className="border-b border-gov-gray-100 align-top">
                      <td className="p-4">
                        <h5 className="font-bold text-navy-800 text-sm">{getReqName(doc.requirement_type)}</h5>
                        <p className="text-xs text-gov-gray-500 font-medium mt-0.5">
                          OCR: {doc.ocr_status === 'verified' ? 'Verified' : doc.ocr_status === 'rejected' ? 'Flagged Invalid' : 'Pending'}
                        </p>
                      </td>
                      <td className="p-4 text-center align-middle">
                        {st === 'good' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-extrabold text-gov-green bg-gov-green-light">
                            <CheckCircle2 className="w-3 h-3" /> Good
                          </span>
                        )}
                        {st === 'not_good' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-extrabold text-gov-amber bg-gov-amber-light">
                            <XCircle className="w-3 h-3" /> Requires Attention
                          </span>
                        )}
                        {(!st || st === 'unchecked') && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-extrabold text-gov-gray-500 bg-gov-gray-200">
                            <CircleDashed className="w-3 h-3" />
                          </span>
                        )}
                      </td>
                      <td className="p-4 align-middle text-xs font-medium text-gov-gray-600">
                        {doc.receiving_review_remarks || <span className="text-gov-gray-400">—</span>}
                      </td>
                      <td className="p-4 text-center align-middle">
                        <a
                          href={`http://127.0.0.1:8000${doc.file}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-navy-800 text-white border border-navy-800 rounded-lg text-[10px] font-bold shadow-sm hover:bg-white hover:text-navy-800 transition-colors no-underline"
                        >
                          <FileImage className="w-3 h-3" /> View
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <ApplicantDetailCard application={application} />

          {!notHidden && (
            <Link
              to={`/receiving/${application.id}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gov-blue text-white text-sm font-bold rounded-xl shadow-md hover:bg-gov-blue-dark transition-colors no-underline"
            >
              <FileText className="w-4 h-4" /> Go to Review &amp; Mark
            </Link>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

export default ReceivingView;
