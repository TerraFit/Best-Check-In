// netlify/functions/collect-lost-found-item.js
// Record guest collection: name, optional ID, signature, releasing employee

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
    const collectedByName = (body.collected_by_name || body.collectedByName || '').trim();

    if (!businessId || !itemId || !collectedByName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'businessId, itemId, and collected_by_name are required',
        }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const now = new Date().toISOString();
    const updates = {
      status: 'collected',
      returned_at: now,
      returned_to: collectedByName,
      collected_by_name: collectedByName,
      collected_by_id_number: body.collected_by_id_number || body.collectedByIdNumber || null,
      collection_signature_url: body.collection_signature_url || body.signatureUrl || null,
      released_by_staff_id: body.employee_id || body.released_by_staff_id || null,
      released_by_staff_name: body.employee_name || body.released_by_staff_name || null,
      updated_at: now,
    };

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
        body: JSON.stringify(updates),
      }
    );

    if (!patchRes.ok) {
      const t = await patchRes.text();
      return { statusCode: 500, headers, body: JSON.stringify({ error: t }) };
    }

    const item = (await patchRes.json())[0];

    const when = new Date(now);
    const dateStr = when.toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeStr = when.toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const notes =
      `Returned to guest\nCollected by: ${collectedByName}\n` +
      (updates.collected_by_id_number ? `ID: ${updates.collected_by_id_number}\n` : '') +
      `Released by: ${updates.released_by_staff_name || 'Staff'}\n` +
      `${dateStr}\n${timeStr}`;

    await fetch(`${supabaseUrl}/rest/v1/lost_and_found_activity`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify([
        {
          business_id: businessId,
          item_id: itemId,
          event_type: 'collected',
          employee_id: updates.released_by_staff_id,
          employee_name: updates.released_by_staff_name,
          from_status: body.from_status || null,
          to_status: 'collected',
          notes,
          details: {
            collected_by_name: collectedByName,
            collected_by_id_number: updates.collected_by_id_number,
            has_signature: !!updates.collection_signature_url,
          },
        },
      ]),
    });

    await writeAudit(supabaseUrl, key, {
      business_id: businessId,
      user_id: updates.released_by_staff_id || '00000000-0000-0000-0000-000000000000',
      user_name: updates.released_by_staff_name || 'System',
      user_role: 'staff',
      action: 'lost_found_collected',
      description: `Lost & Found ${item?.tag_number || itemId} collected by ${collectedByName}`,
      details: {
        item_id: itemId,
        collected_by_name: collectedByName,
        released_by: updates.released_by_staff_name,
      },
      guest_name: collectedByName,
      booking_id: item?.booking_id || null,
      created_at: now,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, item }),
    };
  } catch (error) {
    console.error('collect-lost-found-item fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Collection failed' }),
    };
  }
};
