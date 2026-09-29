import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import Login from './pages/Login';
import TmsShell from './components/TmsShell';
import ProtectedRoute from './components/ProtectedRoute';
import CaseSearch from './components/CaseSearch';
import ReceivingDashboard from './pages/ReceivingDashboard';
import ReceivingQueue from './pages/ReceivingQueue';
import ReceivingApplications from './pages/ReceivingApplications';
import ReceivingView from './pages/ReceivingView';
import ReceivingReports from './pages/ReceivingReports';
import ReceivingReview from './pages/ReceivingReview';
import CTDODashboard from './pages/CTDODashboard';
import CTDOQueue from './pages/CTDOQueue';
import CTDOReview from './pages/CTDOReview';
import CTDOHistory from './pages/CTDOHistory';
import AssessmentDashboard from './pages/AssessmentDashboard';
import AssessmentQueue from './pages/AssessmentQueue';
import AssessmentReview from './pages/AssessmentReview';
import AssessmentHistory from './pages/AssessmentHistory';
import OverdueApplications from './pages/OverdueApplications';
import ApplicationDetailView from './pages/ApplicationDetailView';
import PaymentDashboard from './pages/PaymentDashboard';
import PaymentQueue from './pages/PaymentQueue';
import PaymentReview from './pages/PaymentReview';
import PaymentHistory from './pages/PaymentHistory';
import PaidApplications from './pages/PaidApplications';
import DocketForward from './pages/DocketForward';
import LegalDashboard from './pages/LegalDashboard';
import LegalQueue from './pages/LegalQueue';
import LegalHistory from './pages/LegalHistory';
import HearingScheduler from './pages/HearingScheduler';
import NoticeForm from './pages/NoticeForm';
import LegalSchedule from './pages/LegalSchedule';
import DecisionQueue from './pages/DecisionQueue';
import DecisionOrderDraft from './pages/DecisionOrderDraft';
import CTDOEndorsementQueue from './pages/CTDOEndorsementQueue';
import CTDOEndoresementReview from './pages/CTDOEndorsementReview';
import ORDApprovalQueue from './pages/ORDApprovalQueue';
import ORDDashboard from './pages/ORDDashboard';
import ORDSchedule from './pages/ORDSchedule';
import ORDHistory from './pages/ORDHistory';
import ORDApprovalReview from './pages/ORDApprovalReview';
import RecordsDashboard from './pages/RecordsDashboard';
import RecordsReleaseQueue from './pages/RecordsReleaseQueue';
import RecordsReleaseReview from './pages/RecordsReleaseReview';
import RecordsHistory from './pages/RecordsHistory';
import RecordsExpiryMonitor from './pages/RecordsExpiryMonitor';
import CTDOReports from './pages/CTDOReports';
import AssessmentReports from './pages/AssessmentReports';
import PaymentReports from './pages/PaymentReports';
import LegalReports from './pages/LegalReports';
import ORDReports from './pages/ORDReports';
import RecordsReports from './pages/RecordsReports';

const S = ({ children }) => (
  <ProtectedRoute>
    <TmsShell>{children}</TmsShell>
  </ProtectedRoute>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/receiving" element={<S><ReceivingDashboard /></S>} />
        <Route path="/receiving/queue" element={<S><ReceivingQueue /></S>} />
        <Route path="/receiving/applications" element={<S><ReceivingApplications /></S>} />
        <Route path="/receiving/applications/:applicationId" element={<S><ReceivingView /></S>} />
        <Route path="/receiving/search" element={<S><CaseSearch endpoint="applications/case-search/" subtitle="Search all processed applications by case number, docket number, or applicant name." buildAction={(app) => ({ path: `/receiving/applications/${app.id}`, label: 'View', icon: <Eye className="w-4 h-4" /> })} /></S>} />
        <Route path="/receiving/reports" element={<S><ReceivingReports /></S>} />
        <Route path="/receiving/:applicationId" element={<S><ReceivingReview /></S>} />
        <Route path="/ctdo" element={<S><CTDODashboard /></S>} />
        <Route path="/ctdo/queue" element={<S><CTDOQueue /></S>} />
        <Route path="/ctdo/history" element={<S><CTDOHistory /></S>} />
        <Route path="/ctdo/history/:applicationId" element={<S><ApplicationDetailView backPath="/ctdo/history" backLabel="CTDO Application History" /></S>} />
        <Route path="/ctdo/search" element={<S><CaseSearch endpoint="applications/case-search/" subtitle="Search all processed applications by case number, docket number, or applicant name." buildAction={(app) => ({ path: `/ctdo/history/${app.id}`, label: 'View', icon: <Eye className="w-4 h-4" /> })} /></S>} />
        <Route path="/ctdo/reports" element={<S><CTDOReports /></S>} />
        <Route path="/ctdo/:applicationId" element={<S><CTDOReview /></S>} />
        <Route path="/assessment" element={<S><AssessmentDashboard /></S>} />
        <Route path="/assessment/queue" element={<S><AssessmentQueue /></S>} />
        <Route path="/assessment/:applicationId" element={<S><AssessmentReview /></S>} />
        <Route path="/assessment/history" element={<S><AssessmentHistory /></S>} />
        <Route path="/assessment/history/:applicationId" element={<S><ApplicationDetailView backPath="/assessment/history" backLabel="Assessment Application History" showPayment /></S>} />
        <Route path="/assessment/search" element={<S><CaseSearch endpoint="applications/case-search/" subtitle="Search all processed applications by case number, docket number, or applicant name." buildAction={(app) => ({ path: `/assessment/history/${app.id}`, label: 'View', icon: <Eye className="w-4 h-4" /> })} /></S>} />
        <Route path="/assessment/overdue" element={<S><OverdueApplications /></S>} />
        <Route path="/assessment/reports" element={<S><AssessmentReports /></S>} />
        <Route path="/payment" element={<S><PaymentDashboard /></S>} />
        <Route path="/payment/queue" element={<S><PaymentQueue /></S>} />
        <Route path="/payment/history" element={<S><PaymentHistory /></S>} />
        <Route path="/payment/history/:applicationId" element={<S><ApplicationDetailView backPath="/payment/history" backLabel="Cashier Application History" showPayment /></S>} />
        <Route path="/payment/search" element={<S><CaseSearch endpoint="applications/case-search/" subtitle="Search all processed applications by case number, docket number, or applicant name." buildAction={(app) => ({ path: `/payment/history/${app.id}`, label: 'View', icon: <Eye className="w-4 h-4" /> })} /></S>} />
        <Route path="/payment/reports" element={<S><PaymentReports /></S>} />
        <Route path="/payment/:applicationId" element={<S><PaymentReview /></S>} />
        <Route path="/paid" element={<S><PaidApplications /></S>} />
        <Route path="/paid/:applicationId" element={<S><DocketForward /></S>} />
        <Route path="/legal" element={<S><LegalDashboard /></S>} />
        <Route path="/legal/schedule" element={<S><LegalSchedule /></S>} />
        <Route path="/legal/queue" element={<S><LegalQueue /></S>} />
        <Route path="/legal/history" element={<S><LegalHistory /></S>} />
        <Route path="/legal/history/:applicationId" element={<S><ApplicationDetailView backPath="/legal/history" backLabel="Legal Application History" /></S>} />
        <Route path="/legal/search" element={<S><CaseSearch endpoint="applications/case-search/" subtitle="Search all processed applications by case number, docket number, or applicant name." buildAction={(app) => ({ path: `/legal/history/${app.id}`, label: 'View', icon: <Eye className="w-4 h-4" /> })} /></S>} />
        <Route path="/legal/reports" element={<S><LegalReports /></S>} />
        <Route path="/legal/:applicationId" element={<S><HearingScheduler /></S>} />
        <Route path="/legal/notice/:applicationId" element={<S><NoticeForm /></S>} />
        <Route path="/decision-queue" element={<S><DecisionQueue /></S>} />
        <Route path="/decision/:applicationId" element={<S><DecisionOrderDraft /></S>} />
        <Route path="/ctdo-endorsement-queue" element={<S><CTDOEndorsementQueue /></S>} />
        <Route path="/ctdo-endorsement/:applicationId" element={<S><CTDOEndoresementReview /></S>} />
        <Route path="/ord" element={<S><ORDDashboard /></S>} />
        <Route path="/ord/schedule" element={<S><ORDSchedule /></S>} />
        <Route path="/ord-queue" element={<S><ORDApprovalQueue /></S>} />
        <Route path="/ord/history" element={<S><ORDHistory /></S>} />
        <Route path="/ord/history/:applicationId" element={<S><ApplicationDetailView backPath="/ord/history" backLabel="ORD Application History" /></S>} />
        <Route path="/ord/search" element={<S><CaseSearch endpoint="applications/case-search/" subtitle="Search all processed applications by case number, docket number, or applicant name." buildAction={(app) => ({ path: `/ord/history/${app.id}`, label: 'View', icon: <Eye className="w-4 h-4" /> })} /></S>} />
        <Route path="/ord/reports" element={<S><ORDReports /></S>} />
        <Route path="/ord/:applicationId" element={<S><ORDApprovalReview /></S>} />
        <Route path="/records" element={<S><RecordsDashboard /></S>} />
        <Route path="/records/release-queue" element={<S><RecordsReleaseQueue /></S>} />
        <Route path="/records/release/:applicationId" element={<S><RecordsReleaseReview /></S>} />
        <Route path="/records/history" element={<S><RecordsHistory /></S>} />
        <Route path="/records/history/:applicationId" element={<S><ApplicationDetailView backPath="/records/history" backLabel="Records Application History" /></S>} />
        <Route path="/records/case-search" element={<S><CaseSearch endpoint="applications/case-search/" subtitle="Search all processed applications by case number, docket number, or applicant name." chips={(app) => [{ label: app.released ? 'Released' : 'Not Released', cls: app.released ? 'bg-gov-green-light text-gov-green' : 'bg-gov-gray-200 text-gov-gray-600' }]} buildAction={() => null} /></S>} />
        <Route path="/records/expiry-monitor" element={<S><RecordsExpiryMonitor /></S>} />
        <Route path="/records/reports" element={<S><RecordsReports /></S>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;