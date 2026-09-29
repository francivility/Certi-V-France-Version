import RoleReports from './RoleReports';

export default function CTDOReports() {
  return (
    <RoleReports
      endpoint="legal/ctdo-reports/"
      title="CTDO Reports"
      subtitle="Validated applications and endorsed Decision/Orders by status, denomination, and duration."
      totalLabel="Total Validated Applications"
      totalSub="Applications processed past CTDO stage"
      printTitle="CTDO Summary Report"
      printSubtitle="CTDO Office &middot; LTFRB Region V"
      footerNote="Reports include all validated applications and endorsed Decision/Orders. Use Print / Export to generate a copy."
    />
  );
}
