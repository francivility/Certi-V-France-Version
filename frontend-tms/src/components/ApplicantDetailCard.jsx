function ApplicantDetailCard({ application, statusCls = 'bg-gov-blue-light text-gov-blue', statusText }) {
  const docs = application.documents || [];
  const statusLabel = (s) =>
    s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : s;

  return (
    <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl p-6">
      <div className="flex justify-end mb-4 -mt-1">
        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold ${statusCls}`}>
          {statusText || statusLabel(application.status)}
        </span>
      </div>

      <div className="mb-5">
        <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest">Business Name</p>
        <h3 className="font-serif font-bold text-navy-800 text-xl mt-0.5 break-words">{application.applicant_name}</h3>
        <p className="text-xs font-medium text-gov-gray-500 mt-1">Application No. {application.id}</p>
      </div>

        <div className="space-y-3">
          <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-0.5">Denomination</p>
            <p className="text-sm font-bold text-navy-800">{application.cpc_type_name}</p>
          </div>
          <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-0.5">Case Number</p>
            <p className="text-sm font-bold text-navy-800 font-mono">{application.case_number || '\u2014'}</p>
          </div>
          <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-0.5">Submitted</p>
          <p className="text-sm font-bold text-navy-800">
            {new Date(application.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-sm font-bold text-navy-800">
            {new Date(application.submitted_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
        <div className="bg-gov-gray-50 border border-gov-gray-200 rounded-xl px-3 py-2.5">
          <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-0.5">Documents</p>
          <p className="text-sm font-bold text-navy-800">{docs.length} uploaded</p>
        </div>
      </div>
    </div>
  );
}

export default ApplicantDetailCard;