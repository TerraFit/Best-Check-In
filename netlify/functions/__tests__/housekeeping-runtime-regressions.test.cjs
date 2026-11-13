const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const BUSINESS_ID = '7417fcbb-7771-4d44-8c7f-ccef573fa24b';
const ROOM_ID = '11111111-1111-4111-8111-111111111111';
const TASK_ID = '22222222-2222-4222-8222-222222222222';
const SECRET = 'housekeeping-handler-test-secret';

function authEvent({ employee = false, permissions = [] } = {}) {
  const userMetadata = { business_id: BUSINESS_ID };
  if (employee) {
    userMetadata.employee_id = '33333333-3333-4333-8333-333333333333';
    userMetadata.staff_role = 'housekeeper';
    userMetadata.permission_set = permissions;
  }
  const token = jwt.sign({
    sub: employee ? userMetadata.employee_id : '44444444-4444-4444-8444-444444444444',
    role: 'authenticated',
    user_metadata: userMetadata,
  }, SECRET, { issuer: 'fastcheckin', expiresIn: '5m' });
  return { headers: { authorization: \`Bearer \${token}\` } };
}

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

async function withSupabaseMock(fetchMock, run) {
  const previousFetch = global.fetch;
  const previousEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
  };
  process.env.SUPABASE_URL = 'https://supabase.test';
  process.env.SUPABASE_SERVICE_KEY = 'service-test-key';
  process.env.SUPABASE_JWT_SECRET = SECRET;
  global.fetch = fetchMock;
  try {
    await run();
  } finally {
    global.fetch = previousFetch;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('ignore handler returns an audited 409 for partial previous-task cleanup', async () => {
  const { handler } = await import('../ignore-housekeeping-task.js');
  const task = {
    id: TASK_ID, business_id: BUSINESS_ID, room_id: ROOM_ID, status: 'pending',
    task_type: 'refresh', scheduled_date: '2026-11-13', booking_id: null,
    guest_name: 'Current Guest', notes: '',
  };
  const room = { id: ROOM_ID, occupancy_status: 'occupied', availability_status: 'available', active: true, housekeeping_status: 'not_ready' };
  const previousTasks = [
    { id: 'old-1', booking_id: 'booking-1', guest_name: 'Guest One', scheduled_date: '2026-11-11', status: 'pending' },
    { id: 'old-2', booking_id: 'booking-2', guest_name: 'Guest Two', scheduled_date: '2026-11-12', status: 'pending' },
  ];
  const calls = [];
  await withSupabaseMock(async (url, options = {}) => {
    const method = options.method || 'GET';
    calls.push({ url: String(url), method, body: options.body ? JSON.parse(options.body) : null });
    if (String(url).includes('/housekeeping_tasks?id=eq.' + TASK_ID)) return jsonResponse([task]);
    if (String(url).includes('/rooms?id=eq.' + ROOM_ID)) return jsonResponse([room]);
    if (String(url).includes('/housekeeping_service_sessions?')) return jsonResponse([]);
    if (String(url).includes('/housekeeping_tasks?') && String(url).includes('status=eq.pending')) return jsonResponse(previousTasks);
    if (method === 'PATCH' && String(url).includes('/housekeeping_tasks?id=in.')) return jsonResponse([{ ...previousTasks[0], status: 'skipped' }]);
    if (method === 'POST' && String(url).includes('/room_events')) return jsonResponse([{ id: 'audit-1' }]);
    throw new Error('Unexpected Supabase request: ' + method + ' ' + url);
  }, async () => {
    const result = await handler({
      ...authEvent({ employee: true, permissions: ['canCompleteHousekeepingTask'] }),
      httpMethod: 'POST',
      body: JSON.stringify({ businessId: BUSINESS_ID, taskId: TASK_ID, reason: 'Room was cleaned but not recorded' }),
    });
    assert.equal(result.statusCode, 409);
    const payload = JSON.parse(result.body);
    assert.equal(payload.code, 'PREVIOUS_TASKS_CHANGED');
    assert.equal(payload.state_updated, true);
    assert.equal(payload.changed_count, 1);
    assert.equal(payload.expected_count, 2);
    const audit = calls.find((call) => call.method === 'POST' && call.url.includes('/room_events'));
    assert.ok(audit, 'partial cleanup must be audited before returning conflict');
    assert.equal(audit.body.details.expected_count, 2);
    assert.equal(audit.body.details.changed_count, 1);
    assert.equal(audit.body.details.partial, true);
    assert.deepEqual(audit.body.details.cleared_tasks.map((item) => item.task_id), ['old-1']);
  });
});

test('bulk readiness handler leaves rooms untouched when a task is in progress or a session is active', async (t) => {
  const { handler } = await import('../admin-bulk-room-readiness.js');
  for (const activeKind of ['task', 'session']) {
    await t.test(\`blocks active \${activeKind}\`, async () => {
      const calls = [];
      await withSupabaseMock(async (url, options = {}) => {
        const method = options.method || 'GET';
        const target = String(url);
        calls.push({ url: target, method });
        if (target.includes('/rooms?id=in.(')) {
          return jsonResponse([{
            id: ROOM_ID, room_number: '1', room_name: 'Stone',
            active: true, availability_status: 'available', occupancy_status: 'vacant',
            housekeeping_status: 'ready',
          }]);
        }
        if (target.includes('/housekeeping_tasks?') && target.includes('status=eq.in_progress')) {
          return jsonResponse(activeKind === 'task' ? [{ id: TASK_ID, status: 'in_progress' }] : []);
        }
        if (target.includes('/housekeeping_service_sessions?')) {
          return jsonResponse(activeKind === 'session' ? [{ id: 'session-1', status: 'active' }] : []);
        }
        throw new Error('Unexpected Supabase request: ' + method + ' ' + target);
      }, async () => {
        const result = await handler({
          ...authEvent(),
          httpMethod: 'POST',
          body: JSON.stringify({ businessId: BUSINESS_ID, roomIds: [ROOM_ID], action: 'approved' }),
        });
        assert.equal(result.statusCode, 200);
        const payload = JSON.parse(result.body);
        assert.equal(payload.updated, 0);
        assert.equal(payload.notChanged, 1);
        assert.match(payload.unchanged[0].reason, /in.progress|active service session/i);
        assert.equal(calls.some((call) => call.method === 'PATCH' && call.url.includes('/rooms?id=eq.')), false);
        assert.equal(calls.some((call) => call.method === 'POST' && call.url.includes('/room_events')), false);
      });
    });
  }
});

test('Today handler keeps overdue pending work visible when a newer completed-today task exists for the room', async () => {
  const { handler } = await import('../get-housekeeping-tasks.js');
  const overduePending = {
    id: 'overdue-pending', business_id: BUSINESS_ID, room_id: ROOM_ID, room_number: '1',
    room_name: 'Stone', task_type: 'refresh', scheduled_date: '2026-11-12',
    status: 'pending', is_checkout: false, created_at: '2026-11-12T06:00:00Z',
    updated_at: '2026-11-12T06:30:00Z',
  };
  const completedToday = {
    id: 'completed-today', business_id: BUSINESS_ID, room_id: ROOM_ID, room_number: '1',
    room_name: 'Stone', task_type: 'full_service', scheduled_date: '2026-11-13',
    status: 'completed', is_checkout: true, completed_at: '2026-11-13T10:00:00+02:00',
    created_at: '2026-11-13T09:00:00Z', updated_at: '2026-11-13T12:00:00Z',
  };
  const calls = [];
  await withSupabaseMock(async (url, options = {}) => {
    const target = String(url);
    calls.push(target);
    if (target.includes('/housekeeping_tasks?') && target.includes('order=scheduled_date.asc')) {
      return jsonResponse([overduePending, completedToday]);
    }
    if (target.includes('/housekeeping_service_sessions?')) return jsonResponse([]);
    if (target.includes('/housekeeping_tasks?') && target.includes('status=eq.skipped')) return jsonResponse([]);
    if (target.includes('/housekeeping_tasks?') && target.includes('scheduled_date=eq.2026-11-13')) return jsonResponse([]);
    if (target.includes('/housekeeping_tasks?') && target.includes('status=eq.completed&completed_at=')) return jsonResponse([]);
    if (target.includes('/housekeeping_tasks?') && target.includes('scheduled_date=lt.2026-11-13')) return jsonResponse([]);
    if (target.includes('/rooms?')) return jsonResponse([]);
    throw new Error('Unexpected Supabase request: GET ' + target);
  }, async () => {
    const result = await handler({
      ...authEvent({ employee: true, permissions: ['canViewHousekeeping', 'canCompleteHousekeepingTask'] }),
      httpMethod: 'GET',
      queryStringParameters: { businessId: BUSINESS_ID, view: 'today', date: '2026-11-13' },
    });
    assert.equal(result.statusCode, 200);
    const payload = JSON.parse(result.body);
    assert.equal(payload.tasks.length, 1);
    assert.equal(payload.tasks[0].id, 'overdue-pending');
    assert.equal(payload.tasks[0].status, 'pending');
  });
});
