import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AccessProvider } from './context/AccessContext';
import ProtectedRoute from './components/ProtectedRoute';
import SuperAdminPortal from './pages/SuperAdminPortal';
import Login from './pages/Login';
import CheckInApp from './CheckInApp';
import BusinessRegistration from './pages/BusinessRegistration'; // ← ADD THIS IMPORT

function CheckInAppWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Convert path to ViewState
  const getInitialView = () => {
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
      {/* Public routes */}
      <Route path="/" element={<CheckInAppWrapper />} />
      <Route path="/checkin" element={<CheckInAppWrapper />} />
      <Route path="/register" element={<BusinessRegistration />} /> {/* ← ADD THIS ROUTE */}
      
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
