import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAuth, clearAuth, getBusinessAuth, getSuperAdminAuth } from '../utils/auth';

interface AccessContextType {
  user: any | null;
  isAuthenticated: boolean;
  isBusiness: boolean;
  isSuperAdmin: boolean;
  loginAs: (email: string, role: 'business' | 'super_admin', tenantId?: string) => void;
  logout: () => void;
}

const AccessContext = createContext<AccessContextType | undefined>(undefined);

export function AccessProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isBusiness, setIsBusiness] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check both types of auth
    const businessAuth = getBusinessAuth();
    const superAdminAuth = getSuperAdminAuth();
    const mainAuth = getAuth();
    
    if (businessAuth?.type === 'business') {
      setUser(businessAuth.user);
      setIsAuthenticated(true);
      setIsBusiness(true);
      setIsSuperAdmin(false);
    } else if (superAdminAuth?.type === 'super_admin') {
      setUser(superAdminAuth.user);
      setIsAuthenticated(true);
      setIsBusiness(false);
      setIsSuperAdmin(true);
    } else if (mainAuth?.type === 'business') {
      setUser(mainAuth.user);
      setIsAuthenticated(true);
      setIsBusiness(true);
      setIsSuperAdmin(false);
    } else if (mainAuth?.type === 'super_admin') {
      setUser(mainAuth.user);
      setIsAuthenticated(true);
      setIsBusiness(false);
      setIsSuperAdmin(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
      setIsBusiness(false);
      setIsSuperAdmin(false);
    }
  }, []);

  const loginAs = (email: string, role: 'business' | 'super_admin', tenantId?: string) => {
    // This is for testing/legacy - in production, use the login endpoints
    const authSession = {
      type: role,
      user: {
        id: role === 'super_admin' ? 'super-admin' : tenantId || 'temp-id',
        email,
        name: role === 'super_admin' ? 'Super Administrator' : 'Business User',
        businessId: role === 'business' ? tenantId : undefined,
        role: role === 'super_admin' ? 'super_admin' : 'business'
      }
    };
    // Use the setAuth function which handles separate storage
    const { setAuth } = require('../utils/auth');
    setAuth(authSession);
    setUser(authSession.user);
    setIsAuthenticated(true);
    setIsBusiness(role === 'business');
    setIsSuperAdmin(role === 'super_admin');
  };

  const logout = () => {
    clearAuth();
    setUser(null);
    setIsAuthenticated(false);
    setIsBusiness(false);
    setIsSuperAdmin(false);
  };

  return (
    <AccessContext.Provider
      value={{
        user,
        isAuthenticated,
        isBusiness,
        isSuperAdmin,
        loginAs,
        logout
      }}
    >
      {children}
    </AccessContext.Provider>
  );
}

export function useAccess() {
  const context = useContext(AccessContext);
  if (context === undefined) {
    throw new Error('useAccess must be used within an AccessProvider');
  }
  return context;
}
