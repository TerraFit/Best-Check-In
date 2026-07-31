// netlify/functions/contact-lost-found-guest.js
// Record guest communication on a Lost & Found item
// Optional email send via Resend when method=email and guest_email present

async function writeAudit(supabaseUrl, key, entry) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify([entry]),
    });
  } catch (e) {
    console.warn('audit failed', e.message);
  }
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const businessId = body.businessId || body.business_id;
    const itemId = body.itemId || body.item_id;
    const method = body.method || 'email';

    if (!businessId || !itemId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'businessId and itemId required' }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const itemRes = await fetch(
      `${supabaseUrl}/rest/v1/lost_and_found?id=eq.${itemId}&business_id=eq.${businessId}&select=*`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } }
    );
    const rows = itemRes.ok ? await itemRes.json() : [];
    if (!rows.length) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Item not found' }) };
    }
    const item = rows[0];

    // Optional email via Resend
    let emailSent = false;
    if (method === 'email' && item.guest_email && process.env.RESEND_API_KEY) {
      try {
        const emailBody = body.message ||
          `Dear ${item.guest_name || 'Guest'},\n\n` +
          `We found an item that may belong to you during your recent stay.\n\n` +
          `Tag: ${item.tag_number || 'N/A'}\n` +
          `Item: ${item.item_name || 'Item'}\n` +
          (item.description ? `Description: ${item.description}\n` : '') +
          `\nPlease contact us to arrange collection.\n\nKind regards`;

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM || 'FastCheckIn <noreply@fastcheckin.co.za>',
            to: [item.guest_email],
            subject: body.subject || `Lost & Found — ${item.tag_number || item.item_name}`,
            text: emailBody,
          }),
        });
        emailSent = emailRes.ok;
      } catch (e) {
        console.warn('email send failed', e.message);
      }
    }

    const newStatus = body.new_status || 'guest_contacted';
    const fromStatus = item.status;

    const actRes = await fetch(`${supabaseUrl}/rest/v1/lost_and_found_activity`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify([
        {
          business_id: businessId,
          item_id: itemId,
          event_type: 'guest_contacted',
          employee_id: body.employee_id || null,
          employee_name: body.employee_name || null,
          communication_method: method,
          outcome: body.outcome || (emailSent ? 'email_sent' : 'recorded'),
          from_status: fromStatus,
          to_status: newStatus,
          notes: body.notes || null,
          details: { email_sent: emailSent, method },
        },
      ]),
    });
    const activity = actRes.ok ? (await actRes.json())[0] : null;

    // Update status if changed
    let updated = item;
    if (newStatus !== fromStatus) {
      const patchRes = await fetch(
        `${supabaseUrl}/rest/v1/lost_and_found?id=eq.${itemId}&business_id=eq.${businessId}`,
        {
          method: 'PATCH',
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            status: newStatus,
            updated_at: new Date().toISOString(),
          }),
        }
      );
      if (patchRes.ok) {
        updated = (await patchRes.json())[0];
      }
    }

    await writeAudit(supabaseUrl, key, {
      business_id: businessId,
      user_id: body.employee_id || '00000000-0000-0000-0000-000000000000',
      user_name: body.employee_name || 'System',
      user_role: 'staff',
      action: 'lost_found_guest_contacted',
      description: `Guest contacted via ${method} for ${item.tag_number || itemId}`,
      details: { item_id: itemId, method, email_sent: emailSent },
      booking_id: item.booking_id || null,
      guest_name: item.guest_name || null,
      created_at: new Date().toISOString(),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        item: updated,
        activity,
        email_sent: emailSent,
        // Placeholders for future SMS / WhatsApp integrations
        sms_available: false,
        whatsapp_available: false,
      }),
    };
  } catch (error) {
    console.error('contact-lost-found-guest fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to record contact' }),
    };
  }
};
