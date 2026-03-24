import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AccessProvider } from './context/AccessContext';
import ProtectedRoute from './components/ProtectedRoute';
import SuperAdminPortal from './pages/SuperAdminPortal';
import SuperAdminLogin from './pages/SuperAdminLogin';  // ✅ NEW - Correct import
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

// Simple wrapper for check-in routes
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
      
      {/* ========== BUSINESS AUTH ROUTES ========== */}
      <Route path="/business/login" element={<BusinessLogin />} />
      <Route path="/business/pending" element={<BusinessPending />} />
      
      {/* ========== SUPER ADMIN AUTH ROUTES ========== */}
      <Route path="/super-admin-login" element={<SuperAdminLogin />} />  {/* ✅ CORRECT */}
      <Route path="/login" element={<Navigate to="/super-admin-login" replace />} />  {/* Redirect old route */}
      
      {/* ========== PROTECTED BUSINESS ROUTES ========== */}
      <Route 
        path="/business/dashboard" 
        element={
          <ProtectedRoute requiredRole="tenant_admin">
            <BusinessDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/business/analytics/:businessId" 
        element={
          <ProtectedRoute requiredRole="tenant_admin">
            <BusinessAnalytics />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/business/messages" 
        element={
          <ProtectedRoute requiredRole="tenant_admin">
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
      <Route 
        path="/admin/messages" 
        element={
          <ProtectedRoute requiredRole="super_admin">
            <AdminMessages />
          </ProtectedRoute>
        } 
      />
      
      {/* ========== REDIRECT OLD ROUTES ========== */}
      <Route path="/admin" element={<Navigate to="/super-admin-login" replace />} />
      
      {/* 404 */}
      <Route path="/unauthorized" element={<div className="p-8 text-center">Unauthorized Access</div>} />
      <Route path="*" element={<div className="p-8 text-center">Page Not Found</div>} />
    </Routes>
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
