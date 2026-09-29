import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, User, Loader2 } from 'lucide-react';
import api from '../api/axios';
import { setAuth, clearAuth } from '../api/auth';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('accounts/staff-login/', { username, password });
      setAuth({ access: res.data.access, refresh: res.data.refresh, role: res.data.role, name: res.data.name });
      const roleRoutes = {
        'Receiving Officer': '/receiving',
        'CTDO': '/ctdo',
        'Financial Analyst': '/assessment',
        'Cashier': '/payment',
        'Legal Officer': '/legal',
        'ORD': '/ord-queue',
        'Records Officer': '/records',
      };
      const route = roleRoutes[res.data.role];
      if (!route) {
        setError('Access restricted to LTFRB staff accounts.');
        clearAuth();
        setIsLoading(false);
        return;
      }
      navigate(route);
    } catch {
      setError('Invalid username or password.');
      setIsLoading(false);
    }
  };

  const inputBase =
    'w-full bg-white border border-gov-gray-300 rounded-md py-3 pl-11 pr-4 text-sm text-gov-gray-800 placeholder-gov-gray-400 focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-colors';

  return (
    <div className="min-h-screen bg-gov-gray-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png.png" alt="LTFRB Region V" className="w-20 h-20 object-contain mb-4" />
          <span className="font-serif font-semibold text-2xl text-navy-800 text-center leading-tight">
            Certi-V: LTFRB Region V
          </span>
          <p className="text-sm text-gov-gray-500 mt-1.5">Transaction Monitoring System</p>
        </div>

        <div className="bg-white border border-gov-gray-200 rounded-lg overflow-hidden relative">
          <div className="h-1 bg-gold" />

          {/* Seal watermark, subtle */}
          <svg
            width="180" height="180" viewBox="0 0 180 180" fill="none"
            className="absolute -right-10 -top-6 opacity-[0.04] pointer-events-none"
          >
            <circle cx="90" cy="90" r="88" stroke="#0E2036" strokeWidth="2" />
            <circle cx="90" cy="90" r="70" stroke="#0E2036" strokeWidth="1.5" />
            <circle cx="90" cy="90" r="52" stroke="#0E2036" strokeWidth="1" />
          </svg>

          <div className="relative p-8 md:p-10">
            <div className="flex flex-col items-center text-center mb-7">
              <div className="w-14 h-14 rounded-full bg-navy-800 ring-4 ring-gold/25 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-gold" />
              </div>
              <h2 className="font-serif text-3xl font-semibold text-navy-800">
                Staff Sign-in
              </h2>
              <p className="text-sm text-gov-gray-500 mt-2 max-w-[280px]">
                Sign in with your assigned LTFRB staff credentials.
              </p>
            </div>

            <div className="flex items-center gap-3 mb-7">
              <div className="h-px flex-1 bg-gov-gray-200" />
              <div className="w-1.5 h-1.5 rotate-45 bg-gold" />
              <div className="h-px flex-1 bg-gov-gray-200" />
            </div>

            {error && (
              <div className="mb-5 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-md px-4 py-3 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gov-gray-400" />
                <input className={inputBase} placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gov-gray-400" />
                <input className={inputBase} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 bg-navy-800 text-white text-sm font-semibold rounded-md hover:bg-navy-700 transition-colors flex items-center justify-center disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Log in'}
              </button>
            </form>
          </div>

          <div className="relative px-8 md:px-10 py-4 bg-gov-gray-50 border-t border-gov-gray-200 flex items-center justify-center gap-1.5 text-xs text-gov-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-navy-800" />
            LTFRB Region V internal staff only
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;