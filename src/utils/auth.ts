// src/utils/auth.ts - COMPLETE PRODUCTION READY WITH EMPLOYEE SUPPORT

export type AuthType = 'business' | 'super_admin' | 'employee' | 'platform';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  businessId?: string;
  role?: string;
}

export interface AuthSession {
  type: AuthType;
  token: string;
  token_expiry?: string;
  user: AuthUser;
}

const AUTH_KEY = 'fastcheckin_auth';
const BUSINESS_AUTH_KEY = 'fastcheckin_business_auth';
const SUPER_ADMIN_AUTH_KEY = 'fastcheckin_admin_auth';
const EMPLOYEE_AUTH_KEY = 'fastcheckin_employee_auth';
const PLATFORM_AUTH_KEY = 'fastcheckin_platform_auth';

// ============================================================
// CORE AUTH FUNCTIONS
// ============================================================

export const getAuth = (): AuthSession | null => {
  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const getAuthToken = (): string | null => {
  const auth = getAuth();
  if (auth?.token) return auth.token;
  
  const businessAuth = getBusinessAuth();
  if (businessAuth?.token) return businessAuth.token;
  
  const employeeAuth = getEmployeeAuth();
  if (employeeAuth?.token) return employeeAuth.token;
  
  const legacyBusiness = localStorage.getItem('business');
  if (legacyBusiness) {
    try {
      const parsed = JSON.parse(legacyBusiness);
      if (parsed.token) return parsed.token;
    } catch {
      // Ignore
    }
  }
  
  return null;
};

/**
 * Return the token for the current application context.
 *
 * Business dashboard requests must use the authoritative business session
 * when both business and employee sessions are present. Employee-facing
 * routes continue to use the normal employee/main session.
 */
export const getApiAuthToken = (): string | null => {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  // Super Admin requests must always use the dedicated Super Admin session.
  // getAuth() can contain a stale/other application session when multiple
  // authentication contexts have existed in the same browser.
  if (pathname.startsWith('/super-admin')) {
    const superAdminAuth = getSuperAdminAuth();
    if (superAdminAuth?.type === 'super_admin' && superAdminAuth.token) {
      return superAdminAuth.token;
    }
  }

  // Platform employee requests must use their dedicated session.
  if (pathname.startsWith('/platform')) {
    const platformAuth = getPlatformAuth();
    if (platformAuth?.type === 'platform' && platformAuth.token) return platformAuth.token;
  }

  // Business dashboard requests must use the authoritative business session
  // when both business and employee sessions are present.
  if (pathname.startsWith('/business')) {
    const businessAuth = getBusinessAuth();
    if (businessAuth?.type === 'business' && businessAuth.token) {
      return businessAuth.token;
    }
  }

  return getAuthToken();
};

export const getAuthHeader = (): { Authorization?: string } => {
  const token = getApiAuthToken();
  if (!token) {
    console.warn('⚠️ getAuthHeader: No token found');
    return {};
  }
  return { Authorization: `Bearer ${token}` };
};

export const setAuth = (session: AuthSession): void => {
  console.log('💾 Setting auth session:', {
    type: session.type,
    hasToken: !!session.token,
    userId: session.user.id
  });
  
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  
  if (session.type === 'business') {
    localStorage.setItem(BUSINESS_AUTH_KEY, JSON.stringify(session));
    localStorage.removeItem(SUPER_ADMIN_AUTH_KEY);
    localStorage.removeItem(EMPLOYEE_AUTH_KEY);
  localStorage.removeItem(PLATFORM_AUTH_KEY);
    
    localStorage.setItem('business', JSON.stringify({
      id: session.user.businessId || session.user.id,
      trading_name: session.user.name,
      email: session.user.email,
      token: session.token
    }));
  } else if (session.type === 'super_admin') {
    localStorage.setItem(SUPER_ADMIN_AUTH_KEY, JSON.stringify(session));
    localStorage.removeItem(BUSINESS_AUTH_KEY);
    localStorage.removeItem(EMPLOYEE_AUTH_KEY);
    
    localStorage.setItem('fastcheckin_admin', JSON.stringify({
      email: session.user.email,
      token: session.token
    }));
  } else if (session.type === 'platform') {
    localStorage.setItem(PLATFORM_AUTH_KEY, JSON.stringify(session));
    localStorage.removeItem(BUSINESS_AUTH_KEY);
    localStorage.removeItem(SUPER_ADMIN_AUTH_KEY);
    localStorage.removeItem(EMPLOYEE_AUTH_KEY);
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  } else if (session.type === 'employee') {
    localStorage.setItem(EMPLOYEE_AUTH_KEY, JSON.stringify(session));
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  }
  
  window.dispatchEvent(new Event('storage'));
};

export const clearAuth = (): void => {
  console.log('🗑️ Clearing all auth data');
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(BUSINESS_AUTH_KEY);
  localStorage.removeItem(SUPER_ADMIN_AUTH_KEY);
  localStorage.removeItem(EMPLOYEE_AUTH_KEY);
  localStorage.removeItem('business');
  localStorage.removeItem('fastcheckin_admin');
  localStorage.removeItem('jbay_user');
  localStorage.removeItem('jbay_auth_session');
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  window.dispatchEvent(new Event('storage'));
};

export const clearBusinessAuth = (): void => {
  console.log('🗑️ Clearing business auth only');
  localStorage.removeItem(BUSINESS_AUTH_KEY);
  localStorage.removeItem('business');
  const auth = getAuth();
  if (auth?.type === 'business') {
    localStorage.removeItem(AUTH_KEY);
  }
  window.dispatchEvent(new Event('storage'));
};

export const clearSuperAdminAuth = (): void => {
  console.log('🗑️ Clearing super admin auth only');
  localStorage.removeItem(SUPER_ADMIN_AUTH_KEY);
  localStorage.removeItem('fastcheckin_admin');
  const auth = getAuth();
  if (auth?.type === 'super_admin') {
    localStorage.removeItem(AUTH_KEY);
  }
  window.dispatchEvent(new Event('storage'));
};

export const clearEmployeeAuth = (): void => {
  console.log('🗑️ Clearing employee auth only');
  localStorage.removeItem(EMPLOYEE_AUTH_KEY);
  const auth = getAuth();
  if (auth?.type === 'employee') {
    localStorage.removeItem(AUTH_KEY);
  }
  window.dispatchEvent(new Event('storage'));
};

// ============================================================
// TYPE-SPECIFIC AUTH GETTERS
// ============================================================

export const getBusinessAuth = (): AuthSession | null => {
  const stored = localStorage.getItem(BUSINESS_AUTH_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

const isJwtExpired = (token: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

export const getSuperAdminAuth = (): AuthSession | null => {
  const stored = localStorage.getItem(SUPER_ADMIN_AUTH_KEY);
  if (!stored) return null;
  
  try {
    const session = JSON.parse(stored) as AuthSession;
    if (session?.type !== 'super_admin' || !session.token || isJwtExpired(session.token)) {
      localStorage.removeItem(SUPER_ADMIN_AUTH_KEY);
      const auth = getAuth();
      if (auth?.type === 'super_admin') localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
};

export const getPlatformAuth = (): AuthSession | null => {
  const stored = localStorage.getItem(PLATFORM_AUTH_KEY);
  if (!stored) return null;
  try {
    const session = JSON.parse(stored) as AuthSession;
    if (session?.type !== 'platform' || !session.token || isJwtExpired(session.token)) {
      localStorage.removeItem(PLATFORM_AUTH_KEY);
      const auth = getAuth();
      if (auth?.type === 'platform') localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return session;
  } catch { return null; }
};

export const getEmployeeAuth = (): AuthSession | null => {
  const stored = localStorage.getItem(EMPLOYEE_AUTH_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

// ============================================================
// AUTHENTICATION STATUS CHECKS
// ============================================================

export const isBusinessAuthenticated = (): boolean => {
  const auth = getBusinessAuth();
  const hasToken = !!(auth?.type === 'business' && auth?.token);
  console.log('🔐 isBusinessAuthenticated:', hasToken);
  return hasToken;
};

export const isSuperAdminAuthenticated = (): boolean => {
  const auth = getSuperAdminAuth();
  const hasToken = !!(auth?.type === 'super_admin' && auth?.token);
  console.log('🔐 isSuperAdminAuthenticated:', hasToken);
  return hasToken;
};

export const isEmployeeAuthenticated = (): boolean => {
  const auth = getEmployeeAuth();
  const hasToken = !!(auth?.type === 'employee' && auth?.token);
  console.log('🔐 isEmployeeAuthenticated:', hasToken);
  return hasToken;
};

// ============================================================
// BUSINESS ID EXTRACTION
// ============================================================

export const getBusinessId = (): string | null => {
  const businessAuth = getBusinessAuth();
  if (businessAuth?.type === 'business') {
    if (businessAuth.user.businessId) {
      return businessAuth.user.businessId;
    }
    if (businessAuth.user.id) {
      return businessAuth.user.id;
    }
  }
  
  const auth = getAuth();
  if (auth?.type === 'business') {
    if (auth.user.businessId) {
      return auth.user.businessId;
    }
    if (auth.user.id) {
      return auth.user.id;
    }
  }
  
  const employeeAuth = getEmployeeAuth();
  if (employeeAuth?.type === 'employee') {
    if (employeeAuth.user.businessId) {
      return employeeAuth.user.businessId;
    }
  }
  
  const legacy = localStorage.getItem('business');
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy);
      if (parsed.id) return parsed.id;
      if (parsed.businessId) return parsed.businessId;
    } catch {
      // Ignore
    }
  }
  
  console.warn('⚠️ getBusinessId: No business ID found');
  return null;
};

// ============================================================
// DEBUG HELPER
// ============================================================

export const debugAuth = (): void => {
  console.group('🔐 Auth Debug');
  console.log('AUTH_KEY:', localStorage.getItem(AUTH_KEY));
  console.log('BUSINESS_AUTH_KEY:', localStorage.getItem(BUSINESS_AUTH_KEY));
  console.log('SUPER_ADMIN_AUTH_KEY:', localStorage.getItem(SUPER_ADMIN_AUTH_KEY));
  console.log('EMPLOYEE_AUTH_KEY:', localStorage.getItem(EMPLOYEE_AUTH_KEY));
  console.log('Legacy business:', localStorage.getItem('business'));
  console.log('getAuthToken():', getAuthToken());
  console.log('getBusinessId():', getBusinessId());
  console.log('isBusinessAuthenticated():', isBusinessAuthenticated());
  console.log('isSuperAdminAuthenticated():', isSuperAdminAuthenticated());
  console.log('isEmployeeAuthenticated():', isEmployeeAuthenticated());
  console.groupEnd();
};

if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuth;
}
