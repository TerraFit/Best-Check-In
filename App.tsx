import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AccessProvider } from './context/AccessContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import SuperAdminPortal from './pages/SuperAdminPortal.jsx';
import Login from './pages/Login.jsx';
import Hero from './components/Hero';

function App() {
  return (
    <AccessProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Hero />} />
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
      </BrowserRouter>
    </AccessProvider>
  );
}

export default App;
