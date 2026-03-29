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
const BUSINESS_AUTH_KEY = 'fastcheckin_business_auth';
const SUPER_ADMIN_AUTH_KEY = 'fastcheckin_admin_auth';

export const getAuth = (): AuthSession | null => {
  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const setAuth = (session: AuthSession): void => {
  console.log('💾 Setting auth:', session);
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  
  if (session.type === 'business') {
    localStorage.setItem(BUSINESS_AUTH_KEY, JSON.stringify(session));
    localStorage.removeItem(SUPER_ADMIN_AUTH_KEY);
  } else if (session.type === 'super_admin') {
    localStorage.setItem(SUPER_ADMIN_AUTH_KEY, JSON.stringify(session));
    localStorage.removeItem(BUSINESS_AUTH_KEY);
  }
  
  // Dispatch storage event for cross-tab sync
  window.dispatchEvent(new Event('storage'));
};

export const clearAuth = (): void => {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(BUSINESS_AUTH_KEY);
  localStorage.removeItem(SUPER_ADMIN_AUTH_KEY);
  localStorage.removeItem('business');
  localStorage.removeItem('fastcheckin_admin');
  localStorage.removeItem('jbay_user');
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  window.dispatchEvent(new Event('storage'));
};

export const clearBusinessAuth = (): void => {
  localStorage.removeItem(BUSINESS_AUTH_KEY);
  localStorage.removeItem('business');
  const auth = getAuth();
  if (auth?.type === 'business') {
    localStorage.removeItem(AUTH_KEY);
  }
  window.dispatchEvent(new Event('storage'));
};

export const clearSuperAdminAuth = (): void => {
  localStorage.removeItem(SUPER_ADMIN_AUTH_KEY);
  localStorage.removeItem('fastcheckin_admin');
  const auth = getAuth();
  if (auth?.type === 'super_admin') {
    localStorage.removeItem(AUTH_KEY);
  }
  window.dispatchEvent(new Event('storage'));
};

export const getBusinessAuth = (): AuthSession | null => {
  const stored = localStorage.getItem(BUSINESS_AUTH_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const getSuperAdminAuth = (): AuthSession | null => {
  const stored = localStorage.getItem(SUPER_ADMIN_AUTH_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const isBusinessAuthenticated = (): boolean => {
  const auth = getBusinessAuth();
  return auth?.type === 'business';
};

export const isSuperAdminAuthenticated = (): boolean => {
  const auth = getSuperAdminAuth();
  return auth?.type === 'super_admin';
};

export const getBusinessId = (): string | null => {
  const businessAuth = getBusinessAuth();
  if (businessAuth?.type === 'business' && businessAuth.user.businessId) {
    return businessAuth.user.businessId;
  }
  
  const auth = getAuth();
  if (auth?.type === 'business' && auth.user.businessId) {
    return auth.user.businessId;
  }
  
  const legacy = localStorage.getItem('business');
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy);
      if (parsed.id) return parsed.id;
    } catch {
      // Ignore
    }
  }
  
  return null;
};
