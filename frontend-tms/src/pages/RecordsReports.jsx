import RoleReports from './RoleReports';

export default function RecordsReports() {
  return (
    <RoleReports
      endpoint="records/reports-summary/"
      title="Records Reports"
      subtitle="Finalized applications by decision, release status, denomination, and duration."
      totalLabel="Total Finalized Applications"
      totalSub="Approved, not approved, or dismissed applications"
      printTitle="Records Officer Summary Report"
      printSubtitle="Records Officer &middot; LTFRB Region V"
      footerNote="Reports include all finalized applications and their release status. Use Print / Export to generate a copy."
    />
  );
}
