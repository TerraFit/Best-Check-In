import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AccessProvider } from './context/AccessContext';
import ProtectedRoute from './components/ProtectedRoute';
import SuperAdminPortal from './pages/SuperAdminPortal';
import Login from './pages/Login';
import CheckInApp from './CheckInApp';

function CheckInAppWrapper() {
  const navigate = useNavigate();
  
  const handleNavigate = (view: string) => {
    switch (view) {
      case 'CHECKIN':
        navigate('/checkin');
        break;
      case 'ADMIN_DASHBOARD':
        navigate('/admin');
        break;
      case 'LOGIN':
        navigate('/login');
        break;
      default:
        navigate('/');
    }
  };
  
  return <CheckInApp externalNavigate={handleNavigate} />;
}

function AppContent() {
  return (
    <Routes>
      {/* Original check-in app at root */}
      <Route path="/" element={<CheckInAppWrapper />} />
      <Route path="/checkin" element={<CheckInAppWrapper />} />
      <Route path="/admin" element={<CheckInAppWrapper />} />
      
      {/* Super Admin routes */}
      <Route path="/login" element={<Login />} />
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
