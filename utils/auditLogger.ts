// src/utils/auditLogger.ts
// ✅ FIXED: Uses the same API endpoint as the backend

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

/**
 * Create an audit log entry via the backend API
 * This matches the structure expected by create-audit-log.js
 */
export const createAuditLog = async (data: AuditLogData) => {
  try {
    // Get user info from localStorage
    let userId = '00000000-0000-0000-0000-000000000000';
    let userName = 'System';
    let userRole = 'owner';
    let businessId = data.business_id || null;

    try {
      const authStr = localStorage.getItem('fastcheckin_auth');
      if (authStr) {
        const auth = JSON.parse(authStr);
        const user = auth.user || {};
        userId = user.id || '00000000-0000-0000-0000-000000000000';
        userName = user.name || user.full_name || user.email || 'System';
        userRole = user.role || 'owner';
        businessId = businessId || user.businessId || null;
      }
    } catch (e) {
      console.warn('Could not get user from auth:', e);
    }

    // Try to get business_id from business storage if still null
    if (!businessId) {
      try {
        const businessStr = localStorage.getItem('business');
        if (businessStr) {
          const business = JSON.parse(businessStr);
          businessId = business.id || null;
        }
      } catch (e) {
        console.warn('Could not get business from storage:', e);
      }
    }

    // Build the log entry matching the backend schema
    const logEntry = {
      business_id: businessId || 'unknown',
      user_id: data.user_id || userId,
      user_name: data.user_name || userName,
      user_role: data.user_role || userRole,
      action: data.action,
      details: data.changes || {},
      description: data.description || `${data.action} performed`,
      booking_id: data.booking_id || data.guest_id || null,
      guest_name: data.guest_name || null,
      ip_address: data.ip_address || 'unknown',
      user_agent: navigator.userAgent || 'unknown',
    };

    console.log('📝 Creating audit log:', logEntry);

    // ✅ Call the backend function (not direct Supabase)
    const response = await fetch('/.netlify/functions/create-audit-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logEntry),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to create audit log:', errorText);
      return { success: false, error: errorText };
    }

    const result = await response.json();
    console.log('✅ Audit log created:', result);
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
