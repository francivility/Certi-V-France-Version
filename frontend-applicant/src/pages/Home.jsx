import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Phone, ShieldCheck, Cpu, UserPlus, IdCard, ClipboardList, UploadCloud } from 'lucide-react';
import Footer from '../components/Footer';
import { cpcImageFor } from '../config/cpcTypes';
import api from '../api/axios';

// Reusable seal-ring watermark, consistent with Login/Register
function SealWatermark({ className }) {
  return (
    <svg width="320" height="320" viewBox="0 0 320 320" fill="none" className={className}>
      <circle cx="160" cy="160" r="158" stroke="#C9A227" strokeWidth="2" />
      <circle cx="160" cy="160" r="128" stroke="#C9A227" strokeWidth="1.5" />
      <circle cx="160" cy="160" r="98" stroke="#C9A227" strokeWidth="1" />
    </svg>
  );
}

function Home() {
  const token = localStorage.getItem('access');
  const [services, setServices] = useState([]);

  useEffect(() => {
    api.get('cpc-types/')
      .then((res) => setServices(res.data))
      .catch(() => setServices([]));
  }, []);
  return (
    <div className="w-full mx-auto">
      <div className="w-full flex flex-col gap-24">

        {/* HERO */}
        <section
          id="hero"
          className="relative min-h-[85vh] text-white rounded-2xl p-12 md:p-20 flex flex-col justify-center items-center text-center overflow-hidden"
          style={{
            backgroundImage: "linear-gradient(rgba(14,32,54,0.72), rgba(14,32,54,0.88)), url('/hero.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <SealWatermark className="absolute -right-16 -bottom-16 opacity-[0.05]" />
          <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />

          <div className="relative z-10 max-w-4xl flex flex-col items-center space-y-6">
            <h1 className="font-serif text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.15]">
              Online <span className="text-[#C9A227]">Application and Processing</span>
              <br />
              For Public Convenience
            </h1>

            <p className="text-white/75 max-w-2xl mx-auto text-lg font-medium">
              In accordance to the <strong className="text-white">Anti-Red Tape Authority (RA 11032),</strong> minimizing delays and maximizing efficiency in doing business transactions with Land Transportation Franchising and Regulatory Board Region V 
            </p>

            {token ? (
              <Link
                to="/apply"
                className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-white text-[#0E2036] font-semibold rounded-md text-base hover:bg-gray-100 transition-colors no-underline"
              >
                Apply Now <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-[#0E2036] font-semibold rounded-md text-sm hover:bg-gray-100 transition-colors no-underline"
                >
                  Register now <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-8 py-3.5 bg-white/10 border border-white/25 text-white font-semibold rounded-md text-sm hover:bg-white/20 transition-colors no-underline"
                >
                  Log in
                </Link>
              </div>
            )}
          </div>
        </section>

                {/* HOW IT WORKS */}
        <section id="how-it-works" className="w-full px-4 md:px-12">
          <div className="text-center mb-16">
            <span className="px-3 py-1.5 bg-[#C9A227]/10 text-[#C9A227] rounded-md text-xs font-semibold inline-block mb-4 tracking-wide uppercase">
              Application process
            </span>
            <h2 className="font-serif text-3xl md:text-5xl font-extrabold text-[#0E2036] leading-tight">
              How It Works
            </h2>
            <p className="text-gray-500 text-sm md:text-base mt-4 max-w-xl mx-auto">
              From creating your account to submitting your requirements — here's what the process looks like.
            </p>
          </div>

          <div className="relative max-w-6xl mx-auto">
            {/* Animated connecting line — desktop only */}
            <div className="hidden lg:block absolute top-9 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-[#C9A227]/40 to-transparent" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
              {[
                {
                  step: '01',
                  icon: UserPlus,
                  title: 'Create Your Account',
                  desc: 'Sign up with your basic account credentials to get started with your application.',
                },
                {
                  step: '02',
                  icon: IdCard,
                  title: 'Verify Your Identity',
                  desc: 'Complete your applicant profile and confirm your identity through facial and ID verification.',
                },
                {
                  step: '03',
                  icon: ClipboardList,
                  title: 'Choose Denomination & Prepare Documents',
                  desc: 'Select your CPC type, review the requirements, and prepare the necessary documents.',
                },
                {
                  step: '04',
                  icon: UploadCloud,
                  title: 'Submit & Track Application',
                  desc: 'Upload your requirements and monitor your application status every step of the way.',
                },
              ].map(({ step, icon: Icon, title, desc }) => (
                <div
                  key={step}
                  className="group relative flex flex-col items-center text-center bg-white border border-gray-200 rounded-xl p-6 pt-10 hover:border-[#C9A227]/60 hover:shadow-lg hover:shadow-[#C9A227]/10 hover:-translate-y-1.5 transition-all duration-300 cursor-default"
                >
                  <div className="relative z-10 w-[72px] h-[72px] rounded-full bg-gradient-to-br from-[#0E2036] to-[#152C48] group-hover:from-[#C9A227] group-hover:to-[#e0b830] flex items-center justify-center shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-[#C9A227]/40">
                    <Icon className="w-7 h-7 text-white transition-transform duration-300 group-hover:scale-110" />
                    <span className="absolute -top-2 -right-1 w-6 h-6 rounded-full bg-[#C9A227] text-[#0E2036] text-[10px] font-bold flex items-center justify-center border-2 border-white group-hover:bg-[#0E2036] group-hover:text-[#C9A227] transition-colors duration-300">
                      {step}
                    </span>
                  </div>
                  <h4 className="font-serif text-base font-bold text-[#0E2036] mt-5 leading-snug transition-colors duration-300 group-hover:text-[#C9A227]">
                    {title}
                  </h4>
                  <p className="text-gray-500 text-xs md:text-sm mt-2 leading-relaxed max-w-[220px]">
                    {desc}
                  </p>
                  <div className="mt-4 h-0.5 w-8 bg-gray-200 rounded-full group-hover:w-12 group-hover:bg-[#C9A227] transition-all duration-300" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" className="w-full px-4 md:px-12">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-5xl font-extrabold text-[#0E2036] leading-tight">
              About Certi-V: <br />
              <span className="text-[#0E2036]/60 font-serif italic">Purpose & System Overview</span>
            </h2>
          </div>

          <div className="flex flex-col space-y-8 max-w-5xl mx-auto">
            {/* What is Certi-V */}
            <div className="bg-white border border-gray-200 rounded-xl p-10 md:p-14 flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1 space-y-5">
                <span className="px-3 py-1.5 bg-[#0E2036]/5 text-[#0E2036] rounded-md text-xs font-semibold inline-block">
                  System identity
                </span>
                <h3 className="font-serif text-3xl font-bold text-[#0E2036] leading-tight">
                  What is Certi-V <br />All About?
                </h3>
                <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                  Certi-V is an online processing website developed for LTFRB Region V. It digitizes the process of applying for a Certificate of Public Convenience (CPC) for a smoother, more efficient, and less-hassle mode of application. 
                </p>
              </div>
              <div className="w-full md:w-5/12 h-56 bg-[#0E2036]/5 rounded-xl border border-[#0E2036]/10 flex items-center justify-center relative overflow-hidden">
                <ShieldCheck className="w-20 h-20 text-[#0E2036]/15" />
                <div className="absolute bottom-6 left-6 bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200">
                  <span className="block text-xl font-bold text-[#0E2036]">LTFRB</span>
                  <span className="text-[10px] font-medium text-gray-500">Region V Engine</span>
                </div>
              </div>
            </div>

            {/* Core Purpose */}
            <div className="bg-white border border-gray-200 rounded-xl p-10 md:p-14 flex flex-col md:flex-row-reverse items-center gap-10">
              <div className="flex-1 space-y-5">
                <span className="px-3 py-1.5 bg-[#0E2036]/5 text-[#0E2036] rounded-md text-xs font-semibold inline-block">
                  Primary mission
                </span>
                <h3 className="font-serif text-3xl font-bold text-[#0E2036] leading-tight">
                  Our Core Purpose <br />& Objectives
                </h3>
                <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                  Following the <strong className="text-[#0E2036]">Ease of Doing Business</strong>  Certi-V aims to digitize the process of applying for Certificate of Public Convenience to all the constituents of Land Transportation Franchising and Regulatory Board Region V. By streamlining its processes, Certi-V offers online application and processing with up-to-date statuses and secure operations.
                </p>
              </div>
              <div className="w-full md:w-5/12 h-56 bg-[#0E2036]/5 rounded-xl border border-[#0E2036]/10 flex items-center justify-center relative overflow-hidden">
                <Cpu className="w-20 h-20 text-[#0E2036]/15" />
                <div className="absolute top-6 right-6 bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200 text-right">
                  <span className="block text-2xl font-bold text-[#0E2036]">100%</span>
                  <span className="text-[10px] font-medium text-gray-500">Digital Workflow</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section id="services" className="relative w-full py-20 bg-white border-y border-gray-200 rounded-2xl px-8 md:px-16 overflow-hidden">
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 py-4">
            {services.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-gray-500 w-full">
                Loading available CPC types&hellip;
              </p>
            ) : (
              services.map((category, idx) => (
                <Link
                  key={category.id}
                  to={token ? `/apply?type=${encodeURIComponent(category.type_name)}` : '/login'}
                  className="min-w-[280px] md:min-w-[320px] h-[380px] snap-center border border-gray-200 rounded-xl p-6 flex flex-col justify-between shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 group relative overflow-hidden no-underline"
                  style={{
                    backgroundImage: `url(${cpcImageFor(category.type_name)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {/* Dark overlay for text readability */}
                  <div className="absolute inset-0 bg-black/50 z-0"></div>

                  <div className="relative z-10">
                    <span className="text-[10px] font-semibold text-white uppercase tracking-wide bg-[#0E2036]/85 px-2.5 py-1 rounded-md border border-white/15">
                      {String(idx + 1).padStart(2, '0')} CPC Type
                    </span>
                    <h4 className="font-serif text-2xl font-bold text-white mt-4 leading-snug drop-shadow-lg">
                      {category.type_name}
                    </h4>
                    <p className="text-xs text-white/80 mt-2 drop-shadow-md line-clamp-2">
                      {category.description || `Franchise application for ${category.type_name}.`}
                    </p>
                  </div>

                  <div className="flex justify-end items-center pt-2 relative z-10">
                    <span className="w-10 h-10 rounded-md bg-white text-[#0E2036] flex items-center justify-center shadow-sm group-hover:bg-[#C9A227] group-hover:text-white transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="text-center px-4">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#0E2036] mb-8">Let's Get In Touch</h2>
          <p className="text-gray-500 text-sm mb-10 max-w-xl mx-auto">
            For inquiries about your CPC application, contact the LTFRB Regional Office No. 5.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-10 py-4 bg-[#0E2036] text-white font-semibold rounded-md text-base hover:bg-[#152C48] transition-colors no-underline"
          >
            <Phone className="w-4 h-4 mr-3" /> Contact Regional Office
          </Link>
        </section>

      </div>

      <div className="mt-20">
        <Footer />
      </div>
    </div>
  );
}

export default Home;