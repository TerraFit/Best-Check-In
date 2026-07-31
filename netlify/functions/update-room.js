// netlify/functions/update-room.js
// Update mutable room fields. room_number and room_code are immutable.

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
    const { roomId, businessId } = body;

    if (!roomId || !businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'roomId and businessId are required' }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const allowed = [
      'room_name',
      'room_type',
      'max_adults',
      'max_children',
      'max_infants',
      'availability_status',
      'occupancy_status',
      'housekeeping_status',
      'room_condition',
      'cleaning_priority',
      'active',
      'unavailable_reason',
      'sort_order',
      'notes',
    ];

    const updateData = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }

    if (Object.keys(updateData).length === 1) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No valid fields to update' }),
      };
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/rooms?id=eq.${roomId}&business_id=eq.${businessId}`,
      {
        method: 'PATCH',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return { statusCode: response.status, headers, body: JSON.stringify({ error: err }) };
    }

    const result = await response.json();
    const room = result[0];

    if (room) {
      await fetch(`${supabaseUrl}/rest/v1/room_events`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            business_id: businessId,
            room_id: roomId,
            event_type: 'room_updated',
            source: 'staff',
            severity: 'info',
            details: updateData,
          },
        ]),
      }).catch(() => {});
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, room }),
    };
  } catch (error) {
    console.error('update-room fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to update room' }),
    };
  }
};
