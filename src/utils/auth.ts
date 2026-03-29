export type AuthType = 'business' | 'super_admin';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  businessId?: string;
  role?: string;
}

export interface AuthSession {
  type: AuthType;
  user: AuthUser;
  token?: string;
}

const AUTH_KEY = 'fastcheckin_auth';

export const setAuth = (session: AuthSession): void => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
};

export const getAuth = (): AuthSession | null => {
  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const clearAuth = (): void => {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem('business');
  localStorage.removeItem('fastcheckin_admin');
  localStorage.removeItem('jbay_user');
  localStorage.removeItem('user');
  localStorage.removeItem('token');
};

export const isBusinessAuthenticated = (): boolean => {
  const auth = getAuth();
  return auth?.type === 'business';
};

export const isSuperAdminAuthenticated = (): boolean => {
  const auth = getAuth();
  return auth?.type === 'super_admin';
};

export const getBusinessId = (): string | null => {
  // Try new auth first
  const auth = getAuth();
  if (auth?.type === 'business' && auth.user.businessId) {
    return auth.user.businessId;
  }
  
  // Fallback to legacy localStorage for existing logins
  const legacy = localStorage.getItem('business');
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy);
      if (parsed.id) return parsed.id;
    } catch {
      // Ignore parse errors
    }
  }
  
  // Additional fallback for direct business_id storage
  const directId = localStorage.getItem('business_id');
  if (directId) return directId;
  
  // Last resort: check for jbay_user
  const jbayUser = localStorage.getItem('jbay_user');
  if (jbayUser) {
    try {
      const parsed = JSON.parse(jbayUser);
      if (parsed.tenantId) return parsed.tenantId;
    } catch {
      // Ignore
    }
  }
  
  return null;
};
