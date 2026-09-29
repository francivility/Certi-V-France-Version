import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { User, Lock, Loader2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import api from '../api/axios';
import PasswordInput from '../components/PasswordInput';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = location.state?.registered === true;

  useEffect(() => {
    if (location.state?.registered) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('accounts/login/', { username, password });
      localStorage.setItem('access', res.data.access);
      localStorage.setItem('refresh', res.data.refresh);
      setTimeout(() => navigate('/'), 500);
    } catch {
      setError('Invalid username or password.');
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('accounts/google/', {
        credential: credentialResponse.credential,
      });

      if (res.data.mode === 'login') {
        localStorage.setItem('access', res.data.access);
        localStorage.setItem('refresh', res.data.refresh);
        navigate('/');
      } else if (res.data.mode === 'register') {
        localStorage.setItem('access', res.data.access);
        localStorage.setItem('register_code', res.data.code);
        navigate('/register');
      } else {
        setIsLoading(false);
        setError('Unexpected response from server.');
      }
    } catch (err) {
      setIsLoading(false);
      setError(err.response?.data?.error || 'Google sign-in failed.');
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
              Online application for Certificate of Public Convenience &mdash; Bicol Region
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
            <h2 className="font-serif text-2xl font-semibold text-[#0E2036]">
              Log in
            </h2>
            <p className="mt-1.5 text-sm text-gray-500">
              Enter your credentials to access your account.
            </p>

            {error && (
              <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {justRegistered && (
              <div className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Registration successful. Please log in to continue.
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div>
                <label htmlFor="username" className="text-sm font-medium text-[#0E2036]">
                  Username
                </label>
                <div className="mt-1.5 relative">
                  <User className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full bg-transparent border-b border-gray-300 pl-6 pr-1 py-2 text-[15px] text-[#0E2036] placeholder-gray-400 focus:outline-none focus:border-[#C9A227] transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-[#0E2036]">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-[#0E2036] hover:text-[#C9A227] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  icon={Lock}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 bg-[#0E2036] text-white text-[15px] font-medium rounded-md hover:bg-[#152C48] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log in'}
              </button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-gray-400">
                    or sign in with Google
                  </span>
                </div>
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google sign-in failed.')}
                  width="320"
                  text="signin_with"
                  shape="rectangular"
                  theme="outline"
                  size="large"
                  locale="en"
                />
              </div>
            </form>

            <p className="mt-7 text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#0E2036] font-medium hover:text-[#C9A227] transition-colors">
                Register
              </Link>
            </p>
            <p className="mt-2 text-sm">
              <Link to="/" className="text-gray-400 hover:text-gray-600 transition-colors">
                &larr; Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;