import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AccessProvider } from './context/AccessContext';
import ProtectedRoute from './components/ProtectedRoute';
import SuperAdminPortal from './pages/SuperAdminPortal';
import SuperAdminLogin from './pages/SuperAdminLogin';
import CheckInApp from './CheckInApp';
import BusinessRegistration from './pages/BusinessRegistration';
import ApproveBusinesses from './pages/admin/ApproveBusinesses';
import RegistrationSuccess from './pages/RegistrationSuccess';
import RegistrationPending from './pages/RegistrationPending';
import BusinessLogin from './pages/BusinessLogin';
import BusinessDashboard from './pages/BusinessDashboard';
import BusinessPending from './pages/BusinessPending';
import HomePage from './pages/HomePage';
import ResetPassword from './pages/ResetPassword';
import SetPassword from './pages/SetPassword';
import BusinessMessages from './pages/business/BusinessMessages';
import AdminMessages from './pages/admin/AdminMessages';
import ScrollToTop from './components/ScrollToTop';
import NewsletterSubscribe from './pages/NewsletterSubscribe';
import Billing from './pages/Billing';
import IndemnityView from './pages/IndemnityView';
import { LanguageSelector } from './i18n';
import EmployeeOnboardingPage from './pages/EmployeeOnboardingPage';
import EmployeeLogin from './pages/EmployeeLogin';
import EmployeeDashboard from './pages/EmployeeDashboard';
import RoomsDashboardTab from './pages/RoomsDashboardTab';
import HousekeepingSettings from './pages/HousekeepingSettings';

function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-900"><div className="text-center"><h1 className="text-4xl font-bold text-red-500 mb-4">Unauthorized Access</h1><p className="text-stone-400 mb-6">You don't have permission to view this page.</p><a href="/" className="text-amber-500 hover:text-amber-400 underline">Return to Home</a></div></div>
  );
}
function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-900"><div className="text-center"><h1 className="text-4xl font-bold text-white mb-4">404</h1><p className="text-stone-400 mb-6">Page not found</p><a href="/" className="text-amber-500 hover:text-amber-400 underline">Return to Home</a></div></div>
  );
}
function AppContent() {
  return (
    <>
      <div className="fixed top-[72px] right-4 z-30"><LanguageSelector variant="header" className="bg-white/95 backdrop-blur-sm rounded-full shadow-sm px-2 py-1 border border-stone-200" /></div>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<BusinessRegistration />} />
        <Route path="/registration-success" element={<RegistrationSuccess />} />
        <Route path="/registration-pending" element={<RegistrationPending />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/set-password/:token" element={<SetPassword />} />
        <Route path="/checkin" element={<CheckInApp />} />
        <Route path="/checkin/:businessId" element={<CheckInApp />} />
        <Route path="/indemnity/:token" element={<IndemnityView />} />
        <Route path="/subscribe" element={<NewsletterSubscribe />} />
        <Route path="/employee/invite/:token" element={<EmployeeOnboardingPage />} />
        <Route path="/employee/login" element={<EmployeeLogin />} />
        <Route path="/employee/dashboard" element={<ProtectedRoute requiredRole="employee"><EmployeeDashboard /></ProtectedRoute>} />
        <Route path="/business/login" element={<BusinessLogin />} />
        <Route path="/super-admin-login" element={<SuperAdminLogin />} />
        <Route path="/login" element={<Navigate to="/super-admin-login" replace />} />
        <Route path="/business/pending" element={<ProtectedRoute requiredRole="business"><BusinessPending /></ProtectedRoute>} />
        <Route path="/business/dashboard" element={<ProtectedRoute requiredRole="business"><BusinessDashboard /></ProtectedRoute>} />
        <Route path="/business/rooms" element={<ProtectedRoute requiredRole="business"><RoomsDashboardTab /></ProtectedRoute>} />
        <Route path="/business/housekeeping-settings" element={<ProtectedRoute requiredRole="business"><HousekeepingSettings /></ProtectedRoute>} />
        <Route path="/business/messages" element={<ProtectedRoute requiredRole="business"><BusinessMessages /></ProtectedRoute>} />
        <Route path="/business/billing" element={<ProtectedRoute requiredRole="business"><Billing /></ProtectedRoute>} />
        <Route path="/super-admin" element={<ProtectedRoute requiredRole="super_admin"><SuperAdminPortal /></ProtectedRoute>} />
        <Route path="/super-admin/approve" element={<ProtectedRoute requiredRole="super_admin"><ApproveBusinesses /></ProtectedRoute>} />
        <Route path="/super-admin/messages" element={<ProtectedRoute requiredRole="super_admin"><AdminMessages /></ProtectedRoute>} />
        <Route path="/admin" element={<Navigate to="/super-admin-login" replace />} />
        <Route path="/admin/messages" element={<Navigate to="/super-admin/messages" replace />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
function App() { return <AccessProvider><BrowserRouter><AppContent /></BrowserRouter></AccessProvider>; }
export default App;
