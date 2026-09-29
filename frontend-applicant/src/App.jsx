import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import ApplyCPC from './pages/ApplyCPC';
import SubmitRequirements from './pages/SubmitRequirements';
import MyApplications from './pages/MyApplications';
import Notifications from './pages/Notifications';
import Payments from './pages/Payments';
import Account from './pages/Account';
import CPCRelease from './pages/CPCRelease';
import PayBill from './pages/PayBill';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailed from './pages/PaymentFailed';
import NoticeView from './pages/NoticeView';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen w-full bg-gov-gray-100 font-sans text-gov-gray-800">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/apply" element={<ProtectedRoute><ApplyCPC /></ProtectedRoute>} />
          <Route path="/apply/:applicationId/documents" element={<ProtectedRoute><SubmitRequirements /></ProtectedRoute>} />
          <Route path="/my-applications" element={<ProtectedRoute><MyApplications /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/cpc-release/:applicationId" element={<ProtectedRoute><CPCRelease /></ProtectedRoute>} />
          <Route path="/pay/:applicationId" element={<ProtectedRoute><PayBill /></ProtectedRoute>} />
          <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
          <Route path="/payment-failed" element={<ProtectedRoute><PaymentFailed /></ProtectedRoute>} />
          <Route path="/notice/:applicationId" element={<ProtectedRoute><NoticeView /></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;