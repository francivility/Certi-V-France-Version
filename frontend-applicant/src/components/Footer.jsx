import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ExternalLink, ShieldCheck, ChevronRight } from 'lucide-react';

const CPC_TYPES = [
  'Truck for Hire',
  'Shuttle Bus',
  'TNVS',
  'UV Express',
  'Public Utility Jeepney',
  'Taxi',
  'Tourist Transport Service',
  'School Shuttle Service',
  'Public Utility Bus',
];

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-navy-900 text-white">
      <div className="w-full px-6 md:px-12 lg:px-20 pt-10 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">

          {/* Brand Column */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="Certi-V Logo" className="w-11 h-11 object-contain" />
              <div>
                <h3 className="font-bold text-white text-base leading-tight">Certi-V</h3>
                <p className="text-[10px] text-navy-300 uppercase tracking-widest">LTFRB Region V</p>
              </div>
            </div>
            <p className="text-navy-300 text-sm leading-relaxed">
              Digital processing engine for Certificate of Public Convenience applications in the Bicol Region.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-wider text-white">Quick Links</h4>
            <ul className="space-y-2">
              {[
                { label: 'Home', to: '/' },
                { label: 'Apply for CPC', to: '/register' },
                { label: 'My Applications', to: '/login' },
                { label: 'Track Status', to: '/login' },
                { label: 'Dashboard', to: '/login' },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="text-navy-300 text-sm hover:text-white transition-colors no-underline flex items-center gap-2 group"
                  >
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* CPC Types */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-wider text-white">
              Application for New CPC
              <span className="block text-navy-400 font-normal text-xs mt-1 normal-case tracking-normal">Denomination / CPC Types</span>
            </h4>
            <ul className="space-y-1.5">
              {CPC_TYPES.map((type) => (
                <li key={type}>
                  <span className="text-navy-300 text-sm flex items-center gap-2">
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {type}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-wider text-white">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-navy-300">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-navy-400" />
                <span>LTFRB Regional Office No. 5, Legazpi City, Albay, Philippines</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-navy-300">
                <Phone className="w-4 h-4 shrink-0 text-navy-400" />
                <span>(052) 480-0000</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-navy-300">
                <Mail className="w-4 h-4 shrink-0 text-navy-400" />
                <span>region5@ltfrb.gov.ph</span>
              </li>
            </ul>
            <a
              href="https://www.ltfrb.gov.ph"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-gov-blue-light hover:text-white transition-colors no-underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Visit LTFRB Website
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-navy-700/50">
        <div className="w-full px-6 md:px-12 lg:px-20 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-navy-400">
            <ShieldCheck className="w-4 h-4" />
            <span>&copy; {currentYear} LTFRB Region V &mdash; Certi-V. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-navy-400">
            <a href="#" className="hover:text-white transition-colors no-underline">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors no-underline">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors no-underline">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
