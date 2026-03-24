import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AccessProvider } from './context/AccessContext';
import ProtectedRoute from './components/ProtectedRoute';
import SuperAdminPortal from './pages/SuperAdminPortal';
import Login from './pages/Login';
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

function CheckInAppWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const getBusinessId = () => {
    const pathParts = location.pathname.split('/');
    if (pathParts[1] === 'checkin' && pathParts[2]) {
      return pathParts[2];
    }
    return null;
  };

  const getInitialView = () => {
    const businessId = getBusinessId();
    if (businessId) {
      return 'CHECKIN';
    }
    switch (location.pathname) {
      case '/checkin':
        return 'CHECKIN';
      case '/admin':
        return 'ADMIN_DASHBOARD';
      default:
        return 'HOME';
    }
  };
  
  const handleNavigate = (view: string) => {
    console.log('🔵 App.tsx navigate called with:', view);
    switch (view) {
      case 'CHECKIN':
        navigate('/checkin');
        break;
      case 'ADMIN_DASHBOARD':
      case 'REPORTS':
      case 'IMPORT':
        navigate('/admin');
        break;
      case 'LOGIN':
        navigate('/login');
        break;
      default:
        navigate('/');
    }
  };
  
  return (
    <CheckInApp 
      key={location.pathname}
      externalNavigate={handleNavigate}
      initialView={getInitialView()}
    />
  );
}

function AppContent() {
  return (
    <Routes>
      {/* Public routes - specific paths first */}
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<BusinessRegistration />} />
      <Route path="/registration-success" element={<RegistrationSuccess />} />
      <Route path="/business/login" element={<BusinessLogin />} />
      <Route path="/business/pending" element={<BusinessPending />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      
      {/* Business Dashboard routes - MUST come before /checkin/:businessId */}
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
      
      {/* Check-in routes - these come AFTER business routes so they don't interfere */}
      <Route path="/checkin" element={<CheckInAppWrapper />} />
      <Route path="/checkin/:businessId" element={<CheckInAppWrapper />} />
      
      {/* Admin routes */}
      <Route path="/admin" element={<CheckInAppWrapper />} />
      <Route path="/login" element={<Login />} />
      
      {/* Super Admin routes */}
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
      
      <Route path="/unauthorized" element={<div>Unauthorized</div>} />
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
