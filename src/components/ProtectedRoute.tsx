// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { getBusinessAuth, getSuperAdminAuth, getEmployeeAuth } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'business' | 'super_admin' | 'employee';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const businessAuth = getBusinessAuth();
  const superAdminAuth = getSuperAdminAuth();
  const employeeAuth = getEmployeeAuth();
  
  const isBusinessAuthed = businessAuth?.type === 'business';
  const isSuperAdminAuthed = superAdminAuth?.type === 'super_admin';
  const isEmployeeAuthed = employeeAuth?.type === 'employee';
  
  console.log('🔒 ProtectedRoute check:', {
    requiredRole,
    isBusinessAuthed,
    isSuperAdminAuthed,
    isEmployeeAuthed,
    path: window.location.pathname
  });
  
  // ✅ Employee routes - ONLY check employee auth
  if (requiredRole === 'employee') {
    if (isEmployeeAuthed) {
      console.log('✅ Employee auth valid, rendering employee dashboard');
      return <>{children}</>;
    }
    console.log('❌ No employee auth, redirecting to employee login');
    return <Navigate to="/employee/login" replace />;
  }
  
  // ✅ Business routes - ONLY check business auth
  if (requiredRole === 'business' || requiredRole === 'tenant_admin') {
    if (isBusinessAuthed) {
      console.log('✅ Business auth valid, rendering dashboard');
      return <>{children}</>;
    }
    console.log('❌ No business auth, redirecting to business login');
    return <Navigate to="/business/login" replace />;
  }
  
  // ✅ Super admin routes - ONLY check super admin auth
  if (requiredRole === 'super_admin') {
    if (isSuperAdminAuthed) {
      console.log('✅ Super admin auth valid');
      return <>{children}</>;
    }
    console.log('❌ No super admin auth, redirecting to super admin login');
    return <Navigate to="/super-admin-login" replace />;
  }
  
  // ✅ Default fallback
  if (!isBusinessAuthed && !isSuperAdminAuthed && !isEmployeeAuthed) {
    return <Navigate to="/business/login" replace />;
  }
  
  return <>{children}</>;
}
