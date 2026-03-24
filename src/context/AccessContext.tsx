import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAuth, clearAuth, AuthSession } from '../utils/auth';

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
    // Sync with unified auth system
    const auth = getAuth();
    if (auth) {
      setUser(auth.user);
      setIsAuthenticated(true);
      setIsBusiness(auth.type === 'business');
      setIsSuperAdmin(auth.type === 'super_admin');
    } else {
      setUser(null);
      setIsAuthenticated(false);
      setIsBusiness(false);
      setIsSuperAdmin(false);
    }
  }, []);

  const loginAs = (email: string, role: 'business' | 'super_admin', tenantId?: string) => {
    // This is for testing/legacy - in production, use the login endpoints
    const authSession: AuthSession = {
      type: role,
      user: {
        id: role === 'super_admin' ? 'super-admin' : tenantId || 'temp-id',
        email,
        name: role === 'super_admin' ? 'Super Administrator' : 'Business User',
        businessId: role === 'business' ? tenantId : undefined,
        role: role === 'super_admin' ? 'super_admin' : 'business'
      }
    };
    localStorage.setItem('fastcheckin_auth', JSON.stringify(authSession));
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
