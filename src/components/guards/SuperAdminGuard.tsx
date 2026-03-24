import { Navigate, Outlet } from 'react-router-dom';
import { isSuperAdminAuthenticated } from '../../utils/auth';

export const SuperAdminGuard = () => {
  const isAuthenticated = isSuperAdminAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/super-admin-login" replace />;
  }
  
  return <Outlet />;
};
