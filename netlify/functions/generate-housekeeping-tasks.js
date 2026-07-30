// Generate housekeeping tasks for bookings with rooms — room-centric
// Future tasks only; completed history is never modified.
// Checkout Full Service is always generated for departing guests (independent of Refresh).

const { generateSchedule, todayInJohannesburg } = require('./housekeeping-engine');

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
    const msg =
      typeof data === 'object' && data && (data.message || data.error || data.hint)
        ? `${data.message || data.error}${data.hint ? ' — ' + data.hint : ''}`
        : text || res.statusText;
    throw new Error(msg);
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

/** Resolve room_id from room_number when allocation left room_id null. */
async function resolveRoomId(businessId, booking) {
  if (booking.room_id) {
    return {
      room_id: booking.room_id,
      room_number: booking.room_number ?? null,
      room_name: booking.room_name ?? null,
    };
  }
  if (booking.room_number === null || booking.room_number === undefined || booking.room_number === '') {
    return null;
  }
  const n = Number(booking.room_number);
  if (Number.isNaN(n)) return null;
  const rooms = await supabaseFetch(
    `rooms?business_id=eq.${businessId}&room_number=eq.${n}&select=id,room_number,room_name&limit=1`
  );
  if (!rooms?.[0]) return null;
  return {
    room_id: rooms[0].id,
    room_number: rooms[0].room_number,
    room_name: rooms[0].room_name ?? booking.room_name ?? null,
  };
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
    // Property timezone — not UTC from the Netlify runtime
    const todayStr = todayInJohannesburg();

    // Bookings with a room: room_id set OR room_number set (legacy / partial allocation)
    let bookingQuery =
      `bookings?business_id=eq.${businessId}&or=(room_id.not.is.null,room_number.not.is.null)&select=id,guest_name,check_in_date,check_out_date,room_id,room_number,room_name,status`;
    if (bookingId) bookingQuery += `&id=eq.${bookingId}`;
    if (roomId) bookingQuery += `&room_id=eq.${roomId}`;

    let bookings;
    try {
      bookings = await supabaseFetch(bookingQuery);
    } catch (e) {
      // Fallback if room_number column missing or or() unsupported path
      console.warn('Primary booking query failed, fallback room_id only:', e.message);
      let fallback =
        `bookings?business_id=eq.${businessId}&room_id=not.is.null&select=id,guest_name,check_in_date,check_out_date,room_id,room_number,room_name,status`;
      if (bookingId) fallback += `&id=eq.${bookingId}`;
      if (roomId) fallback += `&room_id=eq.${roomId}`;
      bookings = await supabaseFetch(fallback);
    }

    if (!bookings?.length) {
      return createResponse(200, {
        success: true,
        created: 0,
        cancelled_future: 0,
        bookings_considered: 0,
        today: todayStr,
        policy,
        message:
          'No bookings with assigned rooms (room_id or room_number). Allocate rooms first.',
      });
    }

    let created = 0;
    let cancelledFuture = 0;
    let bookingsProcessed = 0;
    let skippedNoRoom = 0;
    let skippedStatus = 0;
    let skippedNoDates = 0;

    for (const booking of bookings) {
      if (!booking.check_in_date || !booking.check_out_date) {
        skippedNoDates += 1;
        continue;
      }

      const status = (booking.status || '').toLowerCase();
      // Only exclude true non-stays; keep checked_in, confirmed, active, completed (same-day departures)
      if (['cancelled', 'no_show', 'canceled'].includes(status)) {
        skippedStatus += 1;
        continue;
      }

      const resolved = await resolveRoomId(businessId, booking);
      if (!resolved?.room_id) {
        skippedNoRoom += 1;
        continue;
      }

      bookingsProcessed += 1;

      const schedule = generateSchedule(
        booking.check_in_date,
        booking.check_out_date,
        policy,
        settings
      );

      // Only cancel future open tasks when explicitly regenerating
      if (regenerate) {
        const existing = await supabaseFetch(
          `housekeeping_tasks?business_id=eq.${businessId}&booking_id=eq.${booking.id}&status=in.(pending,in_progress)&select=id,scheduled_date,status,notes`
        );
        for (const t of existing || []) {
          const d = String(t.scheduled_date).slice(0, 10);
          if (d >= todayStr) {
            await supabaseFetch(`housekeeping_tasks?id=eq.${t.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                status: 'cancelled',
                updated_at: new Date().toISOString(),
                notes: `${t.notes || ''} [auto-cancelled: schedule regenerated]`.trim(),
              }),
              prefer: 'return=minimal',
            });
            cancelledFuture += 1;
          }
        }
      }

      for (const slot of schedule) {
        const slotDate = String(slot.scheduled_date).slice(0, 10);
        // Only today and future — past completed work stays history
        if (slotDate < todayStr) continue;

        // Skip if an open (non-cancelled) task already exists for room+date+type
        const dup = await supabaseFetch(
          `housekeeping_tasks?business_id=eq.${businessId}&room_id=eq.${resolved.room_id}&scheduled_date=eq.${slotDate}&task_type=eq.${slot.task_type}&status=in.(pending,in_progress,completed)&select=id,status`
        );
        if (dup && dup.length) continue;

        const row = {
          business_id: businessId,
          room_id: resolved.room_id,
          room_number:
            resolved.room_number !== null && resolved.room_number !== undefined
              ? Number(resolved.room_number)
              : null,
          room_name: resolved.room_name ?? null,
          booking_id: booking.id,
          guest_name: booking.guest_name || null,
          task_type: slot.task_type,
          is_checkout: !!slot.is_checkout,
          scheduled_date: slotDate,
          priority: 'standard',
          status: 'pending',
          policy_used: policy,
        };

        await supabaseFetch('housekeeping_tasks', {
          method: 'POST',
          body: JSON.stringify(row),
        });
        created += 1;

        if (slotDate === todayStr) {
          const roomPatch = {
            housekeeping_status: slot.is_checkout
              ? 'dirty'
              : slot.task_type === 'full_service'
                ? 'full_service_required'
                : 'refresh_required',
            updated_at: new Date().toISOString(),
          };
          if (slot.is_checkout) {
            roomPatch.occupancy_status = 'departure_pending';
          }
          try {
            await supabaseFetch(`rooms?id=eq.${resolved.room_id}`, {
              method: 'PATCH',
              body: JSON.stringify(roomPatch),
              prefer: 'return=minimal',
            });
          } catch (e) {
            console.warn('room status patch failed', e.message);
          }
        }

        await writeRoomEvent({
          business_id: businessId,
          room_id: resolved.room_id,
          event_type: 'housekeeping_task_created',
          source: 'system',
          severity: 'info',
          booking_id: booking.id,
          guest_name: booking.guest_name,
          details: {
            task_type: slot.task_type,
            scheduled_date: slotDate,
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
      bookings_matched: bookings.length,
      bookings_processed: bookingsProcessed,
      skipped_no_room: skippedNoRoom,
      skipped_status: skippedStatus,
      skipped_no_dates: skippedNoDates,
      today: todayStr,
      policy,
      message:
        created > 0
          ? `Created ${created} task(s) for ${bookingsProcessed} booking(s).`
          : bookingsProcessed === 0
            ? 'No eligible bookings with resolvable rooms.'
            : 'No new tasks (already exist for today/future, or all schedule dates are in the past).',
    });
  } catch (err) {
    console.error('generate-housekeeping-tasks', err);
    return createResponse(500, { error: err.message || 'Internal error' });
  }
};
