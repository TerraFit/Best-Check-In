import { Navigate } from 'react-router-dom';
import { useAccess } from '../context/AccessContext';
import { getAuth } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'business' | 'super_admin' | 'tenant_admin';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isSuperAdmin, isBusiness } = useAccess();
  
  // Check for business auth directly
  const auth = getAuth();
  const isBusinessAuthed = auth?.type === 'business';
  const isSuperAdminAuthed = auth?.type === 'super_admin';
  
  console.log('🔒 ProtectedRoute check:', {
    requiredRole,
    isBusinessAuthed,
    isSuperAdminAuthed,
    hasAuth: !!auth,
    path: window.location.pathname
  });
  
  // For business routes
  if (requiredRole === 'business' || requiredRole === 'tenant_admin') {
    if (isBusinessAuthed || isBusiness) {
      return <>{children}</>;
    }
    // Redirect to BUSINESS login, not super admin
    return <Navigate to="/business/login" replace />;
  }
  
  // For super admin routes
  if (requiredRole === 'super_admin') {
    if (isSuperAdminAuthed || isSuperAdmin) {
      return <>{children}</>;
    }
    return <Navigate to="/super-admin-login" replace />;
  }
  
  // Default fallback - check any auth
  if (!isBusinessAuthed && !isSuperAdminAuthed && !user) {
    return <Navigate to="/business/login" replace />;
  }
  
  return <>{children}</>;
}
