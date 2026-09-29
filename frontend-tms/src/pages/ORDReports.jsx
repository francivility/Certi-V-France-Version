import RoleReports from './RoleReports';

export default function ORDReports() {
  return (
    <RoleReports
      endpoint="legal/ord-reports/"
      title="ORD Reports"
      subtitle="Finalized Decision/Orders by status, denomination, and duration."
      totalLabel="Total Finalized Decision/Orders"
      totalSub="Decision/Orders approved or disapproved by ORD"
      printTitle="ORD Summary Report"
      printSubtitle="Office of the Regional Director &middot; LTFRB Region V"
      footerNote="Reports include all finalized Decision/Orders. Use Print / Export to generate a copy."
    />
  );
}
