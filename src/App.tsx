import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AccessProvider } from './context/AccessContext';
import ProtectedRoute from './components/ProtectedRoute';
import SuperAdminPortal from './pages/SuperAdminPortal';
import SuperAdminLogin from './pages/SuperAdminLogin';
import CheckInApp from './CheckInApp';
import BusinessRegistration from './pages/BusinessRegistration';
import ApproveBusinesses from './pages/admin/ApproveBusinesses';
import RegistrationSuccess from './pages/RegistrationSuccess';
import BusinessLogin from './pages/BusinessLogin';
import BusinessDashboard from './pages/BusinessDashboard';
import BusinessPending from './pages/BusinessPending';
import HomePage from './pages/HomePage';
import ResetPassword from './pages/ResetPassword';
import BusinessAnalytics from './pages/business/BusinessAnalytics';
import BusinessMessages from './pages/business/BusinessMessages';
import AdminMessages from './pages/admin/AdminMessages';

function CheckInWrapper() {
  return <CheckInApp />;
}

function AppContent() {
  return (
    <Routes>
      {/* ========== PUBLIC ROUTES ========== */}
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<BusinessRegistration />} />
      <Route path="/registration-success" element={<RegistrationSuccess />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      
      {/* ========== AUTH ROUTES ========== */}
      <Route path="/business/login" element={<BusinessLogin />} />
      <Route path="/super-admin-login" element={<SuperAdminLogin />} />
      <Route path="/login" element={<Navigate to="/super-admin-login" replace />} />
      
      {/* ========== BUSINESS PROTECTED ROUTES ========== */}
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
        path="/business/analytics/:businessId" 
        element={
          <ProtectedRoute requiredRole="business">
            <BusinessAnalytics />
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
      
      {/* ========== CHECK-IN ROUTES ========== */}
      <Route path="/checkin" element={<CheckInWrapper />} />
      <Route path="/checkin/:businessId" element={<CheckInWrapper />} />
      
      {/* ========== SUPER ADMIN PROTECTED ROUTES ========== */}
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
      {/* FIXED: Changed from /admin/messages to /super-admin/messages */}
      <Route 
        path="/super-admin/messages" 
        element={
          <ProtectedRoute requiredRole="super_admin">
            <AdminMessages />
          </ProtectedRoute>
        } 
      />
      
      {/* ========== REDIRECT OLD ROUTES ========== */}
      <Route path="/admin" element={<Navigate to="/super-admin-login" replace />} />
      <Route path="/admin/messages" element={<Navigate to="/super-admin/messages" replace />} />
      
      {/* 404 */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4">Unauthorized Access</h1>
        <p className="text-gray-600 mb-6">You don't have permission to view this page.</p>
        <a href="/" className="text-orange-500 hover:underline">Return to Home</a>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-gray-600 mb-6">Page not found</p>
        <a href="/" className="text-orange-500 hover:underline">Return Home</a>
      </div>
    </div>
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
