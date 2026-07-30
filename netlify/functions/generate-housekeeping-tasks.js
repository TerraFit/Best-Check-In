// netlify/functions/generate-housekeeping-tasks.js
// Cost-neutral Intelligent Stay Optimisation (final).
// Regeneration: open tasks from today onwards are replaced by the current schedule.
// Completed / historical tasks before today are never touched.

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

function calculateMaximumLinenAge(policy, settings) {
  if (policy === 'eco') return 5;
  if (policy === 'standard') return 3;
  if (policy === 'custom') return Math.max(1, settings?.custom_full_interval ?? 3);
  if (policy === 'premium') return 1;
  return 3;
}

function distributeServicesEvenly(stayLength, maxAge) {
  if (stayLength <= 0) return [];

  let k = Math.max(1, Math.ceil(stayLength / maxAge));

  while (k > 2) {
    const maxWithFewer = Math.ceil(stayLength / (k - 1));
    if (maxWithFewer > maxAge + 1) break;
    const minWithCurrent = Math.floor(stayLength / k);
    if (minWithCurrent <= maxAge - 1 && stayLength > maxAge * 3) {
      k -= 1;
    } else {
      break;
    }
  }

  const base = Math.floor(stayLength / k);
  const remainder = stayLength % k;
  const intervals = [];
  for (let i = 0; i < k; i++) {
    intervals.push(i < remainder ? base + 1 : base);
  }
  return intervals;
}

function calculateOptimalFullServiceNights(stayLength, policy, settings) {
  if (stayLength <= 1) return [];

  if (policy === 'premium') {
    const out = [];
    for (let n = 1; n < stayLength; n++) out.push(n);
    return out;
  }

  const maxAge = calculateMaximumLinenAge(policy, settings);
  if (stayLength <= maxAge) return [];

  const intervals = distributeServicesEvenly(stayLength, maxAge);
  const fs = [];
  let cum = 0;
  for (let i = 0; i < intervals.length - 1; i++) {
    cum += intervals[i];
    if (cum > 0 && cum < stayLength) fs.push(cum);
  }
  return fs;
}

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
    tasks.push({
      scheduled_date: addDays(checkInDate, stayNight),
      task_type: fullServiceNights.has(stayNight) ? 'full_service' : 'refresh',
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
    // Default regenerate=true so Generate / Refresh always replaces open work
    const { businessId, bookingId, roomId, regenerate = true } = body;

    if (!businessId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'businessId required' }) };
    }

    const restGet = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
    const patchHeaders = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    };

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
        headers: patchHeaders,
        body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
      });
    }

    async function cancelOpenTask(task) {
      await fetch(`${supabaseUrl}/rest/v1/housekeeping_tasks?id=eq.${task.id}`, {
        method: 'PATCH',
        headers: patchHeaders,
        body: JSON.stringify({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          notes: `${task.notes || ''} [auto-cancelled: schedule regenerated]`.trim(),
        }),
      });
    }

    /**
     * Remove every pending/in_progress task for this booking (and room orphans)
     * from today onwards. Completed / historical before today are left alone.
     */
    async function clearOpenTasksFromToday(booking, resolved) {
      let removed = 0;
      let skippedHistorical = 0;

      // 1) By booking_id
      const byBookingRes = await fetch(
        `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${businessId}&booking_id=eq.${booking.id}&status=in.(pending,in_progress)&select=id,scheduled_date,notes,task_type,is_checkout`,
        { headers: restGet }
      );
      const byBooking = byBookingRes.ok ? await byBookingRes.json() : [];

      for (const t of byBooking) {
        const d = String(t.scheduled_date).slice(0, 10);
        if (d < todayStr) {
          skippedHistorical += 1;
          continue;
        }
        await cancelOpenTask(t);
        removed += 1;
      }

      // 2) Room-level orphans (null booking_id or mismatched) scheduled today+ for this room
      if (resolved?.room_id) {
        const byRoomRes = await fetch(
          `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${businessId}&room_id=eq.${resolved.room_id}&status=in.(pending,in_progress)&select=id,scheduled_date,notes,booking_id,task_type,is_checkout`,
          { headers: restGet }
        );
        const byRoom = byRoomRes.ok ? await byRoomRes.json() : [];
        for (const t of byRoom) {
          const d = String(t.scheduled_date).slice(0, 10);
          if (d < todayStr) {
            skippedHistorical += 1;
            continue;
          }
          // Already cancelled via booking_id path
          if (t.booking_id === booking.id) continue;
          // Only clear orphans or tasks still open for this room from today
          if (!t.booking_id || t.booking_id === booking.id) {
            await cancelOpenTask(t);
            removed += 1;
          }
        }
      }

      return { removed, skippedHistorical };
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
          open_tasks_removed: 0,
          tasks_regenerated: 0,
          refresh_tasks: 0,
          full_service_tasks: 0,
          skipped_historical_tasks: 0,
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
    let openTasksRemoved = 0;
    let skippedHistorical = 0;
    let refreshTasks = 0;
    let fullServiceTasks = 0;
    let bookingsProcessed = 0;
    let skippedNoRoom = 0;
    let skippedStatus = 0;
    let skippedNoDates = 0;
    let checkoutTasksEnsured = 0;
    let roomsMarkedDirty = 0;

    // Track inserts within this run to avoid same-run duplicates
    const insertedKeys = new Set();

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

      // --- Clear stale open work (regenerate path) ---
      if (regenerate) {
        try {
          const cleared = await clearOpenTasksFromToday(booking, resolved);
          openTasksRemoved += cleared.removed;
          skippedHistorical += cleared.skippedHistorical;
        } catch (e) {
          console.warn('clear open tasks', e.message);
        }
      }

      // --- Insert current schedule from today onwards ---
      for (const slot of schedule) {
        const slotDate = String(slot.scheduled_date).slice(0, 10);
        if (slotDate < todayStr) continue;

        // Checkout today is handled by ensureCheckoutDirtyState for room state
        // but we still insert it here when regenerating so schedule is complete.
        // ensureCheckoutDirtyState is idempotent (checks for existing open FS).

        const runKey = `${resolved.room_id}|${slotDate}|${slot.task_type}|${slot.is_checkout ? 'co' : 'mid'}`;
        if (insertedKeys.has(runKey)) continue;

        // Only block if a completed task already exists for this room/date/type
        // (historical integrity). Do not let pending/in_progress block — those
        // were cancelled above when regenerating.
        const completedRes = await fetch(
          `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${businessId}&room_id=eq.${resolved.room_id}&scheduled_date=eq.${slotDate}&task_type=eq.${slot.task_type}&status=eq.completed&select=id`,
          { headers: restGet }
        );
        const completed = completedRes.ok ? await completedRes.json() : [];
        if (completed && completed.length) continue;

        // After regenerate, also skip if somehow still pending (race)
        if (!regenerate) {
          const openDupRes = await fetch(
            `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${businessId}&room_id=eq.${resolved.room_id}&scheduled_date=eq.${slotDate}&task_type=eq.${slot.task_type}&status=in.(pending,in_progress)&select=id`,
            { headers: restGet }
          );
          const openDup = openDupRes.ok ? await openDupRes.json() : [];
          if (openDup && openDup.length) continue;
        }

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
        insertedKeys.add(runKey);
        created += 1;

        if (slot.task_type === 'refresh') refreshTasks += 1;
        else fullServiceTasks += 1;

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
        if (result.createdTask) {
          created += 1;
          fullServiceTasks += 1;
        }
        checkoutTasksEnsured += 1;
        if (result.markedDirty) roomsMarkedDirty += 1;
      }
    }

    const message = [
      `Bookings processed: ${bookingsProcessed}`,
      `Open tasks removed: ${openTasksRemoved}`,
      `Tasks regenerated: ${created}`,
      `Refresh tasks: ${refreshTasks}`,
      `Full Service tasks: ${fullServiceTasks}`,
      `Skipped historical tasks: ${skippedHistorical}`,
    ].join(' · ');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        created,
        open_tasks_removed: openTasksRemoved,
        tasks_regenerated: created,
        refresh_tasks: refreshTasks,
        full_service_tasks: fullServiceTasks,
        skipped_historical_tasks: skippedHistorical,
        checkout_tasks_ensured: checkoutTasksEnsured,
        rooms_marked_dirty: roomsMarkedDirty,
        bookings_matched: bookings.length,
        bookings_processed: bookingsProcessed,
        skipped_no_room: skippedNoRoom,
        skipped_status: skippedStatus,
        skipped_no_dates: skippedNoDates,
        today: todayStr,
        policy,
        regenerate,
        message,
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
