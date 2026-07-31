// netlify/functions/create-lost-found-item.js
// Create Lost & Found item, auto-generate tag, write activity + audit
// Requires at least one photo_url

async function nextTagNumber(supabaseUrl, key, businessId) {
  const year = new Date().getFullYear();
  const sh = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  const getRes = await fetch(
    `${supabaseUrl}/rest/v1/lost_and_found_tag_sequences?business_id=eq.${businessId}&select=*`,
    { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } }
  );
  const rows = getRes.ok ? await getRes.json() : [];

  let seq = 1;
  if (rows.length && rows[0].year === year) {
    seq = (rows[0].last_seq || 0) + 1;
    await fetch(
      `${supabaseUrl}/rest/v1/lost_and_found_tag_sequences?business_id=eq.${businessId}`,
      {
        method: 'PATCH',
        headers: sh,
        body: JSON.stringify({ last_seq: seq, year, updated_at: new Date().toISOString() }),
      }
    );
  } else if (rows.length) {
    seq = 1;
    await fetch(
      `${supabaseUrl}/rest/v1/lost_and_found_tag_sequences?business_id=eq.${businessId}`,
      {
        method: 'PATCH',
        headers: sh,
        body: JSON.stringify({ last_seq: 1, year, updated_at: new Date().toISOString() }),
      }
    );
  } else {
    await fetch(`${supabaseUrl}/rest/v1/lost_and_found_tag_sequences`, {
      method: 'POST',
      headers: sh,
      body: JSON.stringify([{ business_id: businessId, year, last_seq: 1 }]),
    });
  }

  return `LF-${year}-${String(seq).padStart(4, '0')}`;
}

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
    if (!businessId || !body.item_name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'businessId and item_name are required' }),
      };
    }

    const photoUrls = Array.isArray(body.photo_urls) ? body.photo_urls.filter(Boolean) : [];
    if (!photoUrls.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'At least one photo is required before saving an item' }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const tag = await nextTagNumber(supabaseUrl, key, businessId);
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Johannesburg',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const row = {
      business_id: businessId,
      tag_number: tag,
      item_name: body.item_name,
      description: body.description || null,
      category: body.category || 'Miscellaneous',
      found_date: body.found_date || today,
      time_found: body.time_found || null,
      room_id: body.room_id || null,
      room_number: body.room_number != null ? String(body.room_number) : null,
      room_name: body.room_name || null,
      booking_id: body.booking_id || null,
      booking_reference: body.booking_reference || null,
      guest_name: body.guest_name || null,
      guest_email: body.guest_email || null,
      guest_phone: body.guest_phone || null,
      check_in_date: body.check_in_date || null,
      check_out_date: body.check_out_date || null,
      found_by_staff_id: body.found_by_staff_id || null,
      found_by_staff_name: body.found_by_staff_name || null,
      storage_location: body.storage_location || null,
      storage_detail: body.storage_detail || null,
      condition: body.condition || 'good',
      estimated_value: body.estimated_value != null ? body.estimated_value : null,
      internal_notes: body.internal_notes || null,
      notes: body.notes || null,
      photo_urls: photoUrls,
      status: body.status || 'newly_found',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/lost_and_found`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify([row]),
    });

    if (!insertRes.ok) {
      const t = await insertRes.text();
      console.error('create-lost-found insert error', t);
      return { statusCode: 500, headers, body: JSON.stringify({ error: t || 'Insert failed' }) };
    }

    const created = (await insertRes.json())[0];

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
          item_id: created.id,
          event_type: 'created',
          employee_id: body.found_by_staff_id || null,
          employee_name: body.found_by_staff_name || null,
          notes: `Item created with tag ${tag}`,
          details: { tag_number: tag, item_name: body.item_name },
        },
        {
          business_id: businessId,
          item_id: created.id,
          event_type: 'photos_added',
          employee_id: body.found_by_staff_id || null,
          employee_name: body.found_by_staff_name || null,
          notes: `${photoUrls.length} photo(s) added`,
          details: { count: photoUrls.length },
        },
      ]),
    });

    await writeAudit(supabaseUrl, key, {
      business_id: businessId,
      user_id: body.found_by_staff_id || '00000000-0000-0000-0000-000000000000',
      user_name: body.found_by_staff_name || 'System',
      user_role: 'staff',
      action: 'lost_found_created',
      description: `Lost & Found item created: ${tag} — ${body.item_name}`,
      details: { item_id: created.id, tag_number: tag, photos: photoUrls.length },
      booking_id: body.booking_id || null,
      guest_name: body.guest_name || null,
      created_at: new Date().toISOString(),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, item: created }),
    };
  } catch (error) {
    console.error('create-lost-found-item fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to create item' }),
    };
  }
};
