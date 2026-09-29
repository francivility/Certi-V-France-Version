import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileSearch } from 'lucide-react';
import api from '../api/axios';
import { STATUS_LABEL } from '../constants';

function CaseSearch({
  endpoint,
  title = 'Case Search',
  subtitle = 'Search applications by case number, docket number, or applicant name.',
  placeholder = 'Type a case no., docket no., or applicant name...',
  buildAction,
  chips,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const res = await api.get(endpoint, { params: { q: query.trim() } });
      setResults(res.data);
    } catch {
      setError('Could not perform the search.');
    } finally {
      setLoading(false);
    }
  };

  const renderAction = (app) => {
    const action = buildAction ? buildAction(app) : null;
    if (!action) {
      return <span className="text-sm font-medium text-gov-gray-400">—</span>;
    }
    return (
      <button
        onClick={() => navigate(action.path)}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-navy-800 text-white rounded-xl text-xs font-bold shadow-md hover:bg-gov-blue transition-colors cursor-pointer"
      >
        {action.icon} {action.label}
      </button>
    );
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-navy-800">{title}</h2>
        <p className="text-gov-gray-500 text-sm mt-1 font-medium">{subtitle}</p>
      </div>

      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSearch} className="bg-white border border-gov-gray-200 shadow-md rounded-3xl p-6 md:p-8 mb-6">
        <label className="text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Search Query</label>
        <div className="relative mt-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gov-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-gov-gray-50 border border-gov-gray-300 rounded-xl py-3.5 pl-12 pr-4 text-sm font-medium text-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-navy-800 text-white text-sm font-bold rounded-xl shadow-md hover:bg-gov-blue transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search className="w-4 h-4" /> {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl overflow-hidden">
        <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200">
          <h3 className="font-bold text-navy-800 text-lg">Results</h3>
          <p className="text-xs text-gov-gray-500 font-medium">{searched ? `${results.length} match(es)` : 'Enter a query to search.'}</p>
        </div>

        {searched && results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[820px]">
              <thead>
                <tr className="border-b border-gov-gray-200">
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Reference No.</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Applicant Name</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">CPC Type</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Case No.</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Docket No.</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest">Status</th>
                  <th className="p-4 text-xs font-extrabold text-gov-gray-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map((app) => {
                  const st = STATUS_LABEL[app.status] || { label: app.status, cls: 'bg-gov-gray-200 text-gov-gray-600' };
                  const extraChips = chips ? chips(app) : [];
                  return (
                    <tr key={app.id} className="border-b border-gov-gray-100 hover:bg-gov-gray-50 transition-colors">
                      <td className="p-4 font-bold text-gov-gray-500 text-sm">#{app.id}</td>
                      <td className="p-4 font-bold text-navy-800">{app.applicant_name}</td>
                      <td className="p-4 text-sm font-bold text-gov-gray-600">{app.cpc_type_name}</td>
                      <td className="p-4 text-sm font-medium text-gov-gray-500">{app.case_number || '—'}</td>
                      <td className="p-4 text-sm font-medium text-gov-gray-500">{app.docket_number || '—'}</td>
                      <td className="p-4">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex px-3 py-1 text-[10px] font-extrabold rounded ${st.cls}`}>
                            {st.label}
                          </span>
                          {extraChips.map((c, i) => (
                            <span key={i} className={`inline-flex px-3 py-1 text-[10px] font-extrabold rounded ${c.cls}`}>
                              {c.label}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className="p-4 text-right">{renderAction(app)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {searched && results.length === 0 && !error && (
          <div className="p-10 text-center text-sm text-gov-gray-500 font-medium flex flex-col items-center gap-2">
            <FileSearch className="w-8 h-8 text-gov-gray-300" />
            No applications matched your search.
          </div>
        )}
      </div>
    </div>
  );
}

export default CaseSearch;