import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAuth, clearAuth, getBusinessAuth, getSuperAdminAuth, setAuth } from '../utils/auth';

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
  const [loading, setLoading] = useState(true);

  const loadAuth = () => {
    console.log('🔍 Loading auth from storage...');
    
    const businessAuth = getBusinessAuth();
    const superAdminAuth = getSuperAdminAuth();
    const mainAuth = getAuth();

    console.log('businessAuth:', businessAuth);
    console.log('superAdminAuth:', superAdminAuth);
    console.log('mainAuth:', mainAuth);

    if (businessAuth?.type === 'business') {
      setUser(businessAuth.user);
      setIsAuthenticated(true);
      setIsBusiness(true);
      setIsSuperAdmin(false);
      console.log('✅ Business auth loaded');
      return;
    }

    if (superAdminAuth?.type === 'super_admin') {
      setUser(superAdminAuth.user);
      setIsAuthenticated(true);
      setIsBusiness(false);
      setIsSuperAdmin(true);
      console.log('✅ Super admin auth loaded');
      return;
    }

    if (mainAuth?.type === 'business') {
      setUser(mainAuth.user);
      setIsAuthenticated(true);
      setIsBusiness(true);
      setIsSuperAdmin(false);
      console.log('✅ Business auth loaded from main');
      return;
    }

    if (mainAuth?.type === 'super_admin') {
      setUser(mainAuth.user);
      setIsAuthenticated(true);
      setIsBusiness(false);
      setIsSuperAdmin(true);
      console.log('✅ Super admin auth loaded from main');
      return;
    }

    setUser(null);
    setIsAuthenticated(false);
    setIsBusiness(false);
    setIsSuperAdmin(false);
    console.log('❌ No auth found');
  };

  useEffect(() => {
    loadAuth();
    setLoading(false);

    // Listen for storage changes (important for cross-tab consistency)
    window.addEventListener('storage', loadAuth);

    return () => window.removeEventListener('storage', loadAuth);
  }, []);

  const loginAs = (email: string, role: 'business' | 'super_admin', tenantId?: string) => {
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
    setAuth(authSession);
    loadAuth();
  };

  const logout = () => {
    clearAuth();
    loadAuth();
  };

  // Don't render children until auth is loaded to prevent redirect loops
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

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
