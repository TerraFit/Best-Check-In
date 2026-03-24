// src/App.tsx - UPDATED with correct route ordering
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AccessProvider } from './context/AccessContext';
import ProtectedRoute from './components/ProtectedRoute';
import SuperAdminPortal from './pages/SuperAdminPortal';
import Login from './pages/Login';
import SuperAdminLogin from './pages/SuperAdminLogin'; // NEW
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

// This wrapper is ONLY for check-in routes now
function CheckInWrapper() {
  return <CheckInApp />;
}

function AppContent() {
  return (
    <Routes>
      {/* ===== PUBLIC ROUTES ===== */}
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<BusinessRegistration />} />
      <Route path="/registration-success" element={<RegistrationSuccess />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      
      {/* ===== BUSINESS AUTH ROUTES ===== */}
      <Route path="/business/login" element={<BusinessLogin />} />
      <Route path="/business/pending" element={<BusinessPending />} />
      
      {/* ===== SUPER ADMIN AUTH ROUTES ===== */}
      <Route path="/super-admin-login" element={<SuperAdminLogin />} />
      <Route path="/login" element={<Login />} />
      
      {/* ===== PROTECTED BUSINESS ROUTES ===== */}
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
      
      {/* ===== CHECK-IN ROUTES (NO WRAPPER INTERFERENCE) ===== */}
      <Route path="/checkin" element={<CheckInWrapper />} />
      <Route path="/checkin/:businessId" element={<CheckInWrapper />} />
      
      {/* ===== SUPER ADMIN PROTECTED ROUTES ===== */}
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
      
      {/* LEGACY ADMIN ROUTE - Keep for backward compatibility */}
      <Route path="/admin" element={<CheckInWrapper />} />
      
      {/* 404 */}
      <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />
      <Route path="*" element={<div>Page Not Found</div>} />
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
