// netlify/functions/generate-housekeeping-tasks.js
// Room-centric task generation. CommonJS exports.handler — same pattern as get-rooms.js
// Schedule helpers inlined (no require) so esbuild + package.json type:module still exports handler.

function todayInJohannesburg() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function parseDate(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(iso, days) {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

function calculateStayLength(checkIn, checkOut) {
  const a = parseDate(checkIn);
  const b = parseDate(checkOut);
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

function determineCustomNights(nights, settings) {
  const refreshEvery = Math.max(1, settings?.custom_refresh_interval ?? 2);
  const fullEvery = Math.max(1, settings?.custom_full_interval ?? 3);
  const out = [];
  const used = new Set();
  for (let n = fullEvery; n < nights; n += fullEvery) {
    out.push({ nightIndex: n, task_type: 'full_service' });
    used.add(n);
  }
  for (let n = refreshEvery; n < nights; n += refreshEvery) {
    if (!used.has(n)) out.push({ nightIndex: n, task_type: 'refresh' });
  }
  return out.sort((a, b) => a.nightIndex - b.nightIndex);
}

function determineIntelligentNights(nights, policy) {
  const out = [];
  const maxGap = policy === 'eco' ? 3 : 2;
  let lastServiceNight = 0;
  let lastFullNight = 0;
  for (let night = 1; night < nights; night++) {
    const remainingAfter = nights - night;
    if (remainingAfter <= 0) continue;
    const gap = night - lastServiceNight;
    const forceNearEnd = remainingAfter === 1 && gap >= Math.ceil(maxGap / 2) && nights >= 4;
    if (gap < maxGap && !forceNearEnd) continue;
    let task_type = 'refresh';
    if (policy === 'eco') {
      if (night - lastFullNight >= 4 && nights >= 5) task_type = 'full_service';
    } else {
      const isMidpoint = Math.abs(night - nights / 2) <= 1 || gap >= maxGap;
      if ((isMidpoint && nights >= 4) || night - lastFullNight >= 3) task_type = 'full_service';
    }
    out.push({ nightIndex: night, task_type });
    lastServiceNight = night;
    if (task_type === 'full_service') lastFullNight = night;
  }
  return out;
}

function determineOptimalServiceNights(nights, policy, settings) {
  if (nights <= 2) return [];
  if (policy === 'premium') {
    const out = [];
    for (let n = 1; n < nights; n++) out.push({ nightIndex: n, task_type: 'full_service' });
    return out;
  }
  if (policy === 'custom') return determineCustomNights(nights, settings);
  return determineIntelligentNights(nights, policy);
}

/** Checkout Full Service is independent of mid-stay Refresh schedule. */
function generateSchedule(checkIn, checkOut, policy, settings) {
  const checkInDate = String(checkIn).slice(0, 10);
  const checkOutDate = String(checkOut).slice(0, 10);
  if (!checkInDate || !checkOutDate) return [];

  const nights = calculateStayLength(checkInDate, checkOutDate);
  const tasks = [];

  if (nights > 0) {
    const mid = determineOptimalServiceNights(nights, policy, settings);
    for (const m of mid) {
      tasks.push({
        scheduled_date: addDays(checkInDate, m.nightIndex),
        task_type: m.task_type,
        is_checkout: false,
      });
    }
  }

  const mandatoryCheckout = settings?.mandatory_checkout_fs !== false;
  if (mandatoryCheckout || policy === 'premium') {
    tasks.push({
      scheduled_date: checkOutDate,
      task_type: 'full_service',
      is_checkout: true,
    });
  }

  const byDate = new Map();
  for (const t of tasks) {
    const existing = byDate.get(t.scheduled_date);
    if (!existing) {
      byDate.set(t.scheduled_date, t);
      continue;
    }
    if (t.is_checkout || (t.task_type === 'full_service' && existing.task_type === 'refresh')) {
      byDate.set(t.scheduled_date, t);
    }
  }
  return Array.from(byDate.values()).sort((a, b) =>
    a.scheduled_date.localeCompare(b.scheduled_date)
  );
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
    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const { businessId, bookingId, roomId, regenerate = false } = body;

    if (!businessId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'businessId required' }) };
    }

    const restGet = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    const restWrite = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      Accept: 'application/json',
    };

    async function sb(path, options = {}) {
      const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        ...options,
        headers: { ...restWrite, ...(options.headers || {}) },
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
          typeof data === 'object' && data && (data.message || data.error)
            ? data.message || data.error
            : text || res.statusText;
        throw new Error(msg);
      }
      return data;
    }

    let settings = {
      policy: 'standard',
      custom_refresh_interval: 2,
      custom_full_interval: 3,
      allow_skip_refresh: true,
      mandatory_checkout_fs: true,
      auto_generate: true,
    };
    try {
      const settingsRes = await fetch(
        `${supabaseUrl}/rest/v1/housekeeping_settings?business_id=eq.${businessId}&select=*`,
        { headers: restGet }
      );
      if (settingsRes.ok) {
        const rows = await settingsRes.json();
        if (rows[0]) settings = rows[0];
      }
    } catch (e) {
      console.warn('settings load', e.message);
    }

    const policy = settings.policy || 'standard';
    const todayStr = todayInJohannesburg();

    let bookingQuery =
      `bookings?business_id=eq.${businessId}&or=(room_id.not.is.null,room_number.not.is.null)&select=id,guest_name,check_in_date,check_out_date,room_id,room_number,room_name,status`;
    if (bookingId) bookingQuery += `&id=eq.${bookingId}`;
    if (roomId) bookingQuery += `&room_id=eq.${roomId}`;

    let bookings = [];
    try {
      const bRes = await fetch(`${supabaseUrl}/rest/v1/${bookingQuery}`, { headers: restGet });
      if (bRes.ok) bookings = await bRes.json();
      else {
        let fallback =
          `bookings?business_id=eq.${businessId}&room_id=not.is.null&select=id,guest_name,check_in_date,check_out_date,room_id,room_number,room_name,status`;
        if (bookingId) fallback += `&id=eq.${bookingId}`;
        if (roomId) fallback += `&room_id=eq.${roomId}`;
        const fRes = await fetch(`${supabaseUrl}/rest/v1/${fallback}`, { headers: restGet });
        if (fRes.ok) bookings = await fRes.json();
      }
    } catch (e) {
      console.error('bookings query', e.message);
    }

    if (!bookings?.length) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          created: 0,
          cancelled_future: 0,
          bookings_matched: 0,
          bookings_processed: 0,
          today: todayStr,
          policy,
          message: 'No bookings with assigned rooms (room_id or room_number). Allocate rooms first.',
        }),
      };
    }

    async function resolveRoom(booking) {
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
      const rRes = await fetch(
        `${supabaseUrl}/rest/v1/rooms?business_id=eq.${businessId}&room_number=eq.${n}&select=id,room_number,room_name&limit=1`,
        { headers: restGet }
      );
      if (!rRes.ok) return null;
      const rooms = await rRes.json();
      if (!rooms[0]) return null;
      return {
        room_id: rooms[0].id,
        room_number: rooms[0].room_number,
        room_name: rooms[0].room_name ?? booking.room_name ?? null,
      };
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
      const st = (booking.status || '').toLowerCase();
      if (['cancelled', 'no_show', 'canceled'].includes(st)) {
        skippedStatus += 1;
        continue;
      }

      const resolved = await resolveRoom(booking);
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

      if (regenerate) {
        try {
          const exRes = await fetch(
            `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${businessId}&booking_id=eq.${booking.id}&status=in.(pending,in_progress)&select=id,scheduled_date,notes`,
            { headers: restGet }
          );
          const existing = exRes.ok ? await exRes.json() : [];
          for (const t of existing) {
            const d = String(t.scheduled_date).slice(0, 10);
            if (d >= todayStr) {
              await fetch(`${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${t.id}`, {
                method: 'PATCH',
                headers: {
                  apikey: key,
                  Authorization: `Bearer ${key}`,
                  'Content-Type': 'application/json',
                  Prefer: 'return=minimal',
                },
                body: JSON.stringify({
                  status: 'cancelled',
                  updated_at: new Date().toISOString(),
                  notes: `${t.notes || ''} [auto-cancelled: schedule regenerated]`.trim(),
                }),
              });
              cancelledFuture += 1;
            }
          }
        } catch (e) {
          console.warn('cancel future', e.message);
        }
      }

      for (const slot of schedule) {
        const slotDate = String(slot.scheduled_date).slice(0, 10);
        if (slotDate < todayStr) continue;

        const dupRes = await fetch(
          `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${businessId}&room_id=eq.${resolved.room_id}&scheduled_date=eq.${slotDate}&task_type=eq.${slot.task_type}&status=in.(pending,in_progress,completed)&select=id`,
          { headers: restGet }
        );
        const dup = dupRes.ok ? await dupRes.json() : [];
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

        await sb('housekeeping_tasks', { method: 'POST', body: JSON.stringify(row) });
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
          if (slot.is_checkout) roomPatch.occupancy_status = 'departure_pending';
          await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${resolved.room_id}`, {
            method: 'PATCH',
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify(roomPatch),
          }).catch(() => {});
        }

        await fetch(`${supabaseUrl}/rest/v1/room_events`, {
          method: 'POST',
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
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
          }),
        }).catch(() => {});
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
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
      }),
    };
  } catch (error) {
    console.error('generate-housekeeping-tasks fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to generate housekeeping tasks' }),
    };
  }
};
