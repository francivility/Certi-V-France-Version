import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, User, LogOut, Menu, X } from 'lucide-react';
import api from '../api/axios';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('access');
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isHome = location.pathname === '/';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!token || isAuthPage) return;
    api.get('applications/notifications/')
      .then((res) => setUnread(res.data.unread_count || 0))
      .catch(() => setUnread(0));
  }, [token, isAuthPage, location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    navigate('/login');
  };

  if (isAuthPage) return null;

  const scrollTo = (id) => {
    setMobileOpen(false);
    if (!isHome) {
      navigate('/');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const guestNav = [
    { label: 'Home', action: () => scrollTo('hero') },
    { label: 'Services', action: () => scrollTo('services') },
    { label: 'About Us', action: () => scrollTo('about') },
    { label: 'Contact Us', action: () => scrollTo('contact') },
  ];

  const userNav = [
    { label: 'Home', to: '/' },
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Apply CPC', to: '/apply' },
    { label: 'My Applications', to: '/my-applications' },
    { label: 'Payments', to: '/payments' },
  ];

  return (
    <nav className="w-full bg-white border-b border-gov-gray-200 shadow-sm sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand */}
          <Link
            to={token ? '/dashboard' : '/'}
            className="flex items-center space-x-3 no-underline group min-w-0"
            onClick={() => setMobileOpen(false)}
          >
            <img src="/logo.png" alt="Certi-V Logo" className="w-12 h-12 md:w-14 md:h-14 object-contain shrink-0" />
            <div className="leading-tight truncate">
              <div style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 550, fontSize: '1.125rem' }}>
                Certi-V 
              </div>
              <p className="text-[10px] md:text-xs text-navy-900/70 uppercase tracking-widest truncate">
                LTFRB Region V
              </p>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex items-center bg-gov-gray-100 p-1.5 rounded-xl">
              {!token
                ? guestNav.map((item) => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="min-w-[4.5rem] xl:min-w-[8.5rem] whitespace-nowrap flex items-center justify-center px-3 xl:px-4 py-2.5 rounded-lg text-sm font-semibold text-navy-700/70 hover:text-navy-800 hover:bg-navy-50 transition-all cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))
                : userNav.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`min-w-[4.5rem] xl:min-w-[8.5rem] whitespace-nowrap flex items-center justify-center px-3 xl:px-4 py-2.5 rounded-lg text-sm font-semibold transition-all no-underline ${
                        location.pathname === item.to
                          ? 'bg-navy-800 text-white shadow-sm'
                          : 'text-navy-700/70 hover:text-navy-800 hover:bg-navy-50'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
            </div>

            {!token ? (
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2.5 bg-navy-800 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-navy-700 transition-all cursor-pointer whitespace-nowrap"
              >
                Log In / Register
              </button>
            ) : (
              <div className="flex items-center space-x-2.5">
                <Link
                  to="/notifications"
                  className="relative w-10 h-10 rounded-xl bg-gov-gray-100 text-navy-700 flex items-center justify-center shadow-sm hover:bg-gov-gray-200 transition-all cursor-pointer no-underline"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gov-red text-white rounded-full text-[10px] font-extrabold flex items-center justify-center border border-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </Link>
                <Link
                  to="/account"
                  className="w-10 h-10 rounded-xl bg-gov-gray-100 text-navy-700 flex items-center justify-center shadow-sm hover:bg-gov-gray-200 transition-all cursor-pointer no-underline"
                  title="Account"
                >
                  <User className="w-5 h-5" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2.5 bg-gov-gray-100 text-navy-700 rounded-xl text-sm font-semibold shadow-sm hover:bg-gov-gray-200 transition-all ml-1 cursor-pointer whitespace-nowrap"
                >
                  <span className="hidden sm:inline">Log Out</span>
                  <LogOut className="w-5 h-5 sm:hidden" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden w-11 h-11 rounded-lg bg-gov-gray-100 text-navy-800 flex items-center justify-center cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gov-gray-200 bg-white px-4 py-3 space-y-1">
          {!token
            ? guestNav.map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-navy-800 hover:text-navy-800 hover:bg-navy-50 cursor-pointer"
                >
                  {item.label}
                </button>
              ))
            : userNav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium no-underline hover:bg-navy-50 hover:text-navy-800 ${
                    location.pathname === item.to ? 'text-navy-800 bg-navy-50' : 'text-navy-800'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
          {token && (
            <Link
              to="/account"
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium no-underline hover:bg-navy-50 hover:text-navy-800 ${
                location.pathname === '/account' ? 'text-navy-800 bg-navy-50' : 'text-navy-800'
              }`}
            >
              Account
            </Link>
          )}
          <div className="pt-2 border-t border-gov-gray-200">
            {!token ? (
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2.5 bg-navy-800 text-white rounded-lg text-sm font-semibold cursor-pointer"
              >
                Log In / Register
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full py-2.5 bg-gov-gray-100 text-navy-800 rounded-lg text-sm font-semibold cursor-pointer"
              >
                Log Out
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
