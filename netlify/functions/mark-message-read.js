import auth from './_auth.cjs';

const {
  authenticateRequest,
  requireBusinessPermission,
  requirePlatformPermission,
  resolveTenant,
  authFailure,
} = auth;

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

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
    const body = JSON.parse(event.body || '{}');
    const { conversationId, messageIds } = body;

    if (!conversationId || typeof conversationId !== 'string' || conversationId.length > 200) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Conversation ID required' }) };
    }
    if (messageIds !== undefined && (!Array.isArray(messageIds) || messageIds.some((id) => typeof id !== 'string' || id.length > 200))) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid message IDs' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const dbHeaders = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    const conversationParams = new URLSearchParams({
      id: `eq.${conversationId}`,
      select: 'id,business_id',
      limit: '1',
    });
    const conversationResponse = await fetch(`${supabaseUrl}/rest/v1/conversations?${conversationParams.toString()}`, { headers: dbHeaders });
    if (!conversationResponse.ok) {
      console.error('Conversation authorization lookup failed:', conversationResponse.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to authorize conversation' }) };
    }

    const conversations = await conversationResponse.json();
    const conversation = Array.isArray(conversations) ? conversations[0] : null;
    if (!conversation) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Conversation not found' }) };
    }

    let businessId = conversation.business_id;
    if (!isPlatform) {
      const tenant = resolveTenant(principal, conversation.business_id);
      if (!tenant.ok) return authFailure(tenant, headers);
      businessId = tenant.businessId;
    }

    // Reader identity is authoritative: business actors are the business side;
    // platform actors are the admin side. Never trust readerType from the client.
    const readerType = isPlatform ? 'admin' : 'business';
    const senderType = readerType === 'admin' ? 'business' : 'admin';

    const messageParams = new URLSearchParams({
      conversation_id: `eq.${conversationId}`,
      is_read: 'eq.false',
      sender_type: `eq.${senderType}`,
    });
    if (Array.isArray(messageIds) && messageIds.length > 0) {
      messageParams.set('id', `in.(${messageIds.map((id) => encodeURIComponent(id)).join(',')})`);
    }

    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/messages?${messageParams.toString()}`, {
      method: 'PATCH',
      headers: { ...dbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() }),
    });

    if (!updateResponse.ok) {
      console.error('Error marking messages as read:', updateResponse.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to mark messages as read' }) };
    }

    const unreadField = readerType === 'admin' ? 'unread_count_admin' : 'unread_count_business';
    const conversationUpdateResponse = await fetch(
      `${supabaseUrl}/rest/v1/conversations?id=eq.${encodeURIComponent(conversationId)}&business_id=eq.${encodeURIComponent(businessId)}`,
      {
        method: 'PATCH',
        headers: { ...dbHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({ [unreadField]: 0 }),
      }
    );

    if (!conversationUpdateResponse.ok) {
      console.error('Conversation unread-count update failed:', conversationUpdateResponse.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update conversation state' }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Messages marked as read' })
    };
  } catch (error) {
    console.error('Unhandled mark-message-read error:', error?.message || error);
    if (error instanceof SyntaxError) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON in request body' }) };
    }
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
