import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, FileImage, CheckCircle2, XCircle, ClipboardCheck, CircleDashed, Receipt, Banknote,
} from 'lucide-react';
import api from '../api/axios';
import ApplicantDetailCard from '../components/ApplicantDetailCard';
import { STATUS_LABEL } from '../constants';

function ApplicationDetailView({ backPath, backLabel, showPayment }) {
  const { applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [requirementTypes, setRequirementTypes] = useState([]);
  const [soa, setSoa] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`applications/${applicationId}/detail/`)
      .then((res) => setApplication(res.data))
      .catch(() => setError('Could not load application.'));
    api.get('requirement-types/')
      .then((res) => setRequirementTypes(res.data))
      .catch(() => {});
    if (showPayment) {
      api.get(`payments/soa/${applicationId}/`)
        .then((res) => setSoa(res.data))
        .catch(() => {});
      api.get(`payments/receipt/${applicationId}/`)
        .then((res) => setReceipt(res.data))
        .catch(() => {});
    }
  }, [applicationId, showPayment]);

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
  const st = STATUS_LABEL[application.status] || { label: application.status, cls: 'bg-gov-gray-200 text-gov-gray-600' };

  return (
    <div className="w-full">
      <div className="px-4 sm:px-6 lg:px-8 pt-8">
        <Link
          to={backPath}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gov-gray-200 text-sm font-bold text-navy-800 hover:bg-navy-50 hover:border-gov-blue transition-colors no-underline shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to {backLabel}
        </Link>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="font-serif text-3xl font-extrabold text-navy-800">Application Details</h2>
        <p className="text-gov-gray-500 text-sm mt-1 font-medium">
          Read-only view of the application, requirements, and payment history.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_310px] xl:grid-cols-[minmax(0,1fr)_340px] gap-6 mb-6">
        <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl overflow-hidden">
          <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
                <ClipboardCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-bold text-navy-800">Submitted Requirements</h3>
                <p className="text-xs text-gov-gray-500 font-medium">{docs.length} document{docs.length !== 1 ? 's' : ''} uploaded</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gov-gray-200 bg-gov-gray-50/60">
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Requirement</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest text-center">Receiving</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest text-center">CTDO</th>
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
                  const rv = doc.receiving_review_status;
                  const isFlagged = doc.ocr_status === 'rejected';
                  return (
                    <tr key={doc.id} className="border-b border-gov-gray-100 align-top">
                      <td className="p-4">
                        <h5 className="font-bold text-navy-800 text-sm">{getReqName(doc.requirement_type)}</h5>
                        <p className="text-xs text-gov-gray-500 font-medium mt-0.5">
                          OCR: {doc.ocr_status === 'verified' ? 'Verified' : doc.ocr_status === 'rejected' ? 'Flagged' : 'Pending'}
                        </p>
                        {doc.flag_remarks && (
                          <p className="mt-1 text-xs font-semibold text-gov-red">{doc.flag_remarks}</p>
                        )}
                      </td>
                      <td className="p-4 text-center align-middle">
                        {rv === 'good' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-extrabold text-gov-green bg-gov-green-light">
                            <CheckCircle2 className="w-3 h-3" /> Good
                          </span>
                        )}
                        {rv === 'not_good' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-extrabold text-gov-amber bg-gov-amber-light">
                            <XCircle className="w-3 h-3" /> Flagged
                          </span>
                        )}
                        {(!rv || rv === 'unchecked') && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-extrabold text-gov-gray-500 bg-gov-gray-200">
                            <CircleDashed className="w-3 h-3" />
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center align-middle">
                        {isFlagged ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-extrabold text-gov-red bg-gov-red-light">
                            <XCircle className="w-3 h-3" /> Flagged
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-extrabold text-gov-green bg-gov-green-light">
                            <CheckCircle2 className="w-3 h-3" /> Valid
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center align-middle">
                        <a
                          href={`http://127.0.0.1:8000${doc.file}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-navy-800 text-white border border-navy-800 rounded-lg text-[11px] font-bold shadow-sm hover:bg-white hover:text-navy-800 transition-colors no-underline"
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
          <ApplicantDetailCard application={application} statusCls={st.cls} statusText={st.label} />
        </div>
      </div>

      {(showPayment && (soa || receipt)) && (
        <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl overflow-hidden mb-6">
          <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
              <Receipt className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-navy-800">Assessment &amp; Payment Record</h3>
              <p className="text-xs text-gov-gray-500 font-medium">SOA / POS and payment history</p>
            </div>
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {soa && (
              <>
                <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-2xl p-4">
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-1">Control Number</p>
                  <p className="text-sm font-bold text-navy-800">{soa.control_number}</p>
                </div>
                <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-2xl p-4">
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-1">Total Amount</p>
                  <p className="text-sm font-bold text-navy-800">
                    P{parseFloat(soa.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-2xl p-4">
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-1">Expiry Date</p>
                  <p className="text-sm font-bold text-navy-800">{new Date(soa.expiry_date).toLocaleDateString()}</p>
                </div>
                <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-2xl p-4">
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-1">Assessed By</p>
                  <p className="text-sm font-bold text-navy-800">{soa.assessed_by || '\u2014'}</p>
                </div>
              </>
            )}
            {receipt && (
              <>
                <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-2xl p-4">
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-1">OR Number</p>
                  <p className="text-sm font-bold text-navy-800">{receipt.or_number || '\u2014'}</p>
                </div>
                <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-2xl p-4">
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-1">Payment Method</p>
                  <p className="text-sm font-bold text-navy-800">
                    {receipt.method === 'online' ? 'Online' : receipt.method === 'f2f' ? 'Face-to-Face' : '\u2014'}
                  </p>
                </div>
                <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-2xl p-4">
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-1">Paid At</p>
                  <p className="text-sm font-bold text-navy-800">
                    {receipt.paid_at ? new Date(receipt.paid_at).toLocaleString() : '\u2014'}
                  </p>
                </div>
                <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-2xl p-4">
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-1">Docket Number</p>
                  <p className="text-sm font-bold text-navy-800">{receipt.docket_number || '\u2014'}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-gov-gray-400">
        <Banknote className="w-4 h-4" /> This is a historical record. Workflows resume in the respective live queue.
      </div>
    </div>
    </div>
  );
}

export default ApplicationDetailView;
