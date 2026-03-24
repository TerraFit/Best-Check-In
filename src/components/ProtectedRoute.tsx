// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAccess } from '../context/AccessContext';

export default function ProtectedRoute({ children, requiredRole, requiredTenantId }: { 
  children: React.ReactNode; 
  requiredRole?: string; 
  requiredTenantId?: string;
}) {
  const { user, isSuperAdmin, isTenantAdmin, isViewer } = useAccess();
  
  // Check for business auth first (for business dashboard)
  const businessAuth = localStorage.getItem('business');
  
  // For business routes, use business auth
  if (requiredRole === 'tenant_admin' && businessAuth) {
    return children;
  }

  // Not logged in? Go to login
  if (!user && !businessAuth) {
    return <Navigate to="/login" replace />;
  }

  // Super Admin can access ANYTHING
  if (isSuperAdmin) {
    return children;
  }

  // Check role requirement
  if (requiredRole === 'super_admin' && !isSuperAdmin) {
    return <Navigate to="/super-admin-login" replace />;
  }

  // Check tenant access
  if (requiredTenantId && user?.tenantId !== requiredTenantId) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check specific role
  if (requiredRole === 'tenant_admin' && !isTenantAdmin) {
    return <Navigate to="/business/login" replace />;
  }

  if (requiredRole === 'viewer' && !isViewer && !isTenantAdmin) {
    return <Navigate to="/business/login" replace />;
  }

  return children;
}
