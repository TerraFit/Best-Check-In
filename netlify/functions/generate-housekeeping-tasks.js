// netlify/functions/generate-housekeeping-tasks.js
// Cost-neutral Intelligent Stay Optimisation.
// Generate focuses on TODAY's operational tasks.
// Room readiness: task creation → not_ready (until Start → Cleaning → Inspection → Ready).

const {
  authenticateHousekeepingServiceLive,
  resolveBusinessId,
} = require('./_housekeepingServiceAuth.cjs');

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

function serviceForToday(checkIn, checkOut, todayStr, policy, settings) {
  const checkInDate = String(checkIn).slice(0, 10);
  const checkOutDate = String(checkOut).slice(0, 10);
  if (!checkInDate || !checkOutDate) return null;

  if (todayStr < checkInDate || todayStr > checkOutDate) return null;

  const stayLength = calculateStayLength(checkInDate, checkOutDate);

  if (todayStr === checkOutDate) {
    return {
      scheduled_date: todayStr,
      task_type: 'full_service',
      is_checkout: true,
      stay_night: Math.max(1, stayLength || 1),
      kind: 'checkout',
    };
  }

  if (todayStr === checkInDate) return null;

  const stayNight = calculateStayLength(checkInDate, todayStr);
  if (stayNight < 1 || stayNight >= stayLength) return null;

  const fullServiceNights = new Set(
    calculateOptimalFullServiceNights(stayLength, policy, settings)
  );
  const task_type = fullServiceNights.has(stayNight) ? 'full_service' : 'refresh';

  return {
    scheduled_date: todayStr,
    task_type,
    is_checkout: false,
    stay_night: stayNight,
    kind: 'stayover',
  };
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

/** Statuses that mean staff already own the room — do not overwrite */
const IN_WORKFLOW = ['cleaning_in_progress', 'awaiting_inspection'];

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
    const auth = await authenticateHousekeepingServiceLive(event, 'generate');
    if (!auth.ok) {
      return {
        statusCode: auth.status || 401,
        headers,
        body: JSON.stringify({ error: auth.error || 'Unauthorized', code: auth.code }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const scope = resolveBusinessId(auth.principal, body.businessId);
    if (!scope.ok) {
      return {
        statusCode: scope.status || 403,
        headers,
        body: JSON.stringify({ error: scope.error || 'Forbidden' }),
      };
    }
    const businessId = scope.businessId;
    const { bookingId, roomId, regenerate = true } = body;

    const supabaseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !key) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }

    const restGet = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    };
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

    async function clearOpenTasksFromToday(booking, resolved) {
      let removed = 0;
      let skippedHistorical = 0;

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
          if (t.booking_id === booking.id) continue;
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
      const bRes = await fetch(`${supabaseUrl}/rest/v1/${bookingQuery}`, {
        headers: restGet,
      });
      if (bRes.ok) {
        bookings = await bRes.json();
      } else {
        let fallback =
          `bookings?business_id=eq.${businessId}&room_id=not.is.null&select=id,guest_name,check_in_date,check_out_date,room_id,room_number,room_name,status`;
        if (bookingId) fallback += `&id=eq.${bookingId}`;
        if (roomId) fallback += `&room_id=eq.${roomId}`;
        const fRes = await fetch(`${supabaseUrl}/rest/v1/${fallback}`, {
          headers: restGet,
        });
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
          stayover_refresh: 0,
          stayover_full_service: 0,
          checkout_full_service: 0,
          open_tasks_removed: 0,
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
      if (
        booking.room_number === null ||
        booking.room_number === undefined ||
        booking.room_number === ''
      ) {
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

    /** Checkout → Departure Pending + Not Ready (unless already in HK workflow) */
    async function ensureCheckoutNotReady(booking, resolved) {
      const roomRes = await fetch(
        `${supabaseUrl}/rest/v1/rooms?id=eq.${resolved.room_id}&select=id,housekeeping_status`,
        { headers: restGet }
      );
      const roomRows = roomRes.ok ? await roomRes.json() : [];
      const hk = roomRows[0]?.housekeeping_status;
      const inWorkflow = IN_WORKFLOW.includes(hk);

      if (!inWorkflow) {
        await patchRoom(resolved.room_id, {
          occupancy_status: 'departure_pending',
          housekeeping_status: 'not_ready',
        });
      }

      return { markedNotReady: !inWorkflow };
    }

    /** Stayover task → Not Ready (unless already in HK workflow) */
    async function ensureStayoverNotReady(resolved) {
      const roomRes = await fetch(
        `${supabaseUrl}/rest/v1/rooms?id=eq.${resolved.room_id}&select=housekeeping_status`,
        { headers: restGet }
      );
      const rr = roomRes.ok ? await roomRes.json() : [];
      const current = rr[0]?.housekeeping_status;
      if (IN_WORKFLOW.includes(current)) return;
      // also protect legacy dirty if staff somehow mid-workflow without new status
      if (current === 'cleaning_in_progress' || current === 'awaiting_inspection') return;
      await patchRoom(resolved.room_id, { housekeeping_status: 'not_ready' });
    }

    async function taskAlreadyExists(roomIdVal, scheduledDate, taskType, isCheckout) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${businessId}&room_id=eq.${roomIdVal}&scheduled_date=eq.${scheduledDate}&task_type=eq.${taskType}&is_checkout=eq.${isCheckout}&status=in.(pending,in_progress,completed)&select=id`,
        { headers: restGet }
      );
      const rows = res.ok ? await res.json() : [];
      return rows && rows.length > 0;
    }

    let created = 0;
    let openTasksRemoved = 0;
    let skippedHistorical = 0;
    let stayoverRefresh = 0;
    let stayoverFullService = 0;
    let checkoutFullService = 0;
    let bookingsProcessed = 0;
    let stayoversConsidered = 0;
    let checkoutsConsidered = 0;
    let skippedNoRoom = 0;
    let skippedStatus = 0;
    let skippedNoDates = 0;
    let skippedOutsideWindow = 0;
    let roomsMarkedNotReady = 0;

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

      const checkInDate = String(booking.check_in_date).slice(0, 10);
      const checkOutDate = String(booking.check_out_date).slice(0, 10);

      if (todayStr < checkInDate || todayStr > checkOutDate) {
        skippedOutsideWindow += 1;
        continue;
      }

      const resolved = await resolveRoom(booking);
      if (!resolved?.room_id) {
        skippedNoRoom += 1;
        continue;
      }

      bookingsProcessed += 1;

      if (regenerate) {
        try {
          const cleared = await clearOpenTasksFromToday(booking, resolved);
          openTasksRemoved += cleared.removed;
          skippedHistorical += cleared.skippedHistorical;
        } catch (e) {
          console.warn('clear open tasks', e.message);
        }
      }

      const todayService = serviceForToday(
        checkInDate,
        checkOutDate,
        todayStr,
        policy,
        settings
      );

      if (todayService) {
        if (todayService.kind === 'checkout') checkoutsConsidered += 1;
        else stayoversConsidered += 1;

        const runKey = `${resolved.room_id}|${todayService.scheduled_date}|${todayService.task_type}|${
          todayService.is_checkout ? 'co' : 'mid'
        }`;

        if (!insertedKeys.has(runKey)) {
          const exists =
            !regenerate &&
            (await taskAlreadyExists(
              resolved.room_id,
              todayService.scheduled_date,
              todayService.task_type,
              todayService.is_checkout
            ));

          let skip = exists;
          if (regenerate) {
            const completedRes = await fetch(
              `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${businessId}&room_id=eq.${resolved.room_id}&scheduled_date=eq.${todayService.scheduled_date}&task_type=eq.${todayService.task_type}&is_checkout=eq.${todayService.is_checkout}&status=eq.completed&select=id`,
              { headers: restGet }
            );
            const completed = completedRes.ok ? await completedRes.json() : [];
            skip = completed && completed.length > 0;
          }

          if (!skip) {
            const payload = buildTaskPayload({
              businessId,
              resolved,
              booking,
              task_type: todayService.task_type,
              is_checkout: !!todayService.is_checkout,
              scheduled_date: todayService.scheduled_date,
              stay_night: todayService.stay_night,
              policy,
            });
            await insertTask(payload);
            insertedKeys.add(runKey);
            created += 1;

            if (todayService.kind === 'checkout') {
              checkoutFullService += 1;
              const result = await ensureCheckoutNotReady(booking, resolved);
              if (result.markedNotReady) roomsMarkedNotReady += 1;

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
                    stay_night: todayService.stay_night,
                    is_checkout: true,
                    policy,
                    readiness: 'not_ready',
                  },
                }),
              }).catch(() => {});
            } else {
              if (todayService.task_type === 'refresh') stayoverRefresh += 1;
              else stayoverFullService += 1;
              await ensureStayoverNotReady(resolved);
              roomsMarkedNotReady += 1;
            }
          }
        }
      }

      if (regenerate) {
        const schedule = generateSchedule(checkInDate, checkOutDate, policy, settings);
        for (const slot of schedule) {
          const slotDate = String(slot.scheduled_date).slice(0, 10);
          if (slotDate <= todayStr) continue;

          const runKey = `${resolved.room_id}|${slotDate}|${slot.task_type}|${
            slot.is_checkout ? 'co' : 'mid'
          }`;
          if (insertedKeys.has(runKey)) continue;

          const completedRes = await fetch(
            `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${businessId}&room_id=eq.${resolved.room_id}&scheduled_date=eq.${slotDate}&task_type=eq.${slot.task_type}&status=eq.completed&select=id`,
            { headers: restGet }
          );
          const completed = completedRes.ok ? await completedRes.json() : [];
          if (completed && completed.length) continue;

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
        }
      }
    }

    const message = [
      `Bookings processed: ${bookingsProcessed}`,
      `Stayover tasks created: Refresh: ${stayoverRefresh} · Full Service: ${stayoverFullService}`,
      `Checkout tasks created: Full Service (Checkout): ${checkoutFullService}`,
      `Total tasks created: ${created}`,
      roomsMarkedNotReady > 0 ? `Rooms marked Not Ready: ${roomsMarkedNotReady}` : null,
      openTasksRemoved > 0 ? `Open tasks removed: ${openTasksRemoved}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        created,
        stayover_refresh: stayoverRefresh,
        stayover_full_service: stayoverFullService,
        checkout_full_service: checkoutFullService,
        stayovers_considered: stayoversConsidered,
        checkouts_considered: checkoutsConsidered,
        open_tasks_removed: openTasksRemoved,
        skipped_historical_tasks: skippedHistorical,
        rooms_marked_not_ready: roomsMarkedNotReady,
        rooms_marked_dirty: roomsMarkedNotReady,
        bookings_matched: bookings.length,
        bookings_processed: bookingsProcessed,
        skipped_no_room: skippedNoRoom,
        skipped_status: skippedStatus,
        skipped_no_dates: skippedNoDates,
        skipped_outside_window: skippedOutsideWindow,
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
      body: JSON.stringify({
        error: error.message || 'Failed to generate housekeeping tasks',
      }),
    };
  }
};
