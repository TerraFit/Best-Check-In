// src/utils/auditLogger.ts
// Audit identity and tenant scope are established server-side.

interface AuditLogData {
  action: string;
  guest_id?: string;
  employee_id?: string;
  changes: Record<string, any>;
  ip_address?: string;
  business_id?: string;
  user_id?: string;
  user_name?: string;
  user_role?: string;
  description?: string;
  booking_id?: string;
  guest_name?: string;
}

export const createAuditLog = async (data: AuditLogData) => {
  try {
    let businessId = data.business_id || null;
    let token: string | null = null;

    try {
      const authStr = localStorage.getItem('fastcheckin_auth') || localStorage.getItem('fastcheckin_employee_auth');
      if (authStr) {
        const auth = JSON.parse(authStr);
        const user = auth.user || {};
        businessId = businessId || user.businessId || user.business_id || null;
        token = auth.token || auth.access_token || user.token || user.access_token || null;
      }
    } catch (e) {
      console.warn('Could not get authenticated session:', e);
    }

    if (!businessId) {
      try {
        const businessStr = localStorage.getItem('business');
        if (businessStr) businessId = JSON.parse(businessStr).id || null;
      } catch (e) {
        console.warn('Could not get business from storage:', e);
      }
    }

    const logEntry = {
      business_id: businessId || undefined,
      action: data.action,
      details: data.changes || {},
      description: data.description || `${data.action} performed`,
      booking_id: data.booking_id || data.guest_id || null,
      guest_name: data.guest_name || null,
      ip_address: data.ip_address || 'unknown',
      user_agent: navigator.userAgent || 'unknown',
    };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch('/.netlify/functions/create-audit-log', {
      method: 'POST',
      headers,
      body: JSON.stringify(logEntry),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to create audit log:', errorText);
      return { success: false, error: errorText };
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Error creating audit log:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export default createAuditLog;
