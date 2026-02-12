

import React, { createContext, useContext, useEffect, useState } from 'react';

const AccessContext = createContext();

export const AccessProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from Netlify Identity or localStorage (for testing)
  useEffect(() => {
    // For testing: you can set a test user
    // In production, this would come from Netlify Identity / your auth system
    const loadUser = async () => {
      try {
        // Check for existing session
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

  // SUPER ADMIN: You bypass everything
  const isSuperAdmin = user?.role === 'super_admin';
  
  // TENANT ADMIN: Hotel manager with full access to their hotel
  const isTenantAdmin = user?.role === 'tenant_admin';
  
  // VIEWER: Read-only staff
  const isViewer = user?.role === 'viewer';

  // Permission checker
  const can = (permission, resource) => {
    // SUPER ADMIN: YES to everything, everywhere
    if (isSuperAdmin) return true;
    
    // Not logged in? NO
    if (!user) return false;
    
    // TENANT ADMIN: Only their own hotel
    if (isTenantAdmin) {
      // Must have tenantId and it must match
      if (!resource?.tenantId || resource.tenantId !== user.tenantId) {
        return false;
      }
      // Full CRUD on their hotel
      return ['create', 'read', 'update', 'delete'].includes(permission);
    }
    
    // VIEWER: Read-only on their hotel
    if (isViewer) {
      if (!resource?.tenantId || resource.tenantId !== user.tenantId) {
        return false;
      }
      return permission === 'read';
    }
    
    return false;
  };

  // Login function (for testing - replace with real auth later)
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

  // Logout
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
