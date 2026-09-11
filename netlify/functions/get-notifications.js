import auth from './_auth.cjs';

const { authenticateRequest, requireBusinessPermission, requirePlatformPermission, authFailure } = auth;

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const authentication = authenticateRequest(event);
  if (!authentication.ok) return authFailure(authentication, headers);

  const principal = authentication.principal;
  const isPlatform = ['super_admin', 'platform'].includes(principal.actorType);
  if (isPlatform) {
    if (!requirePlatformPermission(principal, 'platform:businesses:read')) {
      return authFailure({ status: 403, error: 'Missing permission: platform:businesses:read' }, headers);
    }
  } else if (!requireBusinessPermission(principal, 'canViewDashboard')) {
    return authFailure({ status: 403, error: 'Missing permission: canViewDashboard' }, headers);
  }

  try {
    const params = event.queryStringParameters || {};
    const requestedUserType = typeof params.userType === 'string' ? params.userType.trim() : '';
    const requestedUserId = typeof params.userId === 'string' ? params.userId.trim() : '';
    const unreadOnly = params.unreadOnly === 'true';
    const rawLimit = params.limit == null ? 20 : Number(params.limit);
    if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid limit' }) };
    }

    const targetUserType = isPlatform ? 'admin' : (principal.actorType === 'employee' ? 'employee' : 'business');
    const targetUserId = isPlatform ? principal.userId : (principal.actorType === 'employee' ? principal.employeeId : principal.businessId);
    if (!targetUserId) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };

    if (requestedUserType && requestedUserType !== targetUserType) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };
    }
    if (requestedUserId && requestedUserId !== String(targetUserId)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('Notification configuration is incomplete');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const baseUrl = `${supabaseUrl}/rest/v1/notifications`;
    const query = new URLSearchParams();
    query.set('user_type', `eq.${targetUserType}`);
    query.set('user_id', `eq.${String(targetUserId)}`);
    query.set('order', 'created_at.desc');
    query.set('limit', String(rawLimit));
    if (unreadOnly) query.set('is_read', 'eq.false');

    const response = await fetch(`${baseUrl}?${query.toString()}`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    if (!response.ok) {
      console.error('Notification fetch failed:', response.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch notifications' }) };
    }
    const notifications = await response.json();

    const unreadQuery = new URLSearchParams();
    unreadQuery.set('user_type', `eq.${targetUserType}`);
    unreadQuery.set('user_id', `eq.${String(targetUserId)}`);
    unreadQuery.set('is_read', 'eq.false');
    unreadQuery.set('select', 'id');

    const countResponse = await fetch(`${baseUrl}?${unreadQuery.toString()}`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    if (!countResponse.ok) {
      console.error('Notification unread-count fetch failed:', countResponse.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch notification count' }) };
    }
    const unreadRows = await countResponse.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ notifications, unread_count: Array.isArray(unreadRows) ? unreadRows.length : 0 })
    };
  } catch (error) {
    console.error('Unhandled notification fetch error:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
