import { Navigate } from 'react-router-dom';
import { getAuth } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: 'business' | 'super_admin';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const auth = getAuth();

  // Not logged in at all
  if (!auth) {
    if (requiredRole === 'super_admin') {
      return <Navigate to="/super-admin-login" replace />;
    }
    return <Navigate to="/business/login" replace />;
  }

  // Role mismatch - redirect to appropriate login
  if (auth.type !== requiredRole) {
    console.warn(`Role mismatch: Expected ${requiredRole}, got ${auth.type}`);
    if (requiredRole === 'super_admin') {
      return <Navigate to="/super-admin-login" replace />;
    }
    return <Navigate to="/business/login" replace />;
  }

  // Authenticated and role matches
  return children;
}
