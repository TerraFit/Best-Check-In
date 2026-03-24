import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AccessProvider } from './context/AccessContext';

// Guards
import { BusinessGuard } from './components/guards/BusinessGuard';
import { SuperAdminGuard } from './components/guards/SuperAdminGuard';

// Public Components
import HomePage from './pages/HomePage';
import BusinessLogin from './pages/BusinessLogin';
import SuperAdminLogin from './pages/SuperAdminLogin';
import BusinessRegistration from './pages/BusinessRegistration';
import RegistrationSuccess from './pages/RegistrationSuccess';
import BusinessPending from './pages/BusinessPending';
import ResetPassword from './pages/ResetPassword';
import CheckInApp from './CheckInApp';

// Business Components
import BusinessDashboard from './pages/BusinessDashboard';
import BusinessAnalytics from './pages/business/BusinessAnalytics';
import BusinessMessages from './pages/business/BusinessMessages';

// Super Admin Components
import SuperAdminPortal from './pages/SuperAdminPortal';
import ApproveBusinesses from './pages/admin/ApproveBusinesses';
import AdminMessages from './pages/admin/AdminMessages';

// Simple check-in wrapper
function CheckInWrapper() {
  return <CheckInApp />;
}

function App() {
  return (
    <AccessProvider>
      <BrowserRouter>
        <Routes>
          {/* ========== PUBLIC ROUTES ========== */}
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<BusinessRegistration />} />
          <Route path="/registration-success" element={<RegistrationSuccess />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          {/* ========== AUTH ROUTES ========== */}
          <Route path="/business/login" element={<BusinessLogin />} />
          <Route path="/super-admin-login" element={<SuperAdminLogin />} />
          
          {/* Redirect old login */}
          <Route path="/login" element={<Navigate to="/super-admin-login" replace />} />
          
          {/* ========== BUSINESS PROTECTED ROUTES ========== */}
          <Route element={<BusinessGuard />}>
            <Route path="/business/pending" element={<BusinessPending />} />
            <Route path="/business/dashboard" element={<BusinessDashboard />} />
            <Route path="/business/analytics/:businessId" element={<BusinessAnalytics />} />
            <Route path="/business/messages" element={<BusinessMessages />} />
          </Route>
          
          {/* ========== SUPER ADMIN PROTECTED ROUTES ========== */}
          <Route element={<SuperAdminGuard />}>
            <Route path="/super-admin" element={<SuperAdminPortal />} />
            <Route path="/super-admin/approve" element={<ApproveBusinesses />} />
            <Route path="/admin/messages" element={<AdminMessages />} />
          </Route>
          
          {/* ========== CHECK-IN ROUTES ========== */}
          <Route path="/checkin" element={<CheckInWrapper />} />
          <Route path="/checkin/:businessId" element={<CheckInWrapper />} />
          
          {/* ========== REDIRECT OLD ROUTES ========== */}
          <Route path="/admin" element={<Navigate to="/super-admin-login" replace />} />
          
          {/* ========== 404 ========== */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AccessProvider>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-gray-600 mb-4">Page not found</p>
        <a href="/" className="text-orange-500 hover:underline">Return Home</a>
      </div>
    </div>
  );
}

export default App;
