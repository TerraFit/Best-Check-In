import auth from './_auth.cjs';

const { authenticateRequest, requireBusinessPermission, requirePlatformPermission, authFailure } = auth;

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'DELETE') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const authentication = authenticateRequest(event);
  if (!authentication.ok) return authFailure(authentication, headers);
  const principal = authentication.principal;
  const isPlatform = ['super_admin', 'platform'].includes(principal.actorType);
  if (isPlatform) {
    if (!requirePlatformPermission(principal, 'platform:businesses:read')) return authFailure({ status: 403, error: 'Missing permission: platform:businesses:read' }, headers);
  } else if (!requireBusinessPermission(principal, 'canViewDashboard')) {
    return authFailure({ status: 403, error: 'Missing permission: canViewDashboard' }, headers);
  }

  try {
    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON in request body' }) }; }
    const notificationId = typeof body.notificationId === 'string' ? body.notificationId.trim() : '';
    if (!notificationId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Notification ID required' }) };

    // Bind the mutation to the same notification identity used by get/mark-read.
    // Employees must never be able to mutate a business owner's notification.
    const targetUserType = isPlatform ? 'admin' : (principal.actorType === 'employee' ? 'employee' : 'business');
    const targetUserId = isPlatform ? principal.userId : (principal.actorType === 'employee' ? principal.employeeId : principal.businessId);
    if (!targetUserId) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('Notification configuration is incomplete');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/notifications?id=eq.${encodeURIComponent(notificationId)}&user_type=eq.${encodeURIComponent(targetUserType)}&user_id=eq.${encodeURIComponent(String(targetUserId))}`, {
      method: 'PATCH',
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() })
    });
    if (!response.ok) {
      console.error('Notification update failed:', response.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to delete notification' }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Notification deleted' }) };
  } catch (error) {
    console.error('Unhandled notification delete error:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
