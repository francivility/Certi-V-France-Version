import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, ChevronLeft, ChevronRight, Gavel, SendHorizonal, Clock, Link2,
} from 'lucide-react';
import api from '../api/axios';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ORDSchedule() {
  const navigate = useNavigate();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [hearings, setHearings] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('legal/ord-schedule/')
      .then((res) => setHearings(res.data))
      .catch(() => setError('Could not load the hearing schedule.'));
  }, []);

  const handlePrevMonth = () => {
    if (viewMonth === 1) { setViewYear(viewYear - 1); setViewMonth(12); }
    else setViewMonth(viewMonth - 1);
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) { setViewYear(viewYear + 1); setViewMonth(1); }
    else setViewMonth(viewMonth + 1);
  };

  const numDays = new Date(viewYear, viewMonth, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay();
  const monthKey = `${viewYear}-${String(viewMonth).padStart(2, '0')}`;

  const filterDate = (dateStr) => dateStr.startsWith(monthKey);
  const sortedMonthly = hearings
    .filter((h) => filterDate(h.hearing_date))
    .sort((a, b) => a.hearing_date.localeCompare(b.hearing_date));
  const hearingsByDay = sortedMonthly.reduce((acc, h) => {
    const day = Number(h.hearing_date.slice(-2));
    if (!acc[day]) acc[day] = [];
    acc[day].push(h);
    return acc;
  }, {});

  const upcoming = [...hearings]
    .filter((h) => h.hearing_date >= today.toISOString().slice(0, 10))
    .sort((a, b) => a.hearing_date.localeCompare(b.hearing_date))
    .slice(0, 8);
  const pastToday = hearings
    .filter((h) => h.hearing_date < today.toISOString().slice(0, 10))
    .length;

  const fmtDate = (dateStr) => new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const formatTime12 = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-navy-800">Hearing Schedule</h2>
        <p className="text-gov-gray-500 text-sm mt-1 font-medium">
          Read-only calendar of all scheduled hearings across the organization.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-gov-gray-200 shadow-md rounded-3xl overflow-hidden">
          <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-navy-800 text-lg">{MONTH_NAMES[viewMonth - 1]} {viewYear}</h3>
                <p className="text-xs text-gov-gray-500 font-medium">{sortedMonthly.length} scheduled hearing(s)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-navy-800 bg-white border border-gov-gray-200 hover:border-gov-blue hover:text-gov-blue transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                onClick={handleNextMonth}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-navy-800 bg-white border border-gov-gray-200 hover:border-gov-blue hover:text-gov-blue transition-colors cursor-pointer"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 md:p-6">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {WEEKDAY_HEADERS.map((w) => (
                <div key={w} className="text-center text-[10px] font-extrabold text-gov-gray-400 uppercase tracking-widest">{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstWeekday }, (_, i) => <div key={`blank-${i}`} />)}
              {Array.from({ length: numDays }, (_, i) => i + 1).map((day) => {
                const dayHearings = hearingsByDay[day] || [];
                const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = dateStr === today.toISOString().slice(0, 10);

                return (
                  <div
                    key={day}
                    className={`flex flex-col min-h-[72px] rounded-xl border p-1.5 transition-colors ${
                      isToday ? 'border-navy-800 bg-navy-50' : 'border-gov-gray-200 bg-white hover:border-gov-blue'
                    }`}
                  >
                    <span className={`text-xs font-extrabold mb-1 ${isToday ? 'text-navy-800' : 'text-gov-gray-500'}`}>
                      {day}
                    </span>
                    <div className="flex flex-col gap-1 overflow-hidden">
                      {dayHearings.slice(0, 2).map((h) => (
                        <button
                          key={h.application_id}
                          onClick={() => navigate(`/ord/history/${h.application_id}`)}
                          title={`App #${h.application_id} — ${h.applicant_name}${h.notice_sent ? ' (notice sent)' : ''}`}
                          className={`flex items-center gap-1 rounded px-1 py-0.5 text-left cursor-pointer transition-colors ${
                            h.notice_sent ? 'bg-gov-green-light/70 hover:bg-gov-green-light' : 'bg-gov-amber-light/70 hover:bg-gov-amber-light'
                          }`}
                        >
                           <span className="text-[9px] leading-tight text-gov-gray-700 font-bold truncate">
                            #{h.application_id} {h.hearing_time ? formatTime12(h.hearing_time) : ''}
                          </span>
                        </button>
                      ))}
                      {dayHearings.length > 2 && (
                        <span className="text-[9px] font-bold text-gov-blue pl-1">+{dayHearings.length - 2} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-6 md:px-8 py-4 bg-gov-gray-50 border-t border-gov-gray-200 flex flex-wrap items-center gap-4 text-[11px] font-semibold text-gov-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-gov-green-light border border-gov-green/20" /> Notice sent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-gov-amber-light border border-gov-amber/20" /> Pending notice
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border-2 border-navy-800 bg-navy-50" /> Today
            </span>
            <span className="ml-auto">{pastToday} hearing(s) have taken place</span>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl overflow-hidden">
            <div className="px-6 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
                <Gavel className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-navy-800 text-lg">Upcoming Hearings</h3>
                <p className="text-xs text-gov-gray-500 font-medium">Next 8 upcoming scheduled hearings</p>
              </div>
            </div>
            <div className="divide-y divide-gov-gray-100">
              {upcoming.length === 0 && (
                <div className="p-8 text-center text-sm text-gov-gray-500 font-medium flex flex-col items-center gap-2">
                  <Clock className="w-8 h-8 text-gov-gray-300" />
                  No upcoming hearings scheduled.
                </div>
              )}
              {upcoming.map((h) => (
                <button
                  key={h.application_id}
                  onClick={() => navigate(`/ord/history/${h.application_id}`)}
                  className="w-full text-left px-6 py-4 hover:bg-gov-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center rounded-lg bg-navy-800 px-2.5 py-1.5 text-white shrink-0">
                      <span className="text-[9px] font-bold uppercase tracking-wide">
                        {new Date(h.hearing_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-lg font-black leading-none">
                        {Number(h.hearing_date.slice(-2))}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-navy-800 truncate">{h.applicant_name}</p>
                      <p className="text-[11px] text-gov-gray-500 font-medium mt-0.5">
                        App #{h.application_id} · {h.cpc_type_name}
                      </p>
                      {h.hearing_time && (
                        <p className="flex items-center gap-1 text-[11px] text-gov-blue font-bold mt-0.5">
                          <Clock className="w-3 h-3" /> {formatTime12(h.hearing_time)}
                        </p>
                      )}
                      <p className="flex items-center gap-1 text-[11px] text-gov-gray-400 font-medium mt-0.5">
                        <Link2 className="w-3 h-3" /> {h.case_number || h.docket_number || '—'}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold shrink-0 ${
                      h.notice_sent ? 'bg-gov-green-light text-gov-green' : 'bg-gov-amber-light text-gov-amber'
                    }`}>
                      {h.notice_sent ? <><SendHorizonal className="w-3 h-3" /> Notice sent</> : 'Awaiting notice'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gov-gray-200 shadow-md rounded-3xl p-6">
            <h3 className="font-bold text-navy-800 mb-2 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-navy-800" /> This Month
            </h3>
            <p className="text-sm text-gov-gray-500 font-medium">
              <span className="font-black text-navy-800 text-lg">{sortedMonthly.length}</span> hearings scheduled in{' '}
              {MONTH_NAMES[viewMonth - 1]} {viewYear}.
            </p>
            {sortedMonthly.length > 0 && (
              <p className="text-xs text-gov-gray-400 font-medium mt-2">
                First on {fmtDate(sortedMonthly[0].hearing_date)}.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ORDSchedule;