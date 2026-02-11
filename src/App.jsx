import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AccessProvider } from './context/AccessContext';
import ProtectedRoute from './components/ProtectedRoute';
import SuperAdminPortal from './pages/SuperAdminPortal';
import AdminDashboard from './components/Dashboard';
import Login from './pages/Login';
import Hero from './components/Hero';

function App() {
  return (
    <AccessProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Hero />} />
          <Route path="/login" element={<Login />} />
          
          {/* Super Admin ONLY */}
          <Route path="/super-admin" element={
            <ProtectedRoute requiredRole="super_admin">
              <SuperAdminPortal />
            </ProtectedRoute>
          } />
          
          {/* Hotel Admin (Tenant Admin) */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="tenant_admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          {/* Unauthorized page */}
          <Route path="/unauthorized" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-stone-900 mb-4">Unauthorized Access</h1>
                <p className="text-stone-600">You don't have permission to view this page.</p>
              </div>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </AccessProvider>
  );
}

export default App;
