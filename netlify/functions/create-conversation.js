import auth from './_auth.cjs';

const { requireBusinessActor, requireBusinessPermission, resolveTenant, authFailure } = auth;

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const actor = requireBusinessActor(event);
  if (!actor.ok) return authFailure(actor, headers);
  if (!requireBusinessPermission(actor.principal, 'canViewDashboard')) {
    return authFailure({ status: 403, error: 'Forbidden' }, headers);
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }

  const { businessId: requestedBusinessId, subject, initialMessage, priority = 'normal' } = body;
  if (!requestedBusinessId || !subject) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Business ID and subject required' }) };
  }

  const tenant = resolveTenant(actor.principal, requestedBusinessId);
  if (!tenant.ok) return authFailure(tenant, headers);
  const businessId = tenant.businessId;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  const supabaseHeaders = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  };

  try {
    const businessResponse = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(businessId)}&select=id,trading_name,email`,
      { headers: supabaseHeaders }
    );
    if (!businessResponse.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to load business' }) };
    const businesses = await businessResponse.json();
    const business = Array.isArray(businesses) ? businesses[0] : null;
    if (!business) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Business not found' }) };

    const conversationResponse = await fetch(`${supabaseUrl}/rest/v1/conversations`, {
      method: 'POST',
      headers: { ...supabaseHeaders, Prefer: 'return=representation' },
      body: JSON.stringify([{
        business_id: businessId,
        subject: String(subject).trim(),
        priority,
        business_name: business.trading_name,
        business_email: business.email
      }])
    });
    if (!conversationResponse.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create conversation' }) };
    const rows = await conversationResponse.json();
    const conversation = Array.isArray(rows) ? rows[0] : rows;
    if (!conversation?.id) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create conversation' }) };

    if (initialMessage) {
      const senderId = actor.principal.employeeId || actor.principal.userId || null;
      const senderName = actor.principal.email || 'Business user';
      const messageResponse = await fetch(`${supabaseUrl}/rest/v1/messages`, {
        method: 'POST',
        headers: { ...supabaseHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify([{
          conversation_id: conversation.id,
          sender_type: 'business',
          sender_id: senderId,
          sender_name: senderName,
          message: String(initialMessage)
        }])
      });
      if (!messageResponse.ok) console.error('Error adding initial message:', messageResponse.status);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, conversation, message: 'Conversation created successfully' })
    };
  } catch (error) {
    console.error('Unhandled create-conversation error:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create conversation' }) };
  }
};
