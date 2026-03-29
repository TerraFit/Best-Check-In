// Add these to your existing auth.ts file

const BUSINESS_AUTH_KEY = 'fastcheckin_business_auth';
const SUPER_ADMIN_AUTH_KEY = 'fastcheckin_admin_auth';

// Get business auth specifically
export const getBusinessAuth = (): AuthSession | null => {
  const stored = localStorage.getItem(BUSINESS_AUTH_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

// Get super admin auth specifically
export const getSuperAdminAuth = (): AuthSession | null => {
  const stored = localStorage.getItem(SUPER_ADMIN_AUTH_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

// Clear ONLY super admin auth
export const clearSuperAdminAuth = (): void => {
  localStorage.removeItem(SUPER_ADMIN_AUTH_KEY);
  localStorage.removeItem('fastcheckin_admin');
  const auth = getAuth();
  if (auth?.type === 'super_admin') {
    localStorage.removeItem(AUTH_KEY);
  }
};

// Update setAuth to also store in separate keys
export const setAuth = (session: AuthSession): void => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  
  if (session.type === 'business') {
    localStorage.setItem(BUSINESS_AUTH_KEY, JSON.stringify(session));
    localStorage.removeItem(SUPER_ADMIN_AUTH_KEY);
  } else if (session.type === 'super_admin') {
    localStorage.setItem(SUPER_ADMIN_AUTH_KEY, JSON.stringify(session));
    localStorage.removeItem(BUSINESS_AUTH_KEY);
  }
};
