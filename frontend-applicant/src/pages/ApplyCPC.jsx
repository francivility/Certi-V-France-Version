import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Download, FileEdit, FileText,
  Loader2, Images, Landmark, ShieldCheck, ChevronRight,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '../api/axios';
import { cpcImageFor } from '../config/cpcTypes';

const ALL_ACTIONS = {
  sample: { label: 'View Sample Document', icon: Images },
  download: { label: 'Download Form', icon: Download },
  edit: { label: 'Edit Form', icon: FileEdit },
};

const BASIC_REQUIREMENTS = [
  { id: 'petition', name: 'Notarized Petition', actions: ['sample', 'download', 'edit'] },
  { id: 'insurance', name: 'Passenger Accident Assurance', actions: ['sample'] },
  { id: 'orcr', name: 'Official Receipt/Certificate of Registration (OR/CR)', actions: ['sample'] },
  { id: 'govid', name: 'Valid Government ID / Certificate of Business Name (issued by DTI)', actions: ['sample'] },
  { id: 'operator', name: "Operator's Data Sheet", actions: ['sample', 'download', 'edit'] },
];

const SAMPLE_DOCS = {
  petition: '/samples/notarized-petition.png',
  insurance: '/samples/passenger-accident-assurance.png',
  orcr: '/samples/orcr.jpg',
  govid: '/samples/gov-id.png',
  operator: '/samples/operator-data-sheet.png',
};

function ApplyCPC() {
  const [cpcTypes, setCpcTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [view, setView] = useState('grid');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAllDenoms, setShowAllDenoms] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    api.get('cpc-types/')
      .then((res) => setCpcTypes(res.data))
      .catch(() => setError('Could not load CPC types.'));
  }, []);

  // Coming from the homepage card: pre-select the requested CPC type.
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (!typeParam || cpcTypes.length === 0) return;
    const match = cpcTypes.find((t) => t.type_name === typeParam);
    if (match) {
      setSelectedType(match.id);
      setError('');
      setView('detail');
      setSearchParams({}, { replace: true });
    }
  }, [cpcTypes, searchParams, setSearchParams]);

  const selected = cpcTypes.find((t) => t.id === selectedType) || null;

  const selectType = (id) => {
    setSelectedType(id);
    setError('');
    setView('detail');
  };

  const handleApply = async () => {
    if (!selectedType) {
      setError('Please select a CPC type first.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.post('applications/drafts/create/', {
        cpc_type: selectedType,
      });
      navigate(`/apply/${res.data.id}/documents`);
    } catch (err) {
      setIsLoading(false);
      setError('Could not start your application. Make sure you are logged in.');
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-8 flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)]">
      {/* Page header */}
      <div className="shrink-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-4 py-2 mb-3 rounded-md bg-white border border-gray-200 text-sm font-medium text-[#0E2036] hover:border-[#C9A227] hover:text-[#C9A227] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="mb-4">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[#0E2036]">New CPC Application</h2>
          <p className="text-gray-500 text-sm mt-1 max-w-2xl">
            {view === 'grid'
              ? 'Select your transport denomination to review its details and requirements, then proceed to document submission. Your application is only recorded once you submit all requirements.'
              : 'Review the selected denomination, its details and requirements, then proceed to document submission. Your application is only recorded once you submit all requirements.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm font-medium">
            {error}
          </div>
        )}
      </div>

      {view === 'grid' ? (
        /* STEP 1: denomination cards grid — UNCHANGED */
        <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-y-auto p-4 md:p-6 lg:overflow-hidden">
          {cpcTypes.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
              Loading available CPC types&hellip;
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:h-full lg:auto-rows-fr">
              {cpcTypes.map((t, idx) => (
                <button
                  key={t.id}
                  onClick={() => selectType(t.id)}
                  className="group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#C9A227]/60 hover:-translate-y-0.5 transition-all duration-300 text-left cursor-pointer overflow-hidden flex flex-col"
                >
                  <div className="relative flex-1 basis-0 min-h-16 lg:min-h-0 overflow-hidden">
                    <img
                      src={cpcImageFor(t.type_name)}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover object-center opacity-75"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0E2036]/95 via-[#0E2036]/70 to-[#0E2036]/45 opacity-85 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="absolute top-2.5 left-3 md:top-3 md:left-4 z-10 text-[10px] font-semibold text-[#0E2036] uppercase tracking-wide bg-[#C9A227] px-2 py-1 rounded-md">
                      CPC Type {String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="shrink-0 flex flex-col p-3 md:p-4">
                    <h4 className="font-serif text-lg md:text-2xl font-bold text-[#0E2036] leading-tight">
                      {t.type_name}
                    </h4>
                    <div className="mt-3.5 border-t border-gray-200" />
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-600 leading-snug line-clamp-1">
                        {t.description || `Franchise application for ${t.type_name}.`}
                      </p>
                      <span className="w-8 h-8 shrink-0 rounded-md bg-[#0E2036] text-white flex items-center justify-center group-hover:bg-[#C9A227] transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* STEP 2: two-panel detail layout — REDESIGNED */
        <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden flex">

          {/* LEFT: selected denomination + collapsible switcher */}
          <div
            className={`${selectedType ? 'hidden md:flex' : 'flex'} w-full md:w-[300px] shrink-0 flex-col border-r border-gray-200 bg-gray-50/60`}
          >
            <div className="px-5 py-4 border-b border-gray-200 shrink-0">
              <h3 className="text-sm font-semibold text-[#0E2036]">Denomination</h3>
              <p className="text-xs text-gray-500 mt-0.5">The transport type you're applying for.</p>
            </div>

            <div className="px-4 pt-4 pb-2 shrink-0">
              {selected && (
                <div className="rounded-lg border border-[#C9A227]/50 bg-white px-4 py-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#C9A227]">
                      Selected
                    </span>
                    <ShieldCheck className="w-4 h-4 text-[#C9A227]" />
                  </div>
                  <p className="mt-1.5 font-serif text-base font-semibold text-[#0E2036] leading-snug">
                    {selected.type_name}
                  </p>
                </div>
              )}

              <button
                onClick={() => setShowAllDenoms((v) => !v)}
                className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold text-[#0E2036]/70 hover:text-[#0E2036] hover:bg-white transition-colors cursor-pointer"
              >
                {showAllDenoms ? 'Hide other denominations' : 'Choose a different denomination'}
                {showAllDenoms
                  ? <ChevronUp className="w-4 h-4" />
                  : <ChevronDown className="w-4 h-4 animate-bounce text-[#C9A227]" />
                }
              </button>
            </div>

            {showAllDenoms && (
              <div className="flex-1 overflow-y-auto px-3 pb-4 border-t border-gray-200 pt-3">
                {cpcTypes.map((t) => {
                  const isActive = t.id === selectedType;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { selectType(t.id); setShowAllDenoms(false); }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-md text-sm mb-1 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#0E2036] text-white font-semibold'
                          : 'text-gray-700 hover:bg-white'
                      }`}
                    >
                      {t.type_name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: details panel */}
          <div className={`${selectedType ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col overflow-y-auto`}>
            {selected ? (
              <div className="p-6 md:p-10">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-2xl font-semibold text-[#0E2036]">{selected.type_name} Franchise</h3>
                    </div>
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed max-w-2xl mt-2">
                      {selected.description || `You are applying for a new Certificate of Public Convenience for a ${selected.type_name}. Ensure your petition form is completed before proceeding to document submission.`}
                    </p>
                  </div>
                  <button
                    onClick={handleApply}
                    disabled={isLoading}
                    className="shrink-0 self-start px-8 py-3.5 bg-[#0E2036] text-white text-sm font-semibold rounded-md hover:bg-[#152C48] transition-colors flex items-center gap-2 disabled:opacity-70 cursor-pointer"
                  >
                    {isLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <>Continue to upload <ArrowRight className="w-4.5 h-4.5" /></>}
                  </button>
                </div>

                <div className="mt-10">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-5">
                    <h4 className="font-serif text-xl font-semibold text-[#0E2036]">General Requirements</h4>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-green-700 bg-green-50">
                      <ShieldCheck className="w-3.5 h-3.5" /> Basic Documents
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-5">
                    These requirements apply to all CPC denominations. Additional documents specific to {selected.type_name} will be listed here as needed.
                  </p>

                  <div className="space-y-3">
                    {BASIC_REQUIREMENTS.map((req) => (
                      <RequirementRow key={req.id} req={req} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center px-10">
                <div className="w-14 h-14 rounded-full bg-[#0E2036]/5 flex items-center justify-center mb-4">
                  <Landmark className="w-6 h-6 text-[#0E2036]" />
                </div>
                <h4 className="font-serif text-lg font-semibold text-[#0E2036]">Select a denomination</h4>
                <p className="text-sm text-gray-500 mt-1.5 max-w-xs">
                  Choose a transport type on the left to see its requirements and continue your application.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RequirementRow({ req }) {
  const [expanded, setExpanded] = useState(false);
  const sample = SAMPLE_DOCS[req.id];

  const handleAction = (action) => {
    if (action === 'sample') {
      window.open(sample, '_blank');
    } else if (action === 'download') {
      window.alert(`Printable form for ${req.name} will be available here.`);
    } else if (action === 'edit') {
      window.alert(`Editing for ${req.name} will be available here.`);
    }
  };

  const [primaryAction, ...moreActions] = req.actions;
  const primaryMeta = ALL_ACTIONS[primaryAction];
  const PrimaryIcon = primaryMeta.icon;
  const hasMore = moreActions.length > 0;

  const secondaryBtn =
    'w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#0E2036]/5 text-[#0E2036] rounded-md text-xs font-semibold hover:bg-[#0E2036] hover:text-white transition-colors cursor-pointer whitespace-nowrap';

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-[#C9A227]/50 transition-colors">
      {/* Left: requirement name */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-md bg-[#0E2036]/5 flex items-center justify-center text-[#0E2036] shrink-0">
          <FileText className="w-4.5 h-4.5" />
        </div>
        <h5 className="font-medium text-sm text-[#0E2036] leading-snug">{req.name}</h5>
      </div>

      {/* Right: single-height row — chevron sits beside the primary button, not below it */}
      <div className="sm:ml-6 shrink-0 w-full sm:w-56 flex flex-col gap-1.5">
        <div className="w-full flex">
            <button
              onClick={() => handleAction(primaryAction)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#0E2036] text-white text-xs font-semibold hover:bg-[#152C48] transition-colors cursor-pointer whitespace-nowrap ${
                hasMore ? 'rounded-l-md' : 'rounded-md'
              }`}
            >
              <PrimaryIcon className="w-4 h-4" /> {primaryMeta.label}
            </button>

            {hasMore && (
              <button
                onClick={() => setExpanded((v) => !v)}
                aria-label="More actions"
                className={`shrink-0 w-9 flex items-center justify-center border rounded-r-md transition-colors cursor-pointer ${
                  expanded
                    ? 'bg-[#0E2036] text-white border-[#0E2036]'
                    : 'bg-white text-[#0E2036] border-gray-300 hover:bg-gray-100'
                }`}
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 animate-bounce" />}
              </button>
            )}
          </div>

        {expanded && hasMore && (
          <div className="flex flex-col gap-1.5">
            {moreActions.map((action) => {
              const meta = ALL_ACTIONS[action];
              const Icon = meta.icon;
              return (
                <button key={action} onClick={() => handleAction(action)} className={secondaryBtn}>
                  <Icon className="w-4 h-4" /> {meta.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ApplyCPC;