import auth from './_auth.cjs';

const { authenticateRequest, requireBusinessPermission, requirePlatformPermission, resolveTenant, authFailure } = auth;

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
    if (!requirePlatformPermission(principal, 'platform:businesses:read')) return authFailure({ status: 403, error: 'Missing permission: platform:businesses:read' }, headers);
  } else if (!requireBusinessPermission(principal, 'canViewDashboard')) {
    return authFailure({ status: 403, error: 'Missing permission: canViewDashboard' }, headers);
  }

  try {
    const { businessId: requestedBusinessId, status = 'active', limit = 50 } = event.queryStringParameters || {};
    const parsedLimit = Number.parseInt(limit, 10);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid limit' }) };

    let businessId = null;
    if (!isPlatform) {
      const tenant = resolveTenant(principal, requestedBusinessId);
      if (!tenant.ok) return authFailure(tenant, headers);
      businessId = tenant.businessId;
    } else if (requestedBusinessId) {
      businessId = String(requestedBusinessId);
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('Messaging configuration is incomplete');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }
    const dbHeaders = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };
    const params = new URLSearchParams({
      select: '*,business:businesses(trading_name,email,phone),last_message:messages(message,sender_name,created_at)',
      order: 'last_message_at.desc',
      limit: String(parsedLimit)
    });
    if (businessId) params.set('business_id', `eq.${businessId}`);
    if (status) params.set('status', `eq.${String(status)}`);

    const response = await fetch(`${supabaseUrl}/rest/v1/conversations?${params.toString()}`, { headers: dbHeaders });
    if (!response.ok) {
      console.error('Conversation lookup failed:', response.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch conversations' }) };
    }
    const conversations = await response.json();
    if (!Array.isArray(conversations)) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch conversations' }) };

    const conversationsWithUnread = await Promise.all(conversations.map(async (conv) => {
      const unreadParams = new URLSearchParams({ conversation_id: `eq.${conv.id}`, is_read: 'eq.false', sender_type: 'neq.admin', select: 'id' });
      const unreadResponse = await fetch(`${supabaseUrl}/rest/v1/messages?${unreadParams.toString()}`, { headers: dbHeaders });
      if (!unreadResponse.ok) {
        console.error('Unread message lookup failed:', unreadResponse.status);
        return { ...conv, unread_messages: 0 };
      }
      const unread = await unreadResponse.json();
      return { ...conv, unread_messages: Array.isArray(unread) ? unread.length : 0 };
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ conversations: conversationsWithUnread, total: conversationsWithUnread.length }) };
  } catch (error) {
    console.error('Unhandled get-conversations error:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
