// netlify/functions/sync-rooms.js
// Create sequential rooms up to totalRooms.
// NEVER auto-delete. Excess rooms require confirmDeactivate to set active=false.

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
    const { businessId, totalRooms, confirmDeactivate } = body;

    if (!businessId || totalRooms === undefined || totalRooms === null) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'businessId and totalRooms are required' }),
      };
    }

    const target = parseInt(totalRooms, 10);
    if (isNaN(target) || target < 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'totalRooms must be a non-negative integer' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const restHeaders = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    };

    // Existing rooms
    const existingRes = await fetch(
      `${supabaseUrl}/rest/v1/rooms?business_id=eq.${businessId}&order=room_number.asc`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: 'application/json',
        },
      }
    );

    if (!existingRes.ok) {
      const err = await existingRes.text();
      return { statusCode: existingRes.status, headers, body: JSON.stringify({ error: err }) };
    }

    const existing = await existingRes.json();
    const byNumber = new Map(existing.map((r) => [r.room_number, r]));

    const shortBiz = String(businessId).replace(/-/g, '').slice(0, 8).toUpperCase();
    let created = 0;
    let existingCount = existing.length;

    // Create missing rooms 1..target
    for (let n = 1; n <= target; n++) {
      if (byNumber.has(n)) {
        // Reactivate if it was inactive and is within target
        const room = byNumber.get(n);
        if (room.active === false) {
          await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${room.id}`, {
            method: 'PATCH',
            headers: restHeaders,
            body: JSON.stringify({ active: true, updated_at: new Date().toISOString() }),
          });
        }
        continue;
      }

      const roomCode = `R-${shortBiz}-${String(n).padStart(3, '0')}`;
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/rooms`, {
        method: 'POST',
        headers: restHeaders,
        body: JSON.stringify([
          {
            business_id: businessId,
            room_number: n,
            room_code: roomCode,
            room_name: null,
            room_type: 'Standard',
            availability_status: 'available',
            occupancy_status: 'vacant',
            housekeeping_status: 'clean',
            room_condition: 'good',
            cleaning_priority: 'standard',
            active: true,
            sort_order: n,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]),
      });

      if (insertRes.ok) {
        created++;
        // room_event
        const inserted = await insertRes.json();
        const newRoom = inserted[0];
        if (newRoom?.id) {
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
                room_id: newRoom.id,
                event_type: 'room_created',
                source: 'system',
                severity: 'info',
                details: { room_number: n, room_code: roomCode },
              },
            ]),
          }).catch(() => {});
        }
      } else {
        console.error('Failed to create room', n, await insertRes.text());
      }
    }

    // Excess rooms (number > target)
    const excess = existing.filter((r) => r.room_number > target && r.active !== false);

    if (excess.length > 0 && !confirmDeactivate) {
      // Refresh list
      const refreshed = await fetch(
        `${supabaseUrl}/rest/v1/rooms?business_id=eq.${businessId}&order=room_number.asc`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Accept: 'application/json',
          },
        }
      );
      const rooms = refreshed.ok ? await refreshed.json() : existing;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          created,
          existing: existingCount,
          deactivated: 0,
          requiresConfirmation: true,
          excessRooms: excess,
          rooms,
          message:
            `${excess.length} room(s) are above the new total. Confirm deactivation — rooms are never deleted automatically.`,
        }),
      };
    }

    let deactivated = 0;
    if (excess.length > 0 && confirmDeactivate) {
      for (const room of excess) {
        const patchRes = await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${room.id}`, {
          method: 'PATCH',
          headers: restHeaders,
          body: JSON.stringify({
            active: false,
            availability_status: 'unavailable',
            updated_at: new Date().toISOString(),
          }),
        });
        if (patchRes.ok) {
          deactivated++;
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
                room_id: room.id,
                event_type: 'room_deactivated',
                source: 'staff',
                severity: 'warning',
                details: { reason: 'total_rooms_reduced', room_number: room.room_number },
              },
            ]),
          }).catch(() => {});
        }
      }
    }

    const finalRes = await fetch(
      `${supabaseUrl}/rest/v1/rooms?business_id=eq.${businessId}&order=room_number.asc`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: 'application/json',
        },
      }
    );
    const rooms = finalRes.ok ? await finalRes.json() : [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        created,
        existing: existingCount,
        deactivated,
        requiresConfirmation: false,
        rooms,
      }),
    };
  } catch (error) {
    console.error('sync-rooms fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to sync rooms' }),
    };
  }
};
