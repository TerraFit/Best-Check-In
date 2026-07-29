// Generate housekeeping tasks for bookings with rooms — room-centric
// Future tasks only; completed history is never modified.

const { generateSchedule } = require('./housekeeping-engine');

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
  body: JSON.stringify(body),
});

async function supabaseFetch(path, options = {}) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(typeof data === 'object' && data?.message ? data.message : text || res.statusText);
  }
  return data;
}

async function getSettings(businessId) {
  const rows = await supabaseFetch(
    `housekeeping_settings?business_id=eq.${businessId}&select=*`
  );
  if (rows && rows[0]) return rows[0];
  return {
    policy: 'standard',
    custom_refresh_interval: 2,
    custom_full_interval: 3,
    allow_skip_refresh: true,
    mandatory_checkout_fs: true,
    auto_generate: true,
  };
}

async function writeRoomEvent(payload) {
  try {
    await supabaseFetch('room_events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn('room_events write failed', e.message);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return createResponse(204, {});
  if (event.httpMethod !== 'POST') {
    return createResponse(405, { error: 'Method Not Allowed' });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      businessId,
      bookingId,
      roomId,
      regenerate = false,
    } = body;

    if (!businessId) {
      return createResponse(400, { error: 'businessId required' });
    }

    const settings = await getSettings(businessId);
    const policy = settings.policy || 'standard';

    // Load bookings with rooms
    let bookingQuery =
      `bookings?business_id=eq.${businessId}&room_id=not.is.null&select=id,guest_name,check_in_date,check_out_date,room_id,room_number,room_name,status`;
    if (bookingId) bookingQuery += `&id=eq.${bookingId}`;
    if (roomId) bookingQuery += `&room_id=eq.${roomId}`;

    const bookings = await supabaseFetch(bookingQuery);
    if (!bookings?.length) {
      return createResponse(200, {
        success: true,
        created: 0,
        cancelled_future: 0,
        message: 'No bookings with assigned rooms',
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatToday(today);

    let created = 0;
    let cancelledFuture = 0;

    for (const booking of bookings) {
      if (!booking.room_id || !booking.check_in_date || !booking.check_out_date) continue;
      if (['cancelled', 'no_show'].includes((booking.status || '').toLowerCase())) continue;

      const schedule = generateSchedule(
        booking.check_in_date,
        booking.check_out_date,
        policy,
        settings
      );

      // Cancel only FUTURE pending/in_progress tasks for this booking (history preserved)
      if (regenerate || true) {
        const existing = await supabaseFetch(
          `housekeeping_tasks?business_id=eq.${businessId}&booking_id=eq.${booking.id}&status=in.(pending,in_progress)&select=id,scheduled_date,status`
        );
        for (const t of existing || []) {
          if (t.scheduled_date >= todayStr) {
            await supabaseFetch(`housekeeping_tasks?id=eq.${t.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                status: 'cancelled',
                updated_at: new Date().toISOString(),
                notes: (t.notes || '') + ' [auto-cancelled: schedule regenerated]',
              }),
              prefer: 'return=minimal',
            });
            cancelledFuture += 1;
          }
        }
      }

      for (const slot of schedule) {
        // Do not recreate past completed work; only schedule today and future
        if (slot.scheduled_date < todayStr) continue;

        // Skip if a non-cancelled task already exists for same room+date+type
        const dup = await supabaseFetch(
          `housekeeping_tasks?business_id=eq.${businessId}&room_id=eq.${booking.room_id}&scheduled_date=eq.${slot.scheduled_date}&task_type=eq.${slot.task_type}&status=neq.cancelled&select=id`
        );
        if (dup && dup.length) continue;

        const row = {
          business_id: businessId,
          room_id: booking.room_id,
          room_number: booking.room_number ?? null,
          room_name: booking.room_name ?? null,
          booking_id: booking.id,
          guest_name: booking.guest_name || null,
          task_type: slot.task_type,
          is_checkout: !!slot.is_checkout,
          scheduled_date: slot.scheduled_date,
          priority: 'standard',
          status: 'pending',
          policy_used: policy,
        };

        await supabaseFetch('housekeeping_tasks', {
          method: 'POST',
          body: JSON.stringify(row),
        });
        created += 1;

        // Reflect due status on room for today's tasks
        if (slot.scheduled_date === todayStr) {
          const hk =
            slot.task_type === 'full_service' || slot.is_checkout
              ? slot.is_checkout
                ? 'dirty'
                : 'full_service_required'
              : 'refresh_required';
          const roomPatch = { housekeeping_status: hk, updated_at: new Date().toISOString() };
          if (slot.is_checkout) {
            roomPatch.occupancy_status = 'departure_pending';
          }
          await supabaseFetch(`rooms?id=eq.${booking.room_id}`, {
            method: 'PATCH',
            body: JSON.stringify(roomPatch),
            prefer: 'return=minimal',
          });
        }

        await writeRoomEvent({
          business_id: businessId,
          room_id: booking.room_id,
          event_type: 'housekeeping_task_created',
          source: 'system',
          severity: 'info',
          booking_id: booking.id,
          guest_name: booking.guest_name,
          details: {
            task_type: slot.task_type,
            scheduled_date: slot.scheduled_date,
            is_checkout: slot.is_checkout,
            policy,
          },
        });
      }
    }

    return createResponse(200, {
      success: true,
      created,
      cancelled_future: cancelledFuture,
      policy,
    });
  } catch (err) {
    console.error('generate-housekeeping-tasks', err);
    return createResponse(500, { error: err.message || 'Internal error' });
  }
};

function formatToday(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
