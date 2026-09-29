import RoleReports from './RoleReports';

export default function AssessmentReports() {
  return (
    <RoleReports
      endpoint="payments/assessment-reports/"
      title="Financial Analyst Reports"
      subtitle="Assessed applications by status, denomination, and duration."
      totalLabel="Total Assessed Applications"
      totalSub="Applications with issued Statement of Account"
      printTitle="Financial Analyst Summary Report"
      printSubtitle="Financial Analyst &middot; LTFRB Region V"
      footerNote="Reports include all assessed applications. Use Print / Export to generate a copy."
    />
  );
}
