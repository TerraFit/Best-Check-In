import { Navigate } from 'react-router-dom';
import { useAccess } from '../context/AccessContext';

export default function ProtectedRoute({ children, requiredRole, requiredTenantId }) {
  const { user, isSuperAdmin, isTenantAdmin, isViewer } = useAccess();

  // Not logged in? Go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Super Admin can access ANYTHING
  if (isSuperAdmin) {
    return children;
  }

  // Check role requirement
  if (requiredRole === 'super_admin' && !isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Check tenant access
  if (requiredTenantId && user.tenantId !== requiredTenantId) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check specific role
  if (requiredRole === 'tenant_admin' && !isTenantAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (requiredRole === 'viewer' && !isViewer && !isTenantAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
