// src/hooks/useAuth.ts
import { useNavigate } from 'react-router-dom'

export function useAuth() {
  const navigate = useNavigate()

  const getAuthHeaders = () => {
    let token = null;
    
    try {
      const authStr = localStorage.getItem('fastcheckin_auth');
      if (authStr) {
        const auth = JSON.parse(authStr);
        token = auth.token;
      }
    } catch (e) {}
    
    if (!token) {
      try {
        const businessAuthStr = localStorage.getItem('fastcheckin_business_auth');
        if (businessAuthStr) {
          const businessAuth = JSON.parse(businessAuthStr);
          token = businessAuth.token;
        }
      } catch (e) {}
    }
    
    if (token) {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
    }
    
    return { 'Content-Type': 'application/json' };
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const headers = getAuthHeaders();
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });
    return response;
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('fastcheckin_auth');
      localStorage.removeItem('fastcheckin_business_auth');
      localStorage.removeItem('business');
      navigate('/business/login');
    }
  };

  const getBusinessId = (): string | null => {
    try {
      const businessStr = localStorage.getItem('business');
      if (businessStr) {
        const business = JSON.parse(businessStr);
        return business.id || null;
      }
    } catch (e) {}
    
    try {
      const authStr = localStorage.getItem('fastcheckin_business_auth');
      if (authStr) {
        const auth = JSON.parse(authStr);
        return auth.businessId || null;
      }
    } catch (e) {}
    
    return null;
  };

  return {
    getAuthHeaders,
    fetchWithAuth,
    handleLogout,
    getBusinessId
  }
}
