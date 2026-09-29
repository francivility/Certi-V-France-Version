import RoleReports from './RoleReports';

export default function PaymentReports() {
  return (
    <RoleReports
      endpoint="payments/payment-reports/"
      title="Cashier Reports"
      subtitle="Collected payments by method, denomination, and duration."
      totalLabel="Total Payments Collected"
      totalSub="Verified payments received"
      printTitle="Cashier Summary Report"
      printSubtitle="Cashier &middot; LTFRB Region V"
      footerNote="Reports include all collected payments (online and cash). Use Print / Export to generate a copy."
    />
  );
}
