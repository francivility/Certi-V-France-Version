import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronLeft, ChevronRight, CalendarDays,
  Clock, Loader2, Gavel, Link2, FileText,
} from 'lucide-react';
import api from '../api/axios';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WHEEL_HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const WHEEL_MINUTES = [0, 15, 30, 45];
const WHEEL_PERIODS = ['AM', 'PM'];
const ITEM_HEIGHT = 40;
const VISIBLE_COUNT = 5;

function WheelColumn({ items, selected, onSelect, formatItem }) {
  const ref = useRef(null);
  const scrolling = useRef(false);
  const timeout = useRef(null);

  const scrollTo = useCallback((index, smooth = true) => {
    if (!ref.current) return;
    const offset = index * ITEM_HEIGHT;
    ref.current.scrollTo({ top: offset, behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx >= 0) scrollTo(idx, false);
  }, []);

  const handleScroll = () => {
    if (scrolling.current) return;
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      if (!ref.current) return;
      const idx = Math.round(ref.current.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      scrollTo(clamped);
      if (items[clamped] !== selected) onSelect(items[clamped]);
    }, 80);
  };

  return (
    <div className="relative flex-1">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[40px] bg-navy-800/5 rounded-md z-10 pointer-events-none border border-navy-800/10" />
      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-[200px] overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="h-[80px]" />
        {items.map((item) => (
          <div
            key={item}
            className="snap-center flex items-center justify-center h-[40px]"
          >
            <span className={`text-lg font-bold transition-colors ${
              item === selected ? 'text-navy-800' : 'text-gov-gray-300'
            }`}>
              {formatItem ? formatItem(item) : item}
            </span>
          </div>
        ))}
        <div className="h-[80px]" />
      </div>
    </div>
  );
}

function HearingScheduler() {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);

  const [slots, setSlots] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [hearings, setHearings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [wheelHour, setWheelHour] = useState(9);
  const [wheelMinute, setWheelMinute] = useState(0);
  const [wheelPeriod, setWheelPeriod] = useState('AM');
  const [timeInput, setTimeInput] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [checkingHearing, setCheckingHearing] = useState(true);
  const [existingHearing, setExistingHearing] = useState(null);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    api.get(`legal/hearing-slots/?year=${viewYear}&month=${viewMonth}`)
      .then((res) => setSlots(res.data))
      .catch(() => setError('Could not load hearing slots.'));
  }, [viewYear, viewMonth]);

  useEffect(() => {
    // A hearing whose Notice has already been sent is final — send the user
    // straight to the Notice form. If a hearing exists but no Notice was sent
    // yet, stay here so the officer can review it (or pick again) and proceed.
    api.get(`legal/notice/${applicationId}/`)
      .then((res) => {
        if (res.data && res.data.notice_sent) {
          navigate(`/legal/notice/${applicationId}`);
        } else if (res.data && res.data.hearing_date) {
          setExistingHearing({
            hearing_date: res.data.hearing_date,
            hearing_time_label: res.data.hearing_time_label,
          });
        }
      })
      .catch(() => {})
      .finally(() => setCheckingHearing(false));
  }, [applicationId]);

  useEffect(() => {
    api.get('legal/schedule/')
      .then((res) => setHearings(res.data))
      .catch(() => {});
  }, []);

  const handlePrevMonth = () => {
    if (viewMonth === 1) { setViewYear(viewYear - 1); setViewMonth(12); }
    else setViewMonth(viewMonth - 1);
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) { setViewYear(viewYear + 1); setViewMonth(1); }
    else setViewMonth(viewMonth + 1);
  };

  const handlePickDate = async (dateStr) => {
    setError('');
    setSelectedDate(dateStr);
    setSelectedTime(null);
    setWheelHour(9);
    setWheelMinute(0);
    setWheelPeriod('AM');
    setTimeInput('');
    setLoadingSlots(true);
    try {
      const res = await api.get(`legal/available-slots/?date=${dateStr}`);
      setAvailableTimes(res.data);
    } catch {
      setAvailableTimes([]);
      setError('Could not load time slots for this date.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBackToCalendar = () => {
    setSelectedDate(null);
    setSelectedTime(null);
    setError('');
  };

  const handleBackToTimeSlots = () => {
    setSelectedTime(null);
    setError('');
  };

  const buildTime24 = (h12, min, period) => {
    let h = h12;
    if (period === 'AM' && h12 === 12) h = 0;
    if (period === 'PM' && h12 !== 12) h = h12 + 12;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };

  const parseTypedTime = (val) => {
    const s = (val || '').trim().toLowerCase();
    if (!s) return null;
    const m = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
    if (!m) return null;
    const hour = parseInt(m[1], 10);
    const minute = parseInt(m[2], 10);
    if (minute < 0 || minute > 59) return null;
    const period = m[3];
    if (period) {
      if (hour < 1 || hour > 12) return null;
      let h24 = hour;
      if (period === 'pm' && hour !== 12) h24 = hour + 12;
      if (period === 'am' && hour === 12) h24 = 0;
      return { time24: `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, period: period.toUpperCase() };
    }
    if (hour > 23) return null;
    return { time24: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, period: hour >= 12 ? 'PM' : 'AM' };
  };

  const timeInOfficeHours = (time24) => {
    const [h, m] = time24.split(':').map(Number);
    const mins = h * 60 + m;
    return mins >= 8 * 60 && mins < 17 * 60;
  };

  const timeIsBlocked = (time24) => {
    const slot = availableTimes.find((s) => s.time === time24);
    return slot ? !!(slot.booked || slot.reserved) : false;
  };

  const handleConfirmTime = async () => {
    setError('');
    const typed = timeInput && timeInput.trim() ? parseTypedTime(timeInput) : null;
    const time24 = typed ? typed.time24 : buildTime24(wheelHour, wheelMinute, wheelPeriod);
    if (!time24) {
      setError('Please enter a valid time (e.g. 2:30 PM or 14:30).');
      return;
    }
    if (!timeInOfficeHours(time24)) {
      setError('Please select a time within office hours (8:00 AM - 5:00 PM).');
      return;
    }
    if (timeIsBlocked(time24)) {
      setError('This time is already booked or reserved. Please pick another.');
      return;
    }
    try {
      const res = await api.get('legal/check-availability/', { params: { date: selectedDate, time: time24 } });
      if (res.data.available) {
        setSelectedTime(time24);
        return;
      }
    } catch {
      // fall through to the not-available message
    }
    setError('This time is not available (already booked, the day is full, or outside office hours). Please pick another.');
  };

  const handleConfirmAndDraft = async () => {
    setError('');
    setBooking(true);
    try {
      await api.post(`legal/schedule-hearing/${applicationId}/`, {
        hearing_date: selectedDate,
        hearing_time: selectedTime,
      });
      navigate(`/legal/notice/${applicationId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not schedule hearing.');
    } finally {
      setBooking(false);
    }
  };

  const formatTime12 = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const upcomingHearings = [...hearings]
    .filter((h) => h.hearing_date >= today.toISOString().slice(0, 10))
    .sort((a, b) => a.hearing_date.localeCompare(b.hearing_date))
    .slice(0, 8);

  // ── Stage 2b: Date + time picked — confirm before booking ──
  if (selectedDate && selectedTime) {
    return (
      <div className="w-full">
        <div className="px-4 sm:px-6 lg:px-8 pt-8">
          <button
            onClick={handleBackToTimeSlots}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-gov-gray-200 text-sm font-medium text-navy-800 hover:border-gold hover:text-gold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Time Picker
          </button>
        </div>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-2xl mx-auto">
          <div className="mb-6">
            <h2 className="font-serif text-3xl font-semibold text-navy-800">Confirm Hearing</h2>
            <p className="text-gov-gray-500 text-sm mt-1">
              Review the selected date and time before booking.
            </p>
          </div>

        {error && (
          <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-md px-4 py-3 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="bg-white border border-gov-gray-200 rounded-xl p-8 text-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-navy-800/5 flex items-center justify-center text-navy-800 mx-auto mb-4">
            <CalendarDays className="w-6 h-6" />
          </div>
          <p className="text-sm text-gov-gray-500 font-medium mb-1">You selected</p>
          <p className="text-2xl font-serif font-semibold text-navy-800 mb-1">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
          <p className="text-lg font-semibold text-navy-800 mb-2">{formatTime12(selectedTime)}</p>
          <p className="text-xs text-gov-gray-400 font-medium">
            This will be booked as the hearing for Application #{applicationId}.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleConfirmAndDraft}
            disabled={booking}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-navy-800 text-white text-sm font-medium rounded-md hover:bg-navy-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CalendarDays className="w-4 h-4" /> Confirm Schedule</>}
          </button>
        </div>
      </div>
      </div>
    );
  }

  // ── Stage 2a: Date picked — wheel time picker ──
  if (selectedDate) {
    return (
    <div className="w-full">
      <div className="px-4 sm:px-6 lg:px-8 pt-8">
        <button
          onClick={handleBackToCalendar}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-gov-gray-200 text-sm font-medium text-navy-800 hover:border-gold hover:text-gold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Calendar
        </button>
      </div>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="font-serif text-3xl font-semibold text-navy-800">Pick a Time</h2>
          <p className="text-gov-gray-500 text-sm mt-1">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-md px-4 py-3 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
        {loadingSlots ? (
          <div className="bg-white border border-gov-gray-200 rounded-xl p-12 text-center">
            <Loader2 className="w-8 h-8 text-navy-800 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gov-gray-500 font-medium">Loading available slots...</p>
          </div>
        ) : (
          <>
            <div className="bg-white border border-gov-gray-200 rounded-xl p-6 md:p-8 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
                  <Clock className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-800">Select Hearing Time</p>
                  <p className="text-[11px] text-gov-gray-400">Scroll to adjust hour, minute, and AM/PM</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <WheelColumn
                  items={WHEEL_HOURS}
                  selected={wheelHour}
                  onSelect={setWheelHour}
                  formatItem={(v) => String(v)}
                />
                <span className="text-2xl font-bold text-navy-800 self-center mt-[-80px]">:</span>
                <WheelColumn
                  items={WHEEL_MINUTES}
                  selected={wheelMinute}
                  onSelect={setWheelMinute}
                  formatItem={(v) => String(v).padStart(2, '0')}
                />
                <WheelColumn
                  items={WHEEL_PERIODS}
                  selected={wheelPeriod}
                  onSelect={setWheelPeriod}
                />
              </div>

              <div className="mt-6 text-center">
                <p className="text-3xl font-bold text-navy-800 tracking-tight">
                  {wheelHour}:{String(wheelMinute).padStart(2, '0')} {wheelPeriod}
                </p>
              </div>

              {!timeInput && (
                (() => {
                  const current24 = buildTime24(wheelHour, wheelMinute, wheelPeriod);
                  if (timeIsBlocked(current24)) {
                    return (
                      <div className="mt-3 text-center text-[11px] font-medium text-gov-red bg-gov-red-light/60 border border-gov-red/20 rounded-md px-3 py-2">
                        This time is already booked or reserved. Please pick another.
                      </div>
                    );
                  }
                  return null;
                })()
              )}

              <div className="mt-5 border-t border-gov-gray-100 pt-5">
                <p className="text-[10px] font-semibold text-gov-gray-400 mb-2">Or enter a time</p>
                <div className="flex items-center gap-2 justify-center">
                  <input
                    type="text"
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                    className="w-56 px-4 py-2.5 rounded-md border border-gov-gray-300 text-sm font-medium text-navy-800 text-center focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent placeholder:text-gov-gray-400"
                  />
                </div>
                <p className="text-[11px] text-gov-gray-400 text-center mt-2">
                  Office hours (8:00 AM - 5:00 PM)
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleConfirmTime}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-navy-800 text-white text-sm font-medium rounded-md hover:bg-navy-700 transition-colors cursor-pointer"
              >
                <Clock className="w-4 h-4" /> Confirm Time
              </button>
            </div>
          </>
        )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white border border-gov-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
                <Gavel className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-800 text-base">Upcoming Hearings</h3>
                <p className="text-xs text-gov-gray-500">Next 8 upcoming scheduled hearings</p>
              </div>
            </div>
            <div className="divide-y divide-gov-gray-100">
              {upcomingHearings.length === 0 && (
                <div className="p-8 text-center text-sm text-gov-gray-500 font-medium flex flex-col items-center gap-2">
                  <Clock className="w-8 h-8 text-gov-gray-300" />
                  No upcoming hearings scheduled.
                </div>
              )}
              {upcomingHearings.map((h) => (
                <div key={h.application_id} className="px-6 py-4 hover:bg-gov-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center rounded-md bg-navy-800 px-2.5 py-1.5 text-white shrink-0">
                      <span className="text-[9px] font-semibold uppercase tracking-wide">
                        {new Date(h.hearing_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {Number(h.hearing_date.slice(-2))}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-navy-800 truncate">{h.applicant_name}</p>
                      <p className="text-[11px] text-gov-gray-500 font-medium mt-0.5">
                        App #{h.application_id} · {h.cpc_type_name}
                      </p>
                      {h.hearing_time && (
                        <p className="flex items-center gap-1 text-[11px] text-navy-800 font-medium mt-0.5">
                          <Clock className="w-3 h-3" /> {formatTime12(h.hearing_time)}
                        </p>
                      )}
                      <p className="flex items-center gap-1 text-[11px] text-gov-gray-400 font-medium mt-0.5">
                        <Link2 className="w-3 h-3" /> {h.case_number || h.docket_number || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
      </div>
    );
  }

  // ── Stage 1: No date picked — calendar ──
  const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (checkingHearing) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-md mx-auto bg-white border border-gov-gray-200 rounded-xl p-10 text-center">
          <Loader2 className="w-8 h-8 text-navy-800 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gov-gray-500 font-medium">Checking hearing status...</p>
        </div>
      </div>
    );
  }

  const numDays = new Date(viewYear, viewMonth, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay();

  return (
    <div className="w-full">
      <div className="px-4 sm:px-6 lg:px-8 pt-8">
        <Link
          to="/legal/queue"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-gov-gray-200 text-sm font-medium text-navy-800 hover:border-gold hover:text-gold transition-colors no-underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Hearing Schedule
        </Link>
      </div>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="font-serif text-3xl font-semibold text-navy-800">Schedule Hearing</h2>
          <p className="text-gov-gray-500 text-sm mt-1">
            Application #{applicationId} — pick an available date from the calendar.
          </p>
        </div>

        {existingHearing && (
          <div className="mb-6 flex flex-col lg:flex-row lg:items-center gap-4 bg-gov-amber-light border border-gov-amber/30 rounded-xl px-5 py-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-white border border-gov-amber/30 text-gov-amber flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-navy-800">Hearing already scheduled</p>
                <p className="text-xs text-gov-gray-600 font-medium mt-0.5">
                  Application #{applicationId} ·{' '}
                  {new Date(existingHearing.hearing_date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  })}
                  {' at '}
                  {existingHearing.hearing_time_label || 'TBA'}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/legal/notice/${applicationId}`)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-navy-800 text-white text-sm font-medium rounded-md hover:bg-navy-700 transition-colors cursor-pointer shrink-0"
            >
              <FileText className="w-4 h-4" /> Continue to Notice of Hearing
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-md px-4 py-3 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
        <div className="bg-white border border-gov-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-navy-800 bg-white border border-gov-gray-200 hover:border-gold hover:text-gold transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <h3 className="font-serif text-base md:text-lg font-semibold text-navy-800">
            {MONTH_NAMES[viewMonth - 1]} {viewYear}
          </h3>
          <button
            onClick={handleNextMonth}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-navy-800 bg-white border border-gov-gray-200 hover:border-gold hover:text-gold transition-colors cursor-pointer"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 md:p-6">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {WEEKDAY_HEADERS.map((w) => (
              <div key={w} className="text-center text-[10px] font-semibold text-gov-gray-400">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstWeekday }, (_, i) => <div key={`blank-${i}`} />)}
            {Array.from({ length: numDays }, (_, i) => i + 1).map((day) => {
              const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const d = new Date(viewYear, viewMonth - 1, day);
              const dayOfWeek = d.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const slot = slots.find((s) => s.date === dateStr);
              const available = isWeekend ? 0 : (slot ? slot.available : 4);
              const isPast = new Date(dateStr) < new Date(today.toDateString());
              const isFull = !isWeekend && !isPast && available <= 0;

              if (isWeekend) {
                return (
                  <div
                    key={dateStr}
                    className="flex flex-col items-center justify-center p-2 md:p-3 rounded-md text-sm font-semibold bg-gov-gray-100 text-gov-gray-300 cursor-not-allowed"
                  >
                    <span className="text-gov-gray-300 text-sm">{day}</span>
                    <span className="text-[10px] font-medium mt-0.5 text-gov-gray-300">N/A</span>
                  </div>
                );
              }

              return (
                <button
                  key={dateStr}
                  disabled={isPast || isFull}
                  onClick={() => handlePickDate(dateStr)}
                  className={`flex flex-col items-center justify-center p-2 md:p-3 rounded-md text-sm font-semibold transition-all ${
                    isPast
                      ? 'bg-gov-gray-100 text-gov-gray-300 cursor-not-allowed'
                      : isFull
                        ? 'bg-gov-red-light/50 text-gov-red border border-gov-red/20 cursor-not-allowed'
                        : available <= 1
                          ? 'bg-gov-amber-light/50 text-gov-amber border border-gov-amber/20 hover:border-gov-amber cursor-pointer'
                          : 'bg-gov-green-light/50 text-gov-green border border-gov-green/20 hover:border-gov-green hover:shadow-sm cursor-pointer'
                  }`}
                >
                  <span className="text-navy-800 text-sm">{day}</span>
                  <span className="text-[10px] font-medium mt-0.5">
                    {isPast ? '—' : isFull ? 'Full' : `${available}/4`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] font-medium text-gov-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gov-green-light border border-gov-green/20" /> 2–4 slots
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gov-amber-light border border-gov-amber/20" /> 1 slot left
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gov-red-light border border-gov-red/20" /> Full
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gov-gray-100 border border-gov-gray-200" /> Weekend / Past
        </span>
      </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="bg-white border border-gov-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
              <Gavel className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-semibold text-navy-800 text-base">Upcoming Hearings</h3>
              <p className="text-xs text-gov-gray-500">Next 8 upcoming scheduled hearings</p>
            </div>
          </div>
          <div className="divide-y divide-gov-gray-100">
            {upcomingHearings.length === 0 && (
              <div className="p-8 text-center text-sm text-gov-gray-500 font-medium flex flex-col items-center gap-2">
                <Clock className="w-8 h-8 text-gov-gray-300" />
                No upcoming hearings scheduled.
              </div>
            )}
            {upcomingHearings.map((h) => (
              <div key={h.application_id} className="px-6 py-4 hover:bg-gov-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center rounded-md bg-navy-800 px-2.5 py-1.5 text-white shrink-0">
                    <span className="text-[9px] font-semibold uppercase tracking-wide">
                      {new Date(h.hearing_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-lg font-bold leading-none">
                      {Number(h.hearing_date.slice(-2))}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy-800 truncate">{h.applicant_name}</p>
                    <p className="text-[11px] text-gov-gray-500 font-medium mt-0.5">
                      App #{h.application_id} · {h.cpc_type_name}
                    </p>
                    {h.hearing_time && (
                      <p className="flex items-center gap-1 text-[11px] text-navy-800 font-medium mt-0.5">
                        <Clock className="w-3 h-3" /> {formatTime12(h.hearing_time)}
                      </p>
                    )}
                    <p className="flex items-center gap-1 text-[11px] text-gov-gray-400 font-medium mt-0.5">
                      <Link2 className="w-3 h-3" /> {h.case_number || h.docket_number || '—'}
                    </p>
                  </div>
                </div>
              </div>
))}
          </div>
        </div>
      </div>
      </div>
      </div>
      </div>
    );
  }

export default HearingScheduler;
