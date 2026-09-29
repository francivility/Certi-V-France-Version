import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCheck, Loader2, PhilippinePeso, Printer, Receipt,
} from 'lucide-react';
import api from '../api/axios';
import ApplicantDetailCard from '../components/ApplicantDetailCard';

const fmt = (n) => parseFloat(n).toLocaleString('en-PH', { minimumFractionDigits: 2 });

function AssessmentReview() {
  const { applicationId } = useParams();
  const [fees, setFees] = useState([]);
  const [application, setApplication] = useState(null);
  const [selectedFees, setSelectedFees] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const [issuedSoa, setIssuedSoa] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('payments/fees/').then((res) => setFees(res.data));
    api.get(`applications/${applicationId}/detail/`)
      .then((res) => setApplication(res.data))
      .catch(() => {});
  }, [applicationId]);

  const toggleFee = (feeId) => {
    setSelectedFees((prev) =>
      prev.includes(feeId) ? prev.filter((id) => id !== feeId) : [...prev, feeId]
    );
  };

  const subtotal = fees
    .filter((f) => selectedFees.includes(f.id))
    .reduce((sum, f) => sum + parseFloat(f.amount) * (quantities[f.id] || 1), 0);

  const changeQty = (fee, delta) => {
    setQuantities((prev) => {
      const current = prev[fee.id] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [fee.id]: next };
    });
  };

  // Fees without quantity buttons first, then the rest by amount (cheapest first).
  const sortedFees = [...fees].sort((a, b) => {
    if (!!a.allow_quantity !== !!b.allow_quantity) return a.allow_quantity - b.allow_quantity;
    return parseFloat(a.amount) - parseFloat(b.amount);
  });

  const handleIssue = async () => {
    setError('');
    setIssuing(true);
    try {
      const res = await api.post(`payments/issue-soa/${applicationId}/`, {
        fee_ids: selectedFees,
        quantities,
      });
      setIssuedSoa(res.data);
      setMessage('Payment Order Slip (POS) issued successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not issue SOA.');
    } finally {
      setIssuing(false);
    }
  };

  const handleForwardToCashier = async () => {
    setError('');
    setForwarding(true);
    try {
      await api.post(`payments/forward-to-cashier/${applicationId}/`);
      setMessage('Forwarded to Cashier successfully.');
      setTimeout(() => navigate('/assessment'), 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not forward to Cashier.');
      setForwarding(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full">
      <div className="px-5 sm:px-8 lg:px-12 pt-8">
        <Link
          to="/assessment/queue"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-gov-gray-200 text-sm font-medium text-navy-800 hover:border-gold hover:text-gold transition-colors no-underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Assessment Queue
        </Link>
      </div>

      <div className="w-full px-5 sm:px-8 lg:px-12 py-8 max-w-[86rem] mx-auto">
        <div className="mb-6">
          <h2 className="font-serif text-3xl font-semibold text-navy-800">Fee Assessment</h2>
        <p className="text-gov-gray-500 text-sm mt-1">
          Select the applicable fees and issue the Payment Order Slip (POS) for the Cashier.
        </p>
      </div>

      {message && (
        <div className="mb-6 bg-gov-green-light border border-gov-green/30 text-gov-green rounded-md px-4 py-3 text-sm font-medium">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-6 bg-gov-red-light border border-gov-red/30 text-gov-red rounded-md px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_310px] xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
        {issuedSoa ? (
          <div className="bg-white border border-gov-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
                <Receipt className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-800 text-base">Payment Order Slip (POS)</h3>
                <p className="text-xs text-gov-gray-500">Control # {issuedSoa.control_number}</p>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-6">
                <Field label="Operator Name" value={issuedSoa.operator_name || 'N/A'} />
                <Field label="Denomination" value={issuedSoa.denomination} />
                <Field label="Plate Number" value={issuedSoa.plate_number || 'N/A'} />
                <Field label="Nature of Collection" value={issuedSoa.nature_of_collection} />
                <Field label="Date Applied" value={new Date(issuedSoa.date_applied).toLocaleString()} />
                <Field label="Expiry Date" value={new Date(issuedSoa.expiry_date).toLocaleDateString()} />
                <Field label="Assessed By" value={issuedSoa.assessed_by || 'N/A'} />
              </div>

              <div className="overflow-x-auto rounded-lg border border-gov-gray-200">
                <table className="w-full text-left border-collapse min-w-[420px]">
                  <thead>
                    <tr className="border-b border-gov-gray-200 bg-gov-gray-50/60">
                      <th className="p-4 text-xs font-semibold text-gov-gray-500">Fee Name</th>
                      <th className="p-4 text-xs font-semibold text-gov-gray-500 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issuedSoa.items.map((item) => (
                      <tr key={item.id} className="border-b border-gov-gray-100">
                        <td className="p-4 font-semibold text-navy-800 text-sm">
                          {item.fee_name}
                          {item.quantity > 1 && (
                            <span className="ml-1.5 text-xs font-semibold text-gov-gray-400">× {item.quantity}</span>
                          )}
                        </td>
                        <td className="p-4 text-right font-medium text-gov-gray-600">P{fmt(item.amount)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="p-4 font-semibold text-navy-800">Grand Total</td>
                      <td className="p-4 text-right font-semibold text-navy-800 text-lg">P{fmt(issuedSoa.total_amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gov-gray-100 text-gov-gray-700 rounded-md text-sm font-semibold hover:bg-gov-gray-200 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print POS
                </button>
                <button
                  onClick={handleForwardToCashier}
                  disabled={forwarding}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-navy-800 text-white text-sm font-semibold rounded-md hover:bg-navy-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {forwarding ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCheck className="w-5 h-5" /> Forward to Cashier</>}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gov-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 md:px-8 py-5 bg-gov-gray-50 border-b border-gov-gray-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-navy-800/5 flex items-center justify-center text-navy-800">
                <PhilippinePeso className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-800 text-base">Select Fees</h3>
                <p className="text-xs text-gov-gray-500">Tick every fee that applies to this CPC application</p>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="space-y-3">
                {sortedFees.map((fee) => {
                  const isSelected = selectedFees.includes(fee.id);
                  const qty = quantities[fee.id] || 1;
                  const lineAmount = parseFloat(fee.amount) * qty;
                  return (
                    <div
                      key={fee.id}
                      className={`w-full flex items-center justify-between gap-3 px-5 py-4 rounded-lg border transition-colors ${
                        isSelected
                          ? 'border-navy-800 bg-gov-blue-light/40'
                          : 'border-gov-gray-200 hover:border-gold'
                      }`}
                    >
                      <div
                        className="flex items-center gap-3 cursor-pointer select-none min-w-0"
                        onClick={() => toggleFee(fee.id)}
                      >
                        <span
                          className={`w-7 h-7 rounded-md border-[2.5px] flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? 'bg-gov-green border-gov-green' : 'bg-white border-navy-800 hover:border-navy-800 hover:bg-navy-50'
                          }`}
                        >
                          {isSelected && <CheckCheck className="w-5 h-5 text-white" strokeWidth={3} />}
                        </span>
                        <span className="font-semibold text-navy-800 text-sm">{fee.fee_name}</span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {fee.allow_quantity && (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[9px] font-semibold text-gov-gray-400">Qty</span>
                            <div className="flex items-center gap-1 rounded-md border border-gov-blue bg-white px-0.5 py-0.5">
                              <button
                                type="button"
                                onClick={() => changeQty(fee, -1)}
                                disabled={qty <= 1}
                                className="w-7 h-7 rounded-sm bg-gov-blue text-white text-sm font-semibold leading-none hover:bg-gov-blue-dark transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>
                              <span className="w-8 text-center font-semibold text-navy-800 text-xs">{qty}</span>
                              <button
                                type="button"
                                onClick={() => changeQty(fee, 1)}
                                className="w-7 h-7 rounded-sm bg-gov-blue text-white text-sm font-semibold leading-none hover:bg-gov-blue-dark transition-colors cursor-pointer"
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
                        <span className="font-semibold text-gov-gray-600 w-28 text-right">
                          {fee.allow_quantity && isSelected ? `P${fmt(lineAmount)}` : `P${fmt(fee.amount)}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gov-gray-50 border border-gov-gray-200 rounded-lg px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold text-gov-gray-400">Selected Fees</p>
                  <p className="text-xl font-semibold text-navy-800">P{fmt(subtotal)}</p>
                </div>
                <button
                  onClick={handleIssue}
                  disabled={selectedFees.length === 0 || issuing}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-navy-800 text-white text-sm font-semibold rounded-md hover:bg-navy-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Issue SOA / POS
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-6">
          {application ? (
            <ApplicantDetailCard
              application={application}
              statusCls="bg-gov-amber-light text-gov-amber"
              statusText="Pending Assessment"
            />
          ) : (
            <div className="bg-white border border-gov-gray-200 rounded-xl p-6">
              <p className="text-sm text-gov-gray-500">Loading application details...</p>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gov-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-navy-800">{value}</p>
    </div>
  );
}

export default AssessmentReview;