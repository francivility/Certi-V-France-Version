import { useEffect, useRef, useState } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { FileText, Printer, Download, PieChart as PieIcon, BarChart3, ChevronDown } from 'lucide-react';
import api from '../api/axios';
import { STATUS_LABEL } from '../constants';

const COLORS = [
  '#C9A227', '#ef4444', '#10b981', '#8b5cf6', '#f97316', '#0ea5e9', '#ec4899',
  '#14b8a6', '#64748b', '#22c55e', '#f59e0b', '#f43f5e', '#a21caf', '#3f6212',
];

const VIEW_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'status', label: 'By Status' },
  { value: 'denomination', label: 'By Denomination' },
  { value: 'month', label: 'By Month' },
  { value: 'year', label: 'By Year' },
];

const MIN_LABEL_PERCENT = 5;

function statusName(status) {
  return (STATUS_LABEL[status] && STATUS_LABEL[status].label) || status || 'Pending Review';
}

function formatPercent(value, total) {
  if (!total) return '0.0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

// Custom label rendered inside each pie slice (count + percentage).
const renderInsideLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent * 100 < MIN_LABEL_PERCENT) return null;
  return (
    <text x={x} y={y} fill="#ffffff" textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="bold">
      <tspan x={x} dy={0}>{value}</tspan>
      <tspan x={x} dy={13}>{(percent * 100).toFixed(1)}%</tspan>
    </text>
  );
};

function SectionCard({ icon: Icon, tint, title, sub, children, maxWidth }) {
  return (
    <div
      className="bg-white border border-gov-gray-200 shadow-md rounded-3xl overflow-hidden print-view"
      style={maxWidth ? { maxWidth, marginLeft: 'auto', marginRight: 'auto' } : undefined}
    >
      <div className="px-6 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tint}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-navy-800 text-lg">{title}</h3>
          <p className="text-xs text-gov-gray-500 font-medium">{sub}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function PieBody({ data, total, cx = '40%', height = 300, outerRadius = 115, maxWidth }) {
  if (data.length === 0) {
    return <p className="text-sm text-gov-gray-500 font-medium py-8 text-center">No data.</p>;
  }
  return (
    <div
      className="relative"
      style={maxWidth ? { maxWidth, marginLeft: 'auto', marginRight: 'auto' } : undefined}
    >
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx={cx}
            cy="50%"
            outerRadius={outerRadius}
            paddingAngle={1}
            label={renderInsideLabel}
            labelLine={false}
            isAnimationActive={false}
          >
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(value, name) => [`${value} apps (${formatPercent(value, total)})`, name]} />
          <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 12, paddingLeft: 2 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute bottom-1 left-2 flex items-baseline gap-1.5">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-gov-gray-400">Total:</span>
        <span className="text-xl font-black text-navy-800">{total}</span>
      </div>
    </div>
  );
}

function ReceivingReports() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('all');
  const reportRef = useRef(null);

  useEffect(() => {
    api.get('applications/reports/')
      .then((res) => setSummary(res.data))
      .catch(() => setError('Could not load report data.'));
  }, []);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { window.print(); return; }
    const content = reportRef.current ? reportRef.current.innerHTML : '';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>LTFRB Region V - Receiving Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 4px; font-size: 20px; }
            .sub { color: #64748b; font-size: 12px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background: #f1f5f9; }
            .summary { display: flex; gap: 16px; margin-bottom: 20px; }
            .summary div { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
            .summary .num { font-size: 24px; font-weight: bold; }
            h2 { font-size: 15px; margin: 18px 0 8px; }
            svg { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <h1>Summary of Successful Applications</h1>
          <div class="sub">Receiving Officer Report &middot; Generated ${new Date().toLocaleString()}</div>
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  const exportCSV = () => {
    if (!summary) return;
    const rows = [
      ['Metric', 'Category', 'Total'],
      ['Total Successful Applications', '', summary.total_successful],
    ];
    summary.by_status.forEach((r) => rows.push(['By Status', statusName(r.status), r.total]));
    summary.by_denomination.forEach((r) => rows.push(['By Denomination', r.cpc_type__type_name, r.total]));
    summary.by_month.forEach((r) => rows.push(['By Month', r.month ? r.month.slice(0, 7) : '', r.total]));
    summary.by_year.forEach((r) => rows.push(['By Year', r.year ? r.year.slice(0, 4) : '', r.total]));

    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receiving-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const total = summary ? summary.total_successful : 0;

  const statusData = summary ? summary.by_status.map((r) => ({
    name: statusName(r.status),
    value: r.total,
  })) : [];

  const denomData = summary ? summary.by_denomination.map((r) => ({
    name: r.cpc_type__type_name,
    value: r.total,
  })) : [];

  const monthData = summary ? summary.by_month.map((r) => ({
    name: r.month ? r.month.slice(0, 7) : '',
    total: r.total,
  })) : [];

  const yearData = summary ? summary.by_year.map((r) => ({
    name: r.year ? r.year.slice(0, 4) : '',
    total: r.total,
  })) : [];

  const showStatus = view === 'all' || view === 'status';
  const showDenomination = view === 'all' || view === 'denomination';
  const showMonth = view === 'all' || view === 'month';
  const showYear = view === 'all' || view === 'year';

  const selectBase =
    'w-full md:w-auto appearance-none pl-4 pr-10 py-2.5 bg-white border border-gov-gray-200 rounded-xl text-sm font-bold text-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-600 cursor-pointer';

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 no-print">
        <div>
          <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-navy-800">Reports &amp; Statistics</h2>
          <p className="text-gov-gray-500 text-sm mt-1 font-medium">
            Summary of successful applications by status, denomination, and duration.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select value={view} onChange={(e) => setView(e.target.value)} className={selectBase} aria-label="Filter report view">
              {VIEW_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gov-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-navy-800 text-white rounded-xl text-xs font-bold shadow-md hover:bg-gov-blue transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print / Export
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gov-gray-200 text-navy-800 rounded-xl text-xs font-bold shadow-sm hover:border-gov-blue transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" /> Download CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      {!summary && !error && <p className="text-sm text-gov-gray-500 font-medium py-10 text-center">Loading reports...</p>}

      <div ref={reportRef} className="space-y-8">
        {summary && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print-view">
              <div className="bg-white border border-gov-gray-200 shadow-sm rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-1">Total Successful Applications</p>
                  <p className="text-3xl font-black text-navy-800">{summary.total_successful}</p>
                  <p className="text-[10px] text-gov-gray-400 font-medium mt-1">Passed receiving &amp; CTDO validation</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-navy-800/5 flex items-center justify-center text-navy-800 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
              <div className="bg-white border border-gov-gray-200 shadow-sm rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-1">Status Categories</p>
                  <p className="text-3xl font-black text-gov-blue">{statusData.length}</p>
                  <p className="text-[10px] text-gov-gray-400 font-medium mt-1">Distinct statuses present</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-navy-800/5 flex items-center justify-center text-navy-800 shrink-0">
                  <PieIcon className="w-6 h-6" />
                </div>
              </div>
              <div className="bg-white border border-gov-gray-200 shadow-sm rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest mb-1">Denomination Categories</p>
                  <p className="text-3xl font-black text-gov-green">{denomData.length}</p>
                  <p className="text-[10px] text-gov-gray-400 font-medium mt-1">Distinct CPC types present</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-navy-800/5 flex items-center justify-center text-navy-800 shrink-0">
                  <BarChart3 className="w-6 h-6" />
                </div>
              </div>
            </div>

            {showStatus && showDenomination && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard icon={PieIcon} tint="bg-navy-800/5 text-navy-800" title="By Status" sub="Successful applications by current status">
                  <PieBody data={statusData} total={total} />
                </SectionCard>

                <SectionCard icon={PieIcon} tint="bg-navy-800/5 text-navy-800" title="By Denomination" sub="Successful applications by CPC type">
                  <PieBody data={denomData} total={total} />
                </SectionCard>
              </div>
            )}

            {showStatus && !showDenomination && (
              <SectionCard icon={PieIcon} tint="bg-navy-800/5 text-navy-800" title="By Status" sub="Successful applications by current status" maxWidth={640}>
                <PieBody data={statusData} total={total} cx="45%" height={380} outerRadius={130} />
              </SectionCard>
            )}

            {showDenomination && !showStatus && (
              <SectionCard icon={PieIcon} tint="bg-navy-800/5 text-navy-800" title="By Denomination" sub="Successful applications by CPC type" maxWidth={640}>
                <PieBody data={denomData} total={total} cx="45%" height={380} outerRadius={130} />
              </SectionCard>
            )}

            {(showMonth || showYear) && showMonth && showYear && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard icon={BarChart3} tint="bg-navy-800/5 text-navy-800" title="By Month" sub="Successful applications per month">
                  {monthData.length === 0 ? (
                    <p className="text-sm text-gov-gray-500 font-medium py-8 text-center">No data.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={monthData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="total" name="Applications" fill="#C9A227" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </SectionCard>

                <SectionCard icon={BarChart3} tint="bg-navy-800/5 text-navy-800" title="By Year" sub="Successful applications per year">
                  {yearData.length === 0 ? (
                    <p className="text-sm text-gov-gray-500 font-medium py-8 text-center">No data.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={yearData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="total" name="Applications" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </SectionCard>
              </div>
            )}

            {showMonth && !showYear && (
              <SectionCard icon={BarChart3} tint="bg-navy-800/5 text-navy-800" title="By Month" sub="Successful applications per month">
                {monthData.length === 0 ? (
                  <p className="text-sm text-gov-gray-500 font-medium py-8 text-center">No data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart data={monthData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="total" name="Applications" fill="#C9A227" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </SectionCard>
            )}

            {showYear && !showMonth && (
              <SectionCard icon={BarChart3} tint="bg-navy-800/5 text-navy-800" title="By Year" sub="Successful applications per year">
                {yearData.length === 0 ? (
                  <p className="text-sm text-gov-gray-500 font-medium py-8 text-center">No data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart data={yearData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="total" name="Applications" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </SectionCard>
            )}

            <div className="flex items-center gap-2 text-[11px] font-semibold text-gov-gray-400 print-view">
              <FileText className="w-4 h-4" /> Reports include only successful applications that passed receiving &amp; CTDO validation &middot; Use Print / Export to generate a copy.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ReceivingReports;
