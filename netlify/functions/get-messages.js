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
    if (!requirePlatformPermission(principal, 'platform:businesses:read')) {
      return authFailure({ status: 403, error: 'Missing permission: platform:businesses:read' }, headers);
    }
  } else if (!requireBusinessPermission(principal, 'canViewDashboard')) {
    return authFailure({ status: 403, error: 'Missing permission: canViewDashboard' }, headers);
  }

  try {
    const { conversationId, limit = 50, before } = event.queryStringParameters || {};
    if (!conversationId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Conversation ID required' }) };

    const parsedLimit = Number.parseInt(limit, 10);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid limit' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('Messaging configuration is incomplete');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }
    const dbHeaders = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

    const conversationResponse = await fetch(
      `${supabaseUrl}/rest/v1/conversations?id=eq.${encodeURIComponent(String(conversationId))}&select=id,business_id,subject,status,priority,last_message_at,created_at&limit=1`,
      { headers: dbHeaders }
    );
    if (!conversationResponse.ok) {
      console.error('Conversation lookup failed:', conversationResponse.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch conversation' }) };
    }
    const conversations = await conversationResponse.json();
    if (!Array.isArray(conversations) || conversations.length !== 1) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Conversation not found' }) };
    }

    const conversation = conversations[0];
    const tenant = resolveTenant(principal, conversation.business_id);
    if (!tenant.ok) return authFailure(tenant, headers);

    const params = new URLSearchParams({
      conversation_id: `eq.${conversation.id}`,
      select: '*',
      order: 'created_at.desc',
      limit: String(parsedLimit)
    });
    if (before) params.set('created_at', `lt.${String(before)}`);

    const messageResponse = await fetch(`${supabaseUrl}/rest/v1/messages?${params.toString()}`, { headers: dbHeaders });
    if (!messageResponse.ok) {
      console.error('Message lookup failed:', messageResponse.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch messages' }) };
    }
    const messages = await messageResponse.json();
    if (!Array.isArray(messages)) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch messages' }) };

    messages.reverse();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ conversation, messages, has_more: messages.length === parsedLimit })
    };
  } catch (error) {
    console.error('Unhandled get-messages error:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
