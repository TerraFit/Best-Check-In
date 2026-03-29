import { Navigate } from 'react-router-dom';
import { useAccess } from '../context/AccessContext';
import { getAuth } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'business' | 'super_admin' | 'tenant_admin';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isSuperAdmin, isBusiness } = useAccess();
  
  // ✅ Always check auth directly from localStorage for most reliable state
  const auth = getAuth();
  const isBusinessAuthed = auth?.type === 'business';
  const isSuperAdminAuthed = auth?.type === 'super_admin';
  
  console.log('🔒 ProtectedRoute check:', {
    requiredRole,
    isBusinessAuthed,
    isSuperAdminAuthed,
    hasAuth: !!auth,
    path: window.location.pathname,
    user: user?.email
  });
  
  // For business routes (including /business/dashboard)
  if (requiredRole === 'business' || requiredRole === 'tenant_admin' || window.location.pathname.startsWith('/business')) {
    if (isBusinessAuthed) {
      console.log('✅ Business auth valid, rendering children');
      return <>{children}</>;
    }
    console.log('❌ Business auth required, redirecting to /business/login');
    return <Navigate to="/business/login" replace />;
  }
  
  // For super admin routes
  if (requiredRole === 'super_admin') {
    if (isSuperAdminAuthed || isSuperAdmin) {
      return <>{children}</>;
    }
    return <Navigate to="/super-admin-login" replace />;
  }
  
  // Default fallback - redirect to business login
  if (!isBusinessAuthed && !isSuperAdminAuthed && !user) {
    return <Navigate to="/business/login" replace />;
  }
  
  return <>{children}</>;
}
