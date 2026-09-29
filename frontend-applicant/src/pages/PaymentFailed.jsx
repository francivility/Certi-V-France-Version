import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, RefreshCcw } from 'lucide-react';

function PaymentFailed() {
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get('application_id');

  return (
    <div className="min-h-screen w-full bg-[#F2F3F1] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-8 md:p-10 text-center">

          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
          </div>

          <h2 className="font-serif text-2xl font-semibold text-[#0E2036]">
            Payment was not completed
          </h2>

          <p className="mt-3 text-sm text-gray-500 leading-relaxed">
            Your payment was cancelled, or Xendit reported that the transaction could not be
            completed. No charge was made to your account.
          </p>

          <div className="mt-6 rounded-lg bg-[#0E2036]/5 border border-[#0E2036]/10 px-4 py-3 text-left">
            <p className="text-xs text-[#0E2036]/80 leading-relaxed">
              You can try again from your bill page. If the problem persists, you may also pay
              in cash at the LTFRB Regional Office cashier.
            </p>
          </div>

          {applicationId ? (
            <Link
              to={`/pay/${applicationId}`}
              className="mt-7 w-full py-3 bg-[#0E2036] text-white text-[15px] font-medium rounded-md hover:bg-[#152C48] transition-colors flex items-center justify-center gap-2 no-underline"
            >
              <RefreshCcw className="w-4 h-4" /> Try again
            </Link>
          ) : (
            <Link
              to="/payments"
              className="mt-7 w-full py-3 bg-[#0E2036] text-white text-[15px] font-medium rounded-md hover:bg-[#152C48] transition-colors flex items-center justify-center gap-2 no-underline"
            >
              Go to my payments <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          <p className="mt-4 text-xs text-gray-400">
            Need help? Contact the LTFRB Regional Office.
          </p>

        </div>
      </div>
    </div>
  );
}

export default PaymentFailed;