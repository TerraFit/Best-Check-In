import React, { createContext, useContext, useEffect, useState } from 'react';

const AccessContext = createContext();

export const AccessProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = localStorage.getItem('jbay_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const isSuperAdmin = user?.role === 'super_admin';
  const isTenantAdmin = user?.role === 'tenant_admin';
  const isViewer = user?.role === 'viewer';

  const can = (permission, resource) => {
    if (isSuperAdmin) return true;
    if (!user) return false;
    
    if (isTenantAdmin) {
      if (!resource?.tenantId || resource.tenantId !== user.tenantId) {
        return false;
      }
      return ['create', 'read', 'update', 'delete'].includes(permission);
    }
    
    if (isViewer) {
      if (!resource?.tenantId || resource.tenantId !== user.tenantId) {
        return false;
      }
      return permission === 'read';
    }
    
    return false;
  };

  const loginAs = (email, role, tenantId = null) => {
    const newUser = {
      email,
      role,
      tenantId,
      name: email.split('@')[0],
      id: `user-${Date.now()}`
    };
    setUser(newUser);
    localStorage.setItem('jbay_user', JSON.stringify(newUser));
    return newUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('jbay_user');
  };

  const value = {
    user,
    isSuperAdmin,
    isTenantAdmin,
    isViewer,
    can,
    loginAs,
    logout,
    loading
  };

  return (
    <AccessContext.Provider value={value}>
      {!loading && children}
    </AccessContext.Provider>
  );
};

export const useAccess = () => {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error('useAccess must be used within AccessProvider');
  }
  return context;
};
