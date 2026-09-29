import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  FileCheck2, Inbox, LayoutDashboard, LogOut, ShieldCheck, Menu, X, Search, FileText, History, CalendarDays, BarChart3,
} from 'lucide-react';
import { useState } from 'react';
import { getAuth, clearAuth } from '../api/auth';

const ROLE_INFO = {
  'Receiving Officer': {
    title: 'Intake & Verification',
    sub: 'Stage 1: Receiving & Validation',
    nav: [
      { to: '/receiving', label: 'Main Dashboard', icon: LayoutDashboard },
      { to: '/receiving/queue', label: 'Receiving Queue', icon: Inbox },
      { to: '/receiving/applications', label: 'Application History', icon: History },
      { to: '/receiving/search', label: 'Case Search', icon: Search },
      { to: '/receiving/reports', label: 'Reports', icon: FileText },
    ],
  },
  'CTDO': {
    title: 'Legal Validation',
    sub: 'CTDO Workspace',
    nav: [
      { to: '/ctdo', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/ctdo/queue', label: 'Validation Queue', icon: Inbox },
      { to: '/ctdo-endorsement-queue', label: 'Endorsement', icon: FileCheck2 },
      { to: '/ctdo/history', label: 'Application History', icon: History },
      { to: '/ctdo/search', label: 'Case Search', icon: Search },
      { to: '/ctdo/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  'Financial Analyst': {
    title: 'Assessment & Fees',
    sub: 'Financial Analyst Workspace',
    nav: [
      { to: '/assessment', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/assessment/queue', label: 'Assessment Queue', icon: Inbox },
      { to: '/assessment/overdue', label: 'Overdue / Expiry', icon: CalendarDays },
      { to: '/paid', label: 'Paid / Docket', icon: FileCheck2 },
      { to: '/assessment/history', label: 'Application History', icon: History },
      { to: '/assessment/search', label: 'Case Search', icon: Search },
      { to: '/assessment/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  'Cashier': {
    title: 'Payment Processing',
    sub: 'Cashier Workspace',
    nav: [
      { to: '/payment', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/payment/queue', label: 'Payment Queue', icon: Inbox },
      { to: '/payment/history', label: 'Application History', icon: History },
      { to: '/payment/search', label: 'Case Search', icon: Search },
      { to: '/payment/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  'Legal Officer': {
    title: 'Legal & Hearings',
    sub: 'Legal Officer Workspace',
    nav: [
      { to: '/legal', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/legal/schedule', label: 'Schedule', icon: CalendarDays },
      { to: '/legal/queue', label: 'Awaiting Scheduling', icon: Inbox },
      { to: '/decision-queue', label: 'Decision Draft', icon: FileCheck2 },
      { to: '/legal/history', label: 'Application History', icon: History },
      { to: '/legal/search', label: 'Case Search', icon: Search },
      { to: '/legal/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  'ORD': {
    title: 'Regional Director Approval',
    sub: 'Office of the Regional Director',
    nav: [
      { to: '/ord', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/ord/schedule', label: 'Schedule', icon: CalendarDays },
      { to: '/ord-queue', label: 'Approval Queue', icon: FileCheck2 },
      { to: '/ord/history', label: 'Application History', icon: History },
      { to: '/ord/search', label: 'Case Search', icon: Search },
      { to: '/ord/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  'Records Officer': {
    title: 'Records & Release',
    sub: 'Records Officer Workspace',
    nav: [
      { to: '/records', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/records/release-queue', label: 'Release Queue', icon: FileCheck2 },
      { to: '/records/history', label: 'Application History', icon: History },
      { to: '/records/case-search', label: 'Case Search', icon: Search },
      { to: '/records/expiry-monitor', label: 'Expiry Monitor', icon: CalendarDays },
      { to: '/records/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
};

const ROLE_INITIALS = {
  'Receiving Officer': 'ROA',
  'CTDO': 'CTDO',
  'Financial Analyst': 'FA',
  'Cashier': 'C',
  'Legal Officer': 'LO',
  'ORD': 'RD',
  'Records Officer': 'RO',
};

const ROLE_DISPLAY = {
  'CTDO': 'Chief Transportation Development Officer',
  'ORD': 'Regional Director',
};

function TmsShell({ children }) {
  const role = getAuth().role || 'Receiving Officer';
  const info = ROLE_INFO[role] || ROLE_INFO['Receiving Officer'];
  const navigate = useNavigate();
  const location = useLocation();
  // Detail/review pages carry an :applicationId route param; main/nav pages do not.
  const isDetail = !!useParams().applicationId;
  const [collapsed, setCollapsed] = useState(false); // main pages: shrink to icon rail
  const [drawerOpen, setDrawerOpen] = useState(false); // detail pages: drawer toggle

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const initials = ROLE_INITIALS[role] || 'RO';

  const handleBurger = () => {
    if (isDetail) setDrawerOpen(!drawerOpen);
    else setCollapsed(!collapsed);
  };

  const renderSidebar = (shrunk, onNavigate) => (
    <>
      <div className={`border-b border-gov-gray-100 ${shrunk ? 'px-0 py-4' : 'p-5'}`}>
        {shrunk ? (
          <div className="flex justify-center text-gold">
            <ShieldCheck className="w-5 h-5" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-navy-800 mb-1.5">
              <ShieldCheck className="w-4 h-4 text-gold" />
              <span className="text-xs font-semibold text-gov-gray-500">Workspace</span>
            </div>
            <p className="font-semibold text-navy-800">{info.title}</p>
            <p className="text-xs text-gov-gray-500">{info.sub}</p>
          </>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto custom-scrollbar">
        {info.nav.map((item) => {
          const active = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              title={shrunk ? item.label : undefined}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium no-underline border-l-2 ${
                shrunk ? 'justify-center px-0' : ''
              } ${
                active
                  ? 'bg-navy-800 text-white border-gold'
                  : 'text-gov-gray-600 border-transparent hover:bg-gov-gray-100'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!shrunk && item.label}
            </Link>
          );
        })}
      </nav>
      {!shrunk && (
        <div className="p-4 border-t border-gov-gray-100">
          <p className="text-xs text-gov-gray-400 leading-relaxed">
            &copy; {new Date().getFullYear()} LTFRB Region V
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gov-gray-100">
      {/* Top navbar */}
      <header className="sticky top-0 z-40 bg-navy-800 text-white border-b-2 border-gold/80">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="p-2 text-white/80 hover:text-white"
              onClick={handleBurger}
            >
              {isDetail && drawerOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <img src="/logo.png.png" alt="LTFRB Region V" className="w-10 h-10 object-contain" />
            <div className="leading-tight min-w-0">
              <div className="truncate" style={{ fontFamily: 'Public Sans, sans-serif', fontWeight: 550, fontSize: '1.125rem' }}>
                Certi-V
              </div>
              <div className="text-xs text-white/55 truncate">Land Transportation Franchising and Regulatory Board Region V</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 rounded-md py-1.5 pl-1.5 pr-4">
              <div className="h-8 px-2 rounded-sm bg-white/15 flex items-center justify-center font-semibold text-xs whitespace-nowrap">
                {initials}
              </div>
              <span className="text-xs font-medium whitespace-nowrap">{ROLE_DISPLAY[role] || role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-md text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {isDetail ? (
          /* Detail/review pages: hidden by default, opens as a drawer below the navbar */
          drawerOpen && (
            <div className="fixed inset-0 z-30">
              <div className="absolute inset-0 bg-navy-900/50" onClick={() => setDrawerOpen(false)}></div>
              <aside className="absolute left-0 top-16 bottom-0 w-64 bg-white shadow-lg flex flex-col">
                {renderSidebar(false, () => setDrawerOpen(false))}
              </aside>
            </div>
          )
        ) : (
          /* Main/nav pages: always pinned + visible, burger shrinks it to an icon rail */
          <aside
            className={`sticky top-16 self-start h-[calc(100vh-4rem)] bg-white border-r border-gov-gray-200 flex flex-col transition-all duration-200 ${
              collapsed ? 'w-16' : 'w-64'
            }`}
          >
            {renderSidebar(collapsed, () => {})}
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

export default TmsShell;