import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Eye, EyeOff, KeyRound, Lock, MapPin, Mail, ShieldCheck, User } from 'lucide-react';
import api from '../api/axios';

const FIELD = [
  { label: 'Name', key: 'name', icon: User },
  { label: 'Username', key: 'username', icon: Lock },
  { label: 'Email', key: 'email', icon: Mail },
  { label: 'Address', key: 'address', icon: MapPin },
  { label: 'TIN', key: 'tin', icon: CreditCard },
];

function Account() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [submitting, setSubmitting] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  useEffect(() => {
    api.get('accounts/account/')
      .then((res) => setInfo(res.data))
      .catch(() => setError('Could not load your account details.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('accounts/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPwSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwError(err.response?.data?.error || 'Could not update your password.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 text-sm font-medium text-[#0E2036] focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent';

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-6 py-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2 mb-5 rounded-md bg-white border border-gray-200 text-sm font-medium text-[#0E2036] hover:border-[#C9A227] hover:text-[#C9A227] transition-colors no-underline"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="mb-6">
        <h2 className="font-serif text-3xl md:text-4xl font-semibold text-[#0E2036]">Account</h2>
        <p className="text-gray-500 text-sm mt-1.5">
          Your applicant details and security settings.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Personal information (read-only) + Change password, side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 md:px-8 py-6 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#0E2036]/5 flex items-center justify-center text-[#0E2036]">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-semibold text-[#0E2036]">Personal Information</h3>
            <p className="text-xs text-gray-500">These details cannot be changed</p>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading account details&hellip;</div>
        ) : info ? (
          <div className="p-6 md:p-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
              {FIELD.map(({ label, key, icon: Icon }) => {
                const value = info[key] || '—';
                return (
                  <div key={key}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </p>
                    <p className="mt-1.5 text-base font-semibold text-[#0E2036]">{value}</p>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
                      <Lock className="w-3 h-3" /> Not editable
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 pt-6 border-t border-gray-100 flex items-start gap-3 rounded-lg bg-gray-50 border border-gray-200 px-5 py-4">
              <ShieldCheck className="w-4 h-4 text-[#0E2036] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#0E2036]">Verification status</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {info.biometric_verification_status === 'verified'
                    ? 'Your identity has been verified.'
                    : 'Your face and ID verification are pending review.'}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Change password */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 md:px-8 py-6 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#0E2036]/5 flex items-center justify-center text-[#0E2036]">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-semibold text-[#0E2036]">Change Password</h3>
            <p className="text-xs text-gray-500">Keep your account secure</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="p-6 md:p-10 w-full">
          {pwSuccess && (
            <div className="mb-5 bg-green-50 border border-green-200 text-green-700 rounded-md px-4 py-3 text-sm font-medium">
              {pwSuccess}
            </div>
          )}
          {pwError && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm font-medium">
              {pwError}
            </div>
          )}

          {[
            { key: 'current', label: 'Current Password', value: currentPassword, set: setCurrentPassword, placeholder: 'Enter your current password' },
            { key: 'new', label: 'New Password', value: newPassword, set: setNewPassword, placeholder: 'At least 8 characters' },
            { key: 'confirm', label: 'Confirm New Password', value: confirmPassword, set: setConfirmPassword, placeholder: 'Re-enter your new password' },
          ].map(({ key, label, value, set, placeholder }) => (
            <div key={key} className="mb-6">
              <label className="text-xs font-semibold text-gray-400">{label}</label>
              <div className="relative mt-2">
                <input
                  type={show[key] ? 'text' : 'password'}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  required
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => ({ ...s, [key]: !s[key] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0E2036] cursor-pointer"
                  tabIndex={-1}
                >
                  {show[key] ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#0E2036] text-white rounded-lg text-sm font-semibold hover:bg-[#152C48] transition-colors mt-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            
            Update Password
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}

export default Account;