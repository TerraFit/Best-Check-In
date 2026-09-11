import auth from './_auth.cjs';
import { Resend } from 'resend';

const { authenticateRequest, requireBusinessPermission, requirePlatformPermission, resolveTenant, authFailure } = auth;

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

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
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON in request body' }) };
    }

    const conversationId = typeof body.conversationId === 'string' && body.conversationId.trim() ? body.conversationId.trim() : null;
    const requestedBusinessId = typeof body.businessId === 'string' && body.businessId.trim() ? body.businessId.trim() : null;
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const sendEmail = body.sendEmail === true;

    if (!message || message.length > 10000) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid message required' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('Messaging configuration is incomplete');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }
    const dbHeaders = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' };

    let finalConversationId = conversationId;
    let targetBusinessId = null;

    if (conversationId) {
      const conversationResponse = await fetch(
        `${supabaseUrl}/rest/v1/conversations?id=eq.${encodeURIComponent(conversationId)}&select=id,business_id&limit=1`,
        { headers: dbHeaders }
      );
      if (!conversationResponse.ok) {
        console.error('Conversation authorization lookup failed:', conversationResponse.status);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to access conversation' }) };
      }
      const conversations = await conversationResponse.json();
      if (!Array.isArray(conversations) || conversations.length !== 1) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Conversation not found' }) };
      }
      targetBusinessId = String(conversations[0].business_id);
    } else {
      targetBusinessId = requestedBusinessId;
      if (!targetBusinessId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Business ID required' }) };
      }
    }

    const tenant = resolveTenant(principal, targetBusinessId);
    if (!tenant.ok) return authFailure(tenant, headers);
    targetBusinessId = tenant.businessId;

    if (!conversationId) {
      const newConversationResponse = await fetch(`${supabaseUrl}/rest/v1/conversations`, {
        method: 'POST',
        headers: { ...dbHeaders, Prefer: 'return=representation' },
        body: JSON.stringify([{
          business_id: targetBusinessId,
          subject: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          created_by: isPlatform ? principal.userId : null
        }])
      });
      if (!newConversationResponse.ok) {
        console.error('Conversation creation failed:', newConversationResponse.status);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create conversation' }) };
      }
      const created = await newConversationResponse.json();
      if (!Array.isArray(created) || created.length !== 1 || !created[0]?.id) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create conversation' }) };
      }
      finalConversationId = created[0].id;
    }

    const senderType = isPlatform ? 'admin' : 'business';
    const senderId = principal.employeeId || principal.userId || null;
    const senderName = principal.email || (isPlatform ? 'FastCheckIn Support' : 'Business');

    const messageResponse = await fetch(`${supabaseUrl}/rest/v1/messages`, {
      method: 'POST',
      headers: { ...dbHeaders, Prefer: 'return=representation' },
      body: JSON.stringify([{
        conversation_id: finalConversationId,
        sender_type: senderType,
        sender_id: senderId,
        sender_name: senderName,
        message
      }])
    });
    if (!messageResponse.ok) {
      console.error('Message creation failed:', messageResponse.status);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to send message' }) };
    }
    const createdMessages = await messageResponse.json();
    const newMessage = Array.isArray(createdMessages) ? createdMessages[0] : null;

    await fetch(`${supabaseUrl}/rest/v1/conversations?id=eq.${encodeURIComponent(String(finalConversationId))}&business_id=eq.${encodeURIComponent(targetBusinessId)}`, {
      method: 'PATCH',
      headers: { ...dbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ last_message_at: new Date().toISOString() })
    });

    const recipientType = isPlatform ? 'business' : 'admin';
    const recipientId = isPlatform ? targetBusinessId : null;
    if (recipientId) {
      await fetch(`${supabaseUrl}/rest/v1/notifications`, {
        method: 'POST',
        headers: { ...dbHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify([{
          user_type: recipientType,
          user_id: recipientId,
          type: 'message',
          title: `New message from ${senderName}`,
          message: message.substring(0, 100),
          related_id: finalConversationId
        }])
      });
    }

    if (sendEmail && isPlatform) {
      const businessResponse = await fetch(
        `${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(targetBusinessId)}&select=email&limit=1`,
        { headers: dbHeaders }
      );
      if (businessResponse.ok) {
        const businesses = await businessResponse.json();
        const recipientEmail = Array.isArray(businesses) ? businesses[0]?.email : null;
        if (recipientEmail) {
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: 'FastCheckin Messages <messages@fastcheckin.app>',
            to: [recipientEmail],
            subject: `New message from ${senderName}`,
            html: `<h3>You have a new message</h3><p><strong>From:</strong> ${senderName}</p><p><strong>Message:</strong> ${message}</p><a href="https://fastcheckin.app/messages/${finalConversationId}">View Message</a>`
          });
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, conversationId: finalConversationId, message: newMessage })
    };
  } catch (error) {
    console.error('Unhandled message error:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
