import { Navigate } from 'react-router-dom';
import { getBusinessAuth, getSuperAdminAuth } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'business' | 'super_admin' | 'tenant_admin';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  // ✅ Get auth separately - NO CROSS CONTAMINATION
  const businessAuth = getBusinessAuth();
  const superAdminAuth = getSuperAdminAuth();
  
  const isBusinessAuthed = businessAuth?.type === 'business';
  const isSuperAdminAuthed = superAdminAuth?.type === 'super_admin';
  
  console.log('🔒 ProtectedRoute check:', {
    requiredRole,
    isBusinessAuthed,
    isSuperAdminAuthed,
    path: window.location.pathname
  });
  
  // ✅ For business routes - ONLY check business auth
  if (requiredRole === 'business' || requiredRole === 'tenant_admin') {
    if (isBusinessAuthed) {
      console.log('✅ Business auth valid, rendering dashboard');
      return <>{children}</>;
    }
    console.log('❌ No business auth, redirecting to business login');
    return <Navigate to="/business/login" replace />;
  }
  
  // ✅ For super admin routes - ONLY check super admin auth
  if (requiredRole === 'super_admin') {
    if (isSuperAdminAuthed) {
      console.log('✅ Super admin auth valid');
      return <>{children}</>;
    }
    console.log('❌ No super admin auth, redirecting to super admin login');
    return <Navigate to="/super-admin-login" replace />;
  }
  
  // ✅ Default fallback for routes without specific role
  if (!isBusinessAuthed && !isSuperAdminAuthed) {
    return <Navigate to="/business/login" replace />;
  }
  
  return <>{children}</>;
}
