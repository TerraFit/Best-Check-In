import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AccessProvider } from './context/AccessContext';
import ProtectedRoute from './components/ProtectedRoute';
import SuperAdminPortal from './pages/SuperAdminPortal';
import Login from './pages/Login';
import CheckInApp from './CheckInApp';
import BusinessRegistration from './pages/BusinessRegistration';
import ApproveBusinesses from './pages/Admin/ApproveBusinesses';
import RegistrationSuccess from './pages/RegistrationSuccess';
import BusinessLogin from './pages/BusinessLogin';
import BusinessDashboard from './pages/BusinessDashboard';
import HomePage from './pages/HomePage'; // ← ADD THIS IMPORT

function CheckInAppWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get business ID from URL if present
  const getBusinessId = () => {
    const pathParts = location.pathname.split('/');
    if (pathParts[1] === 'checkin' && pathParts[2]) {
      return pathParts[2];
    }
    return null;
  };

  // Convert path to ViewState
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
      {/* Public routes - ONLY THIS LINE CHANGES */}
      <Route path="/" element={<HomePage />} /> {/* ← CHANGED FROM CheckInAppWrapper TO HomePage */}
      <Route path="/checkin" element={<CheckInAppWrapper />} />
      <Route path="/checkin/:businessId" element={<CheckInAppWrapper />} />
      <Route path="/register" element={<BusinessRegistration />} />
      <Route path="/registration-success" element={<RegistrationSuccess />} />
      <Route path="/business/login" element={<BusinessLogin />} />
      
      {/* Protected Business routes */}
      <Route 
        path="/business/dashboard" 
        element={
          <ProtectedRoute requiredRole="tenant_admin">
            <BusinessDashboard />
          </ProtectedRoute>
        } 
      />
      
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
