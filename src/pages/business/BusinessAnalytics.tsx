import { Navigate } from 'react-router-dom';
import { useAccess } from '../context/AccessContext';

export default function ProtectedRoute({ children, requiredRole, requiredTenantId }) {
  const { user, isSuperAdmin, isTenantAdmin, isViewer } = useAccess();
  
  // Check if user is logged in via business dashboard
  const businessUser = localStorage.getItem('business');
  const isBusinessUser = !!businessUser;

  // Not logged in at all? Go to login
  if (!user && !isBusinessUser) {
    return <Navigate to="/login" replace />;
  }

  // Super Admin can access ANYTHING
  if (isSuperAdmin) {
    return children;
  }

  // Business users (tenant_admin) should have access to their own pages
  if (isBusinessUser && requiredRole === 'tenant_admin') {
    return children;
  }

  // Check role requirement
  if (requiredRole === 'super_admin' && !isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Check tenant access (only applies to regular users, not business users)
  if (requiredTenantId && user?.tenantId !== requiredTenantId && !isBusinessUser) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check specific role
  if (requiredRole === 'tenant_admin' && !isTenantAdmin && !isBusinessUser) {
    return <Navigate to="/admin" replace />;
  }

  if (requiredRole === 'viewer' && !isViewer && !isTenantAdmin && !isBusinessUser) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
