/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Loader2, Receipt, AlertCircle } from 'lucide-react';
import api from '../api/axios';

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get('application_id');

  const [status, setStatus] = useState('checking');
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!applicationId) {
      setStatus('error');
      setError('No application ID in the URL.');
      return;
    }

    let attempts = 0;
    const maxAttempts = 10;

    const check = async () => {
      try {
        const res = await api.get(`payments/xendit/status/${applicationId}/`);
        const s = res.data.status;
        setDetails(res.data);
        if (s === 'PAID' || s === 'SETTLED') {
          setStatus('paid');
          return;
        }
        if (attempts >= maxAttempts) {
          setStatus('pending');
          return;
        }
        attempts += 1;
        setTimeout(check, 2500);
      } catch (err) {
        setStatus('error');
        setError(err.response?.data?.error || 'Could not verify payment status.');
      }
    };

    check();
  }, [applicationId]);

  return (
    <div className="min-h-screen w-full bg-[#F2F3F1] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-8 md:p-10 text-center">

          {status === 'checking' && (
            <>
              <div className="flex items-center justify-center mb-6">
                <Loader2 className="w-12 h-12 text-[#C9A227] animate-spin" />
              </div>
              <h2 className="font-serif text-2xl font-semibold text-[#0E2036]">
                Confirming your payment
              </h2>
              <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                Please wait while we confirm your payment with Xendit. Do not close this page.
              </p>
            </>
          )}

          {status === 'paid' && (
            <>
              <div className="flex items-center justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-[#1B7F37]/10 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-[#1B7F37]" />
                </div>
              </div>
              <h2 className="font-serif text-2xl font-semibold text-[#0E2036]">
                Payment received
              </h2>
              <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                Your online payment has been confirmed. Your official receipt will be shown on
                your bill page.
              </p>

              {details?.or_number && (
                <div className="mt-6 rounded-lg bg-[#0E2036]/5 border border-[#0E2036]/10 px-4 py-3 text-left">
                  <p className="flex items-center gap-2 text-xs text-[#0E2036]/80 leading-relaxed">
                    <Receipt className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
                    <span>
                      <strong>OR Number:</strong> {details.or_number}
                      <br />
                      <strong>Reference:</strong> {details.reference_no || '—'}
                    </span>
                  </p>
                </div>
              )}

              <Link
                to={`/pay/${applicationId}`}
                className="mt-7 w-full py-3 bg-[#0E2036] text-white text-[15px] font-medium rounded-md hover:bg-[#152C48] transition-colors flex items-center justify-center gap-2 no-underline"
              >
                View my bill <ArrowRight className="w-4 h-4" />
              </Link>

              <p className="mt-4 text-xs text-gray-400">
                You'll also see this on your Payments page.
              </p>
            </>
          )}

          {status === 'pending' && (
            <>
              <div className="flex items-center justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center">
                  <AlertCircle className="w-12 h-12 text-amber-500" />
                </div>
              </div>
              <h2 className="font-serif text-2xl font-semibold text-[#0E2036]">
                Payment still pending
              </h2>
              <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                We haven't received confirmation from Xendit yet. This can happen if you closed
                the checkout page before finishing, or if the payment is still processing.
              </p>
              <p className="mt-3 text-xs text-gray-400 leading-relaxed">
                Try checking your bill again in a minute. If you were charged but don't see it
                reflected, contact the LTFRB cashier with your reference number.
              </p>
              <Link
                to={`/pay/${applicationId}`}
                className="mt-7 w-full py-3 bg-[#0E2036] text-white text-[15px] font-medium rounded-md hover:bg-[#152C48] transition-colors flex items-center justify-center gap-2 no-underline"
              >
                Check my bill <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex items-center justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertCircle className="w-12 h-12 text-red-500" />
                </div>
              </div>
              <h2 className="font-serif text-2xl font-semibold text-[#0E2036]">
                Something went wrong
              </h2>
              <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                {error || 'We could not confirm your payment status.'}
              </p>
              <Link
                to="/payments"
                className="mt-7 w-full py-3 bg-[#0E2036] text-white text-[15px] font-medium rounded-md hover:bg-[#152C48] transition-colors flex items-center justify-center gap-2 no-underline"
              >
                Back to payments <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default PaymentSuccess;