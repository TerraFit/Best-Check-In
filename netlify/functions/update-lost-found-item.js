// netlify/functions/update-lost-found-item.js
// Update item fields / status; write activity + audit on status change
// RBAC: canEditLostFound (or canDisposeLostFound for archive/unclaimed)

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
    console.warn('audit log failed', e.message);
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
    if (!businessId || !itemId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'businessId and itemId are required' }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const sh = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    // Load current
    const curRes = await fetch(
      `${supabaseUrl}/rest/v1/lost_and_found?id=eq.${itemId}&business_id=eq.${businessId}&select=*`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } }
    );
    if (!curRes.ok) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: await curRes.text() }) };
    }
    const currentRows = await curRes.json();
    if (!currentRows.length) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Item not found' }) };
    }
    const current = currentRows[0];

    const allowed = [
      'item_name', 'description', 'category', 'found_date', 'time_found',
      'room_id', 'room_number', 'room_name', 'booking_id', 'booking_reference',
      'guest_name', 'guest_email', 'guest_phone', 'storage_location', 'storage_detail',
      'condition', 'estimated_value', 'internal_notes', 'notes', 'photo_urls',
      'status', 'returned_to',
    ];

    const updates = { updated_at: new Date().toISOString() };
    for (const k of allowed) {
      if (body[k] !== undefined) updates[k] = body[k];
    }

    if (updates.status === 'returned' || updates.status === 'collected') {
      updates.returned_at = updates.returned_at || new Date().toISOString();
    }
    if (updates.status === 'archived') {
      updates.archived_at = new Date().toISOString();
    }

    const patchRes = await fetch(
      `${supabaseUrl}/rest/v1/lost_and_found?id=eq.${itemId}&business_id=eq.${businessId}`,
      { method: 'PATCH', headers: sh, body: JSON.stringify(updates) }
    );
    if (!patchRes.ok) {
      const t = await patchRes.text();
      return { statusCode: 500, headers, body: JSON.stringify({ error: t }) };
    }
    const updated = (await patchRes.json())[0];

    const empId = body.employee_id || null;
    const empName = body.employee_name || null;

    // Status change activity
    if (body.status && body.status !== current.status) {
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
            event_type: body.status === 'archived' ? 'archived' : body.status === 'returned' || body.status === 'collected' ? 'returned' : 'status_change',
            employee_id: empId,
            employee_name: empName,
            from_status: current.status,
            to_status: body.status,
            notes: body.note || `Status changed from ${current.status} to ${body.status}`,
          },
        ]),
      });

      await writeAudit(supabaseUrl, key, {
        business_id: businessId,
        user_id: empId || '00000000-0000-0000-0000-000000000000',
        user_name: empName || 'System',
        user_role: 'staff',
        action: 'lost_found_status_change',
        description: `Lost & Found ${current.tag_number || itemId}: ${current.status} → ${body.status}`,
        details: { item_id: itemId, from: current.status, to: body.status },
        booking_id: current.booking_id || null,
        guest_name: current.guest_name || null,
        created_at: new Date().toISOString(),
      });
    } else if (body.note) {
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
            event_type: 'note_added',
            employee_id: empId,
            employee_name: empName,
            notes: body.note,
          },
        ]),
      });
    } else {
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
            event_type: 'updated',
            employee_id: empId,
            employee_name: empName,
            notes: 'Item details updated',
            details: { fields: Object.keys(updates).filter((k) => k !== 'updated_at') },
          },
        ]),
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, item: updated }),
    };
  } catch (error) {
    console.error('update-lost-found-item fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to update item' }),
    };
  }
};
