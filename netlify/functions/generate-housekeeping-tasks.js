// netlify/functions/generate-housekeeping-tasks.js
// Room-centric generation + Intelligent Stay Optimisation Algorithm.
// Stage 1: calculateOptimalFullServiceNights
// Stage 2: Refresh/FS per night + mandatory Checkout FS
// Clean is NEVER set here — only after inspection approval.

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

function stayNightForDate(checkIn, checkOut, scheduledDate, isCheckout) {
  const nights = calculateStayLength(checkIn, checkOut);
  if (isCheckout) return Math.max(1, nights);
  return Math.max(1, calculateStayLength(checkIn, scheduledDate));
}

function maxLinenAge(policy, settings) {
  if (policy === 'eco') return 5;
  if (policy === 'standard') return 3;
  if (policy === 'custom') return Math.max(1, settings?.custom_full_interval ?? 3);
  return 1;
}

/** Stage 1 — optimal Full Service nights (never uses modulus intervals). */
function calculateOptimalFullServiceNights(stayLength, policy, settings) {
  if (stayLength <= 1) return [];

  if (policy === 'premium') {
    const out = [];
    for (let n = 1; n < stayLength; n++) out.push(n);
    return out;
  }

  const maxAge = maxLinenAge(policy, settings);
  if (stayLength <= maxAge) return [];

  const segments = Math.ceil(stayLength / maxAge);
  const needed = segments - 1;
  if (needed <= 0) return [];

  const fs = [];

  if (needed === 1) {
    let pos = Math.round(stayLength / 2);
    pos = Math.min(maxAge, Math.max(stayLength - maxAge, pos));
    if (pos === stayLength - 1) pos = stayLength - 2;
    if (pos >= 1 && pos < stayLength) return [pos];
    return [];
  }

  for (let i = 1; i <= needed; i++) {
    let pos = Math.round((i * stayLength) / (needed + 1));
    const alternate = i * maxAge;
    if (Math.abs(alternate - pos) <= 1 && alternate > 0 && alternate < stayLength) {
      pos = alternate;
    }
    if (pos === stayLength - 1) pos = pos - 1;

    const prev = fs.length ? fs[fs.length - 1] : 0;
    if (pos - prev > maxAge) pos = prev + maxAge;
    if (pos === stayLength - 1) pos = pos - 1;
    if (pos > prev && pos < stayLength) fs.push(pos);
  }

  let last = fs.length ? fs[fs.length - 1] : 0;
  while (stayLength - last > maxAge) {
    let pos = last + maxAge;
    if (pos >= stayLength - 1) pos = stayLength - 2;
    if (pos <= last) break;
    fs.push(pos);
    last = pos;
  }

  return fs;
}

/** Stage 2 — every mid-stay night is Refresh or FS; checkout always FS. */
function generateSchedule(checkIn, checkOut, policy, settings) {
  const checkInDate = String(checkIn).slice(0, 10);
  const checkOutDate = String(checkOut).slice(0, 10);
  if (!checkInDate || !checkOutDate) return [];

  const stayLength = calculateStayLength(checkInDate, checkOutDate);
  const tasks = [];

  if (stayLength <= 0) {
    tasks.push({
      scheduled_date: checkOutDate,
      task_type: 'full_service',
      is_checkout: true,
      stay_night: 1,
    });
    return tasks;
  }

  const fullServiceNights = new Set(
    calculateOptimalFullServiceNights(stayLength, policy, settings)
  );

  for (let stayNight = 1; stayNight < stayLength; stayNight++) {
    const isFs = fullServiceNights.has(stayNight);
    tasks.push({
      scheduled_date: addDays(checkInDate, stayNight),
      task_type: isFs ? 'full_service' : 'refresh',
      is_checkout: false,
      stay_night: stayNight,
    });
  }

  tasks.push({
    scheduled_date: checkOutDate,
    task_type: 'full_service',
    is_checkout: true,
    stay_night: Math.max(1, stayLength),
  });

  return tasks;
}

function buildTaskPayload({
  businessId,
  resolved,
  booking,
  task_type,
  is_checkout,
  scheduled_date,
  stay_night,
  policy,
}) {
  return {
    business_id: businessId,
    room_id: resolved.room_id,
    room_number:
      resolved.room_number !== null && resolved.room_number !== undefined
        ? Number(resolved.room_number)
        : null,
    room_name: resolved.room_name ?? null,
    booking_id: booking.id,
    guest_name: booking.guest_name || null,
    scheduled_date,
    stay_night: Math.max(1, Number(stay_night) || 1),
    task_type,
    is_checkout: !!is_checkout,
    priority: 'standard',
    status: 'pending',
    policy_used: policy,
  };
}

function logPayload(payload) {
  console.log('housekeeping_tasks INSERT payload', {
    room_id: payload.room_id,
    room_number: payload.room_number,
    room_name: payload.room_name,
    booking_id: payload.booking_id,
    guest_name: payload.guest_name,
    scheduled_date: payload.scheduled_date,
    stay_night: payload.stay_night,
    task_type: payload.task_type,
    is_checkout: payload.is_checkout,
    policy_used: payload.policy_used,
    status: payload.status,
  });
}

function parseFailedColumn(sqlError) {
  const text = String(sqlError || '');
  const m =
    text.match(/column "([^"]+)"/i) ||
    text.match(/null value in column "([^"]+)"/i) ||
    text.match(/violates .+ constraint "([^"]+)"/i);
  return m ? m[1] : null;
}

class InsertError extends Error {
  constructor(sqlError, payload) {
    super(typeof sqlError === 'string' ? sqlError : JSON.stringify(sqlError));
    this.name = 'InsertError';
    this.sqlError = sqlError;
    this.payload = payload;
    this.failedColumn = parseFailedColumn(
      typeof sqlError === 'string' ? sqlError : JSON.stringify(sqlError)
    );
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

    async function insertTask(payload) {
      logPayload(payload);
      const res = await fetch(`${supabaseUrl}/rest/v1/housekeeping_tasks`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }
      if (!res.ok) {
        const sqlError =
          typeof data === 'object' && data
            ? data.message || data.error || data.hint || text
            : text || res.statusText;
        throw new InsertError(sqlError, payload);
      }
      return data;
    }

    async function patchRoom(roomIdVal, patch) {
      await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${roomIdVal}`, {
        method: 'PATCH',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
      });
    }

    let settings = {
      policy: 'standard',
      custom_refresh_interval: 2,
      custom_full_interval: 3,
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
      if (bRes.ok) {
        bookings = await bRes.json();
      } else {
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
          checkout_tasks_ensured: 0,
          rooms_marked_dirty: 0,
          today: todayStr,
          policy,
          message: 'No bookings with assigned rooms. Allocate rooms first.',
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

    async function ensureCheckoutDirtyState(booking, resolved) {
      let createdTask = false;

      const openRes = await fetch(
        `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${businessId}&room_id=eq.${resolved.room_id}&scheduled_date=eq.${todayStr}&task_type=eq.full_service&is_checkout=eq.true&status=in.(pending,in_progress)&select=id`,
        { headers: restGet }
      );
      const open = openRes.ok ? await openRes.json() : [];

      if (!open || open.length === 0) {
        const stay_night = stayNightForDate(
          booking.check_in_date,
          booking.check_out_date,
          todayStr,
          true
        );
        const payload = buildTaskPayload({
          businessId,
          resolved,
          booking,
          task_type: 'full_service',
          is_checkout: true,
          scheduled_date: todayStr,
          stay_night,
          policy,
        });
        await insertTask(payload);
        createdTask = true;

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
              task_type: 'full_service',
              scheduled_date: todayStr,
              stay_night,
              is_checkout: true,
              policy,
            },
          }),
        }).catch(() => {});
      }

      const roomRes = await fetch(
        `${supabaseUrl}/rest/v1/rooms?id=eq.${resolved.room_id}&select=id,housekeeping_status`,
        { headers: restGet }
      );
      const roomRows = roomRes.ok ? await roomRes.json() : [];
      const hk = roomRows[0]?.housekeeping_status;
      const inWorkflow = ['cleaning_in_progress', 'awaiting_inspection'].includes(hk);

      if (!inWorkflow) {
        await patchRoom(resolved.room_id, {
          occupancy_status: 'departure_pending',
          housekeeping_status: 'dirty',
        });
      }

      return { createdTask, markedDirty: !inWorkflow };
    }

    let created = 0;
    let cancelledFuture = 0;
    let bookingsProcessed = 0;
    let skippedNoRoom = 0;
    let skippedStatus = 0;
    let skippedNoDates = 0;
    let checkoutTasksEnsured = 0;
    let roomsMarkedDirty = 0;

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
      const checkOutDate = String(booking.check_out_date).slice(0, 10);
      const schedule = generateSchedule(
        booking.check_in_date,
        booking.check_out_date,
        policy,
        settings
      );

      if (regenerate) {
        try {
          const exRes = await fetch(
            `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${businessId}&booking_id=eq.${booking.id}&status=in.(pending,in_progress)&select=id,scheduled_date,notes,is_checkout`,
            { headers: restGet }
          );
          const existing = exRes.ok ? await exRes.json() : [];
          for (const t of existing) {
            const d = String(t.scheduled_date).slice(0, 10);
            if (t.is_checkout && d === todayStr) continue;
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
        if (slot.is_checkout && slotDate === todayStr) continue;

        const dupRes = await fetch(
          `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${businessId}&room_id=eq.${resolved.room_id}&scheduled_date=eq.${slotDate}&task_type=eq.${slot.task_type}&status=in.(pending,in_progress,completed)&select=id`,
          { headers: restGet }
        );
        const dup = dupRes.ok ? await dupRes.json() : [];
        if (dup && dup.length) continue;

        const payload = buildTaskPayload({
          businessId,
          resolved,
          booking,
          task_type: slot.task_type,
          is_checkout: !!slot.is_checkout,
          scheduled_date: slotDate,
          stay_night: slot.stay_night,
          policy,
        });
        await insertTask(payload);
        created += 1;

        if (slotDate === todayStr && !slot.is_checkout) {
          const hk =
            slot.task_type === 'full_service' ? 'full_service_required' : 'refresh_required';
          const roomRes = await fetch(
            `${supabaseUrl}/rest/v1/rooms?id=eq.${resolved.room_id}&select=housekeeping_status`,
            { headers: restGet }
          );
          const rr = roomRes.ok ? await roomRes.json() : [];
          const current = rr[0]?.housekeeping_status;
          if (!['cleaning_in_progress', 'awaiting_inspection', 'dirty'].includes(current)) {
            await patchRoom(resolved.room_id, { housekeeping_status: hk });
          }
        }
      }

      if (checkOutDate === todayStr) {
        const result = await ensureCheckoutDirtyState(booking, resolved);
        if (result.createdTask) created += 1;
        checkoutTasksEnsured += 1;
        if (result.markedDirty) roomsMarkedDirty += 1;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        created,
        cancelled_future: cancelledFuture,
        checkout_tasks_ensured: checkoutTasksEnsured,
        rooms_marked_dirty: roomsMarkedDirty,
        bookings_matched: bookings.length,
        bookings_processed: bookingsProcessed,
        skipped_no_room: skippedNoRoom,
        skipped_status: skippedStatus,
        skipped_no_dates: skippedNoDates,
        today: todayStr,
        policy,
        message:
          checkoutTasksEnsured > 0
            ? `Checkout FS ensured for ${checkoutTasksEnsured} departure(s). Rooms marked dirty: ${roomsMarkedDirty}. Created ${created} new task(s).`
            : bookingsProcessed === 0
              ? 'No eligible bookings with resolvable rooms.'
              : `Created ${created} task(s). No checkouts today.`,
      }),
    };
  } catch (error) {
    console.error('generate-housekeeping-tasks fatal:', error);

    if (error && error.name === 'InsertError') {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: error.message,
          sql_error: error.sqlError,
          failed_column: error.failedColumn,
          payload: error.payload,
        }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to generate housekeeping tasks' }),
    };
  }
};
