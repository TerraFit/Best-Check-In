import { Navigate } from 'react-router-dom';
import { useAccess } from '../context/AccessContext';

export default function ProtectedRoute({ children, requiredRole, requiredTenantId }) {
  const { user, isSuperAdmin, isTenantAdmin, isViewer } = useAccess();
  
  // Check for business auth (new system)
  const businessAuth = localStorage.getItem('fastcheckin_auth');
  // Check for legacy business auth
  const legacyBusiness = localStorage.getItem('business');
  
  // User is considered authenticated if ANY of these exist
  const isAuthenticated = !!(user || businessAuth || legacyBusiness);
  
  console.log('🔒 ProtectedRoute check:', {
    requiredRole,
    isAuthenticated,
    hasBusinessAuth: !!businessAuth,
    hasLegacyBusiness: !!legacyBusiness,
    isSuperAdmin
  });
  
  // For business routes
  if (requiredRole === 'business' || requiredRole === 'tenant_admin') {
    if (isAuthenticated) {
      return children;
    }
    return <Navigate to="/business/login" replace />;
  }
  
  // For super admin routes
  if (requiredRole === 'super_admin') {
    if (isSuperAdmin || businessAuth?.type === 'super_admin') {
      return children;
    }
    return <Navigate to="/super-admin-login" replace />;
  }
  
  // Default fallback
  if (!isAuthenticated) {
    return <Navigate to="/business/login" replace />;
  }
  
  return children;
}
