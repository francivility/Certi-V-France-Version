import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Lock, ArrowLeft, ShieldCheck } from 'lucide-react';
import api from '../api/axios';
import PasswordInput from '../components/PasswordInput';

function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post(`accounts/password-reset/confirm/${uid}/${token}/`, {
        new_password: newPassword,
      });
      setDone(true);
      setTimeout(() => navigate('/login', { state: { registered: true } }), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset your password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F2F3F1] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl grid lg:grid-cols-[1.05fr_1fr] shadow-2xl rounded-lg overflow-hidden">

        {/* ---------- MOBILE / TABLET BRANDING HEADER (visible below lg) ---------- */}
        <div
          className="lg:hidden relative bg-[#0E2036] text-white px-6 py-8 overflow-hidden"
          style={{ backgroundImage: 'url(/login-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 bg-[#0E2036]/95" aria-hidden="true" />
          {/* Seal watermark */}
          <div className="absolute -right-10 -bottom-10 opacity-[0.08]">
            <svg width="200" height="200" viewBox="0 0 260 260" fill="none">
              <circle cx="130" cy="130" r="128" stroke="#C9A227" strokeWidth="2" />
              <circle cx="130" cy="130" r="104" stroke="#C9A227" strokeWidth="1.5" />
              <circle cx="130" cy="130" r="80" stroke="#C9A227" strokeWidth="1" />
            </svg>
          </div>

          <div className="relative flex flex-col items-center text-center">
            <div className="flex items-center gap-2 text-white/60 text-xs mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C9A227]" />
              Official government portal
            </div>
            <h1 className="font-serif text-3xl leading-none font-semibold tracking-[0.04em] uppercase">
              Certi-V
            </h1>
            <div className="w-14 h-[3px] bg-[#C9A227] rounded-full my-3 shadow-[0_0_10px_rgba(201,162,39,0.5)]" />
            <p className="text-xs text-white/70 leading-relaxed max-w-xs mx-auto">
              Set a new password for your Certi-V account
            </p>
          </div>
        </div>

        {/* ---------- DESKTOP BRANDING PANEL (visible lg+) ---------- */}
        <div
          className="hidden lg:flex relative bg-[#0E2036] text-white p-12 flex-col justify-between overflow-hidden"
          style={{ backgroundImage: 'url(/login-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 bg-[#0E2036]/95" aria-hidden="true" />
          <div className="absolute -right-14 -top-14 opacity-[0.08]">
            <svg width="280" height="280" viewBox="0 0 260 260" fill="none">
              <circle cx="130" cy="130" r="128" stroke="#C9A227" strokeWidth="2" />
              <circle cx="130" cy="130" r="104" stroke="#C9A227" strokeWidth="1.5" />
              <circle cx="130" cy="130" r="80" stroke="#C9A227" strokeWidth="1" />
            </svg>
          </div>

          <div className="relative flex flex-col items-center text-center my-auto py-10">
            <h1 className="font-serif text-[2.6rem] leading-none font-semibold tracking-[0.04em] uppercase">
              Certi-V
            </h1>
            <div className="w-16 h-[3px] bg-[#C9A227] rounded-full my-4 shadow-[0_0_10px_rgba(201,162,39,0.5)]" />
            <p className="text-[0.95rem] text-white/70 leading-relaxed max-w-xs mx-auto">
              Set a new password for your Certi-V account
            </p>
          </div>

          <div className="relative space-y-4 border-t border-white/15 pt-6 mt-10">
            <p className="text-sm text-white/60 leading-relaxed pt-4">
              Land Transportation Franchising and Regulatory Board
              <br />
              Regional Office V &middot; Bicol Region
            </p>
          </div>
        </div>

        {/* ---------- FORM PANEL ---------- */}
        <div className="bg-white px-6 py-10 md:p-12 flex flex-col justify-center">
          <div className="max-w-sm w-full mx-auto">

            {done ? (
              <>
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-[#1B7F37]/10 flex items-center justify-center">
                    <CheckCircle2 className="w-9 h-9 text-[#1B7F37]" />
                  </div>
                </div>
                <h2 className="font-serif text-2xl font-semibold text-[#0E2036] text-center">
                  Password reset
                </h2>
                <p className="mt-3 text-sm text-gray-500 leading-relaxed text-center">
                  Your password has been updated. Redirecting you to the login page&hellip;
                </p>
                <Link
                  to="/login"
                  className="mt-7 w-full py-3 bg-[#0E2036] text-white text-[15px] font-medium rounded-md hover:bg-[#152C48] transition-colors flex items-center justify-center gap-2 no-underline"
                >
                  Go to Login
                </Link>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="font-serif text-2xl font-semibold text-[#0E2036]">
                    Set a new password
                  </h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Choose a strong password you haven't used before.
                  </p>
                </div>

                {error && (
                  <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-7">
                  <div>
                    <label htmlFor="new-password" className="text-sm font-medium text-[#0E2036]">
                      New password
                    </label>
                    <PasswordInput
                      id="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      icon={Lock}
                    />
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className="text-sm font-medium text-[#0E2036]">
                      Confirm new password
                    </label>
                    <PasswordInput
                      id="confirm-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      required
                      icon={Lock}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 bg-[#0E2036] text-white text-[15px] font-medium rounded-md hover:bg-[#152C48] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset password'}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#0E2036] hover:text-[#C9A227] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                  </Link>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;