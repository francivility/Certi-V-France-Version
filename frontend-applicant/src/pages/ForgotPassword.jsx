import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import api from '../api/axios';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await api.post('accounts/password-reset/request/', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send the reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F2F3F1] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl grid md:grid-cols-[1.05fr_1fr] shadow-2xl rounded-lg overflow-hidden">

        <div
          className="relative bg-[#0E2036] text-white px-8 py-10 md:p-12 flex flex-col justify-between overflow-hidden"
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
              Recover access to your CPC application account
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

        <div className="bg-white px-8 py-10 md:p-12 flex flex-col justify-center">
          <div className="max-w-sm w-full mx-auto">
            {sent ? (
              <>
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-[#1B7F37]/10 flex items-center justify-center">
                    <CheckCircle2 className="w-9 h-9 text-[#1B7F37]" />
                  </div>
                </div>
                <h2 className="font-serif text-2xl font-semibold text-[#0E2036] text-center">
                  Check your email
                </h2>
                <p className="mt-3 text-sm text-gray-500 leading-relaxed text-center">
                  If an account with <strong className="text-[#0E2036]">{email}</strong> exists,
                  we have sent a password reset link to it.
                </p>
                <p className="mt-4 text-xs text-gray-400 leading-relaxed text-center">
                  The link expires in 24 hours. Check your spam folder if you don't see it.
                </p>
                <Link
                  to="/login"
                  className="mt-7 w-full py-3 bg-[#0E2036] text-white text-[15px] font-medium rounded-md hover:bg-[#152C48] transition-colors flex items-center justify-center gap-2 no-underline"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </Link>
              </>
            ) : (
              <>
                <h2 className="font-serif text-2xl font-semibold text-[#0E2036]">
                  Forgot password?
                </h2>
                <p className="mt-1.5 text-sm text-gray-500">
                  Enter the email associated with your account.
                </p>

                {error && (
                  <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                  <div>
                    <label htmlFor="email" className="text-sm font-medium text-[#0E2036]">
                      Email
                    </label>
                    <div className="mt-1.5 relative">
                      <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-transparent border-b border-gray-300 pl-6 pr-1 py-2 text-[15px] text-[#0E2036] placeholder-gray-400 focus:outline-none focus:border-[#C9A227] transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 bg-[#0E2036] text-white text-[15px] font-medium rounded-md hover:bg-[#152C48] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send reset link'}
                  </button>
                </form>

                <p className="mt-7 text-sm text-gray-500">
                  <Link to="/login" className="text-[#0E2036] font-medium hover:text-[#C9A227] transition-colors">
                    &larr; Back to Login
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;