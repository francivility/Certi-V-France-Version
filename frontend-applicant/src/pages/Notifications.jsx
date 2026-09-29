import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, ChevronRight, AlertTriangle, Download, MapPin, Clock, BadgeCheck } from 'lucide-react';
import api from '../api/axios';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = () => {
    api.get('applications/notifications/')
      .then((res) => setNotifications(res.data.notifications))
      .catch(() => setError('Could not load notifications.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const isRelease = (n) => n.title === 'Your CPC is ready';

  const isPayment = (n) =>
    n.title === 'Payment Order Slip issued' ||
    n.title === 'Payment overdue' ||
    n.title === 'Application expired' ||
    n.title === 'Online payment submitted' ||
    n.title === 'Payment received';

  const isNotice = (n) => n.title === 'Notice of Hearing';

  const handleOpen = async (n) => {
    try {
      await api.post('applications/notifications/read/', { ids: [n.id] });
    } catch { /* non-blocking */ }
    if (n.application_id) {
      if (isRelease(n)) {
        navigate('/my-applications');
      } else if (isPayment(n)) {
        navigate(`/pay/${n.application_id}`);
      } else if (isNotice(n)) {
        navigate(`/notice/${n.application_id}`);
      } else {
        navigate(`/apply/${n.application_id}/documents`);
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2 mb-5 rounded-md bg-white border border-gray-200 text-sm font-medium text-[#0E2036] hover:border-[#C9A227] hover:text-[#C9A227] transition-colors no-underline"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="mb-6">
        <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[#0E2036]">Notifications</h2>
        <p className="text-gray-500 text-sm mt-1.5">
          Updates about your applications, including documents that need re-uploading.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}
      {loading && (
        <div className="py-16 text-center text-sm text-gray-500">Loading notifications&hellip;</div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="w-14 h-14 rounded-md bg-[#0E2036]/5 flex items-center justify-center mx-auto mb-4 text-[#0E2036]">
            <Bell className="w-7 h-7" />
          </div>
          <h3 className="font-serif text-xl font-semibold text-[#0E2036] mb-2">You're all caught up</h3>
          <p className="text-sm text-gray-500">No notifications right now.</p>
        </div>
      )}

      <div className="space-y-3">
        {notifications.map((n) => {
          const release = isRelease(n);
          return (
            <button
              key={n.id}
              onClick={() => handleOpen(n)}
              className={`w-full text-left bg-white border rounded-lg p-5 transition-colors cursor-pointer no-underline group ${
                n.is_read ? 'border-gray-200' : release ? 'border-green-300' : 'border-[#C9A227]/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                    release ? 'bg-green-50 text-green-600' : n.is_read ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-600'
                  }`}>
                    {release ? <BadgeCheck className="w-4.5 h-4.5" /> : n.is_read ? <Bell className="w-4.5 h-4.5" /> : <AlertTriangle className="w-4.5 h-4.5" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${n.is_read ? 'text-gray-500' : 'text-[#0E2036]'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Application #{n.application_id}</p>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{n.message}</p>

                    {release && (
                      <div className="mt-3 space-y-3">
                        <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0E2036] text-white rounded-md text-xs font-semibold">
                          <Download className="w-4 h-4" /> Click here to download
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md">
                          <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2.5 flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-[#0E2036] shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Hardcopy Pickup</p>
                              <p className="text-[11px] font-medium text-[#0E2036] leading-snug">LTFRB Region V office, Peñaranda St., Legazpi City</p>
                            </div>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2.5 flex items-start gap-2">
                            <Clock className="w-3.5 h-3.5 text-[#0E2036] shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Office Hours</p>
                              <p className="text-[11px] font-medium text-[#0E2036] leading-snug">8:00 AM to 5:00 PM, Mondays to Fridays</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="text-[11px] text-gray-400 mt-2">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4.5 h-4.5 text-gray-300 group-hover:text-[#C9A227] transition-colors shrink-0 mt-1 hidden sm:block" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Notifications;