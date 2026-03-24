import { Navigate, Outlet } from 'react-router-dom';
import { isBusinessAuthenticated } from '../../utils/auth';

export const BusinessGuard = () => {
  const isAuthenticated = isBusinessAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/business/login" replace />;
  }
  
  return <Outlet />;
};
