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

// Unauthorized Page Component
function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-500 mb-4">Unauthorized Access</h1>
        <p className="text-stone-400 mb-6">You don't have permission to view this page.</p>
        <a href="/" className="text-amber-500 hover:text-amber-400 underline">
          Return to Home
        </a>
      </div>
    </div>
  );
}

// Not Found Page Component
function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">404</h1>
        <p className="text-stone-400 mb-6">Page not found</p>
        <a href="/" className="text-amber-500 hover:text-amber-400 underline">
          Return Home
        </a>
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<BusinessRegistration />} />
        <Route path="/registration-success" element={<RegistrationSuccess />} />
        <Route path="/registration-pending" element={<RegistrationPending />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/set-password/:token" element={<SetPassword />} />
        
        {/* ✅ Check-in Routes - Uses CheckInApp which handles everything */}
        <Route path="/checkin" element={<CheckInApp />} />
        <Route path="/checkin/:businessId" element={<CheckInApp />} />
        
        {/* Indemnity View Route */}
        <Route path="/indemnity/:token" element={<IndemnityView />} />
        
        {/* Newsletter Subscription */}
        <Route path="/subscribe" element={<NewsletterSubscribe />} />
        
        {/* Auth Routes */}
        <Route path="/business/login" element={<BusinessLogin />} />
        <Route path="/super-admin-login" element={<SuperAdminLogin />} />
        <Route path="/login" element={<Navigate to="/super-admin-login" replace />} />
        
        {/* Protected Business Routes */}
        <Route 
          path="/business/pending" 
          element={
            <ProtectedRoute requiredRole="business">
              <BusinessPending />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/business/dashboard" 
          element={
            <ProtectedRoute requiredRole="business">
              <BusinessDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/business/messages" 
          element={
            <ProtectedRoute requiredRole="business">
              <BusinessMessages />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/business/billing" 
          element={
            <ProtectedRoute requiredRole="business">
              <Billing />
            </ProtectedRoute>
          } 
        />
        
        {/* Protected Super Admin Routes */}
        <Route 
          path="/super-admin" 
          element={
            <ProtectedRoute requiredRole="super_admin">
              <SuperAdminPortal />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/super-admin/approve" 
          element={
            <ProtectedRoute requiredRole="super_admin">
              <ApproveBusinesses />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/super-admin/messages" 
          element={
            <ProtectedRoute requiredRole="super_admin">
              <AdminMessages />
            </ProtectedRoute>
          } 
        />
        
        {/* Legacy Redirects */}
        <Route path="/admin" element={<Navigate to="/super-admin-login" replace />} />
        <Route path="/admin/messages" element={<Navigate to="/super-admin/messages" replace />} />
        
        {/* Error Routes */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AccessProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AccessProvider>
  );
}

export default App;
