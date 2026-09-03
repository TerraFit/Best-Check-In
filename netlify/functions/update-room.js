// netlify/functions/update-room.js
// Update mutable room fields. room_number and room_code are immutable.
// Auth: Bearer JWT required; businessId must match token business_id (tenant isolation)

import auth from './_auth.cjs';

const {
  requireBusinessActor,
  requireBusinessPermission,
  resolveTenant,
  authFailure,
} = auth;

export const handler = async (event) => {
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
    const actor = requireBusinessActor(event);
    if (!actor.ok) return authFailure(actor, headers);

    if (!requireBusinessPermission(actor.principal, 'canViewRooms')) {
      return authFailure(
        { status: 403, error: 'Missing permission: canViewRooms' },
        headers
      );
    }

    const body = JSON.parse(event.body || '{}');
    const { roomId, businessId: requestedBusinessId } = body;

    if (!roomId || !requestedBusinessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'roomId and businessId are required' }),
      };
    }

    const tenant = resolveTenant(actor.principal, requestedBusinessId);
    if (!tenant.ok) return authFailure(tenant, headers);
    const businessId = tenant.businessId;

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

    const encodedRoomId = encodeURIComponent(roomId);
    const encodedBusinessId = encodeURIComponent(businessId);
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rooms?id=eq.${encodedRoomId}&business_id=eq.${encodedBusinessId}`,
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
      console.error('update-room data layer error:', response.status);
      return {
        statusCode: response.status >= 500 ? 500 : response.status,
        headers,
        body: JSON.stringify({ error: response.status >= 500 ? 'Failed to update room' : 'Room update rejected' }),
      };
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
