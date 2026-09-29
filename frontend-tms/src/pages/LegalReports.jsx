import RoleReports from './RoleReports';

export default function LegalReports() {
  return (
    <RoleReports
      endpoint="legal/reports/"
      title="Legal Officer Reports"
      subtitle="Scheduled hearings by status, denomination, and duration."
      totalLabel="Total Scheduled Hearings"
      totalSub="Hearings scheduled by Legal Officer"
      printTitle="Legal Officer Summary Report"
      printSubtitle="Legal Officer &middot; LTFRB Region V"
      footerNote="Reports include all scheduled hearings. Use Print / Export to generate a copy."
    />
  );
}
