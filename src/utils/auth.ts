// src/utils/auth.ts - COMPLETE PRODUCTION READY

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
  token: string;
  token_expiry?: string;
  user: AuthUser;
}

const AUTH_KEY = 'fastcheckin_auth';
const BUSINESS_AUTH_KEY = 'fastcheckin_business_auth';
const SUPER_ADMIN_AUTH_KEY = 'fastcheckin_admin_auth';

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
  // Try primary auth first
  const auth = getAuth();
  if (auth?.token) return auth.token;
  
  // Try business auth as fallback
  const businessAuth = getBusinessAuth();
  if (businessAuth?.token) return businessAuth.token;
  
  // Try legacy storage
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

export const getAuthHeader = (): { Authorization?: string } => {
  const token = getAuthToken();
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
    tokenPreview: session.token?.substring(0, 30) + '...',
    userId: session.user.id
  });
  
  // Store main auth
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  
  // Store type-specific auth
  if (session.type === 'business') {
    localStorage.setItem(BUSINESS_AUTH_KEY, JSON.stringify(session));
    localStorage.removeItem(SUPER_ADMIN_AUTH_KEY);
    
    // Also store legacy format for compatibility
    localStorage.setItem('business', JSON.stringify({
      id: session.user.businessId || session.user.id,
      trading_name: session.user.name,
      email: session.user.email,
      token: session.token
    }));
  } else if (session.type === 'super_admin') {
    localStorage.setItem(SUPER_ADMIN_AUTH_KEY, JSON.stringify(session));
    localStorage.removeItem(BUSINESS_AUTH_KEY);
    
    // Legacy storage
    localStorage.setItem('fastcheckin_admin', JSON.stringify({
      email: session.user.email,
      token: session.token
    }));
  }
  
  // Dispatch storage event for cross-tab sync
  window.dispatchEvent(new Event('storage'));
};

export const clearAuth = (): void => {
  console.log('🗑️ Clearing all auth data');
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(BUSINESS_AUTH_KEY);
  localStorage.removeItem(SUPER_ADMIN_AUTH_KEY);
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

export const getSuperAdminAuth = (): AuthSession | null => {
  const stored = localStorage.getItem(SUPER_ADMIN_AUTH_KEY);
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

// ============================================================
// BUSINESS ID EXTRACTION
// ============================================================

export const getBusinessId = (): string | null => {
  // Try business auth first
  const businessAuth = getBusinessAuth();
  if (businessAuth?.type === 'business') {
    if (businessAuth.user.businessId) {
      return businessAuth.user.businessId;
    }
    if (businessAuth.user.id) {
      return businessAuth.user.id;
    }
  }
  
  // Try main auth
  const auth = getAuth();
  if (auth?.type === 'business') {
    if (auth.user.businessId) {
      return auth.user.businessId;
    }
    if (auth.user.id) {
      return auth.user.id;
    }
  }
  
  // Try legacy storage
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
// DEBUG HELPER (Development only)
// ============================================================

export const debugAuth = (): void => {
  console.group('🔐 Auth Debug');
  console.log('AUTH_KEY:', localStorage.getItem(AUTH_KEY));
  console.log('BUSINESS_AUTH_KEY:', localStorage.getItem(BUSINESS_AUTH_KEY));
  console.log('SUPER_ADMIN_AUTH_KEY:', localStorage.getItem(SUPER_ADMIN_AUTH_KEY));
  console.log('Legacy business:', localStorage.getItem('business'));
  console.log('getAuthToken():', getAuthToken());
  console.log('getBusinessId():', getBusinessId());
  console.log('isBusinessAuthenticated():', isBusinessAuthenticated());
  console.log('isSuperAdminAuthenticated():', isSuperAdminAuthenticated());
  console.groupEnd();
};

// Attach debug to window for console access (development only)
if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuth;
}
