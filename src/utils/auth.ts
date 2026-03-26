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

export const setAuth = (session: AuthSession) => {
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

export const clearAuth = () => {
  localStorage.removeItem(AUTH_KEY);
  // Clean up legacy keys
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

// FIXED: Proper getBusinessId with fallback
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
      return parsed.id || null;
    } catch {
      return null;
    }
  }
  
  return null;
};
