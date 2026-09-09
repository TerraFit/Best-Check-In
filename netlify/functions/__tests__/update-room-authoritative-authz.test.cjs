const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';

const SECRET = process.env.SUPABASE_JWT_SECRET;
let handler;
let calls;

function sign(payload, options = {}) {
  return jwt.sign(payload, SECRET, {
    expiresIn: '1h',
    issuer: process.env.FASTCHECKIN_JWT_ISSUER || 'fastcheckin',
    ...options,
  });
}

function token({
  sub = 'user-1',
  role = 'authenticated',
  businessId = 'biz-a',
  employeeId,
  staffRole,
  permissions,
  active = true,
} = {}) {
  const userMetadata = {
    business_id: businessId,
    active,
  };
  if (employeeId) userMetadata.employee_id = employeeId;
  if (staffRole) userMetadata.staff_role = staffRole;
  if (permissions) userMetadata.permission_set = permissions;

  return sign({ sub, role, user_metadata: userMetadata });
}

function event(jwtToken, body = {}, method = 'POST') {
  return {
    httpMethod: method,
    headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; },
    async text() { return typeof body === 'string' ? body : JSON.stringify(body); },
  };
}

before(async () => {
  ({ handler } = await import('../update-room.js?test=update-room-authoritative-authz'));
});

beforeEach(() => {
  calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });

    if (options.method === 'PATCH') {
      return jsonResponse([{
        id: 'room-1',
        business_id: 'biz-a',
        room_number: 1,
        room_name: 'Updated Room',
      }]);
    }

    if (options.method === 'POST' && String(url).includes('/room_events')) {
      return jsonResponse([{ id: 'event-1' }], 201);
    }

    return jsonResponse([]);
  };
});

after(() => { delete global.fetch; });

const owner = () => token({ sub: 'owner-1' });
const administration = () => token({
  sub: 'admin-1',
  employeeId: 'emp-admin',
  staffRole: 'administration',
  permissions: [
    'canViewDashboard',
    'canViewOperationalReports',
    'canViewGuestReports',
    'canViewAuditReports',
    'canExportReports',
    'canViewAuditLog',
    'canManageSettings',
    'canManageStaff',
    'canAccessStaffPortal',
    'canViewGuestDetails',
    'canViewRooms',
  ],
});
const maintenance = () => token({
  sub: 'maintenance-1',
  employeeId: 'emp-maint',
  staffRole: 'maintenance',
  permissions: [
    'canViewDashboard',
    'canViewMaintenance',
    'canCreateMaintenanceJob',
    'canCompleteMaintenanceJob',
    'canTakeRoomOffline',
    'canReturnRoomToService',
    'canViewRooms',
    'canApproveRoomChanges',
  ],
});
const frontDesk = () => token({
  sub: 'front-1',
  employeeId: 'emp-front',
  staffRole: 'front_desk',
});

function patchCalls() {
  return calls.filter((call) => call.options.method === 'PATCH');
}

function roomEventCalls() {
  return calls.filter((call) => call.options.method === 'POST' && call.url.includes('/room_events'));
}

test('OPTIONS remains public', async () => {
  const r = await handler(event(null, {}, 'OPTIONS'));
  assert.equal(r.statusCode, 204);
  assert.equal(calls.length, 0);
});

test('non-POST methods are rejected before database access', async () => {
  const r = await handler(event(owner(), { roomId: 'room-1', businessId: 'biz-a' }, 'GET'));
  assert.equal(r.statusCode, 405);
  assert.equal(calls.length, 0);
});

test('anonymous mutation is rejected before database access', async () => {
  const r = await handler(event(null, {
    roomId: 'room-1',
    businessId: 'biz-a',
    room_name: 'Hacked',
  }));
  assert.equal(r.statusCode, 401);
  assert.equal(calls.length, 0);
});

test('invalid JWT is rejected before database access', async () => {
  const r = await handler(event('not-a-jwt', {
    roomId: 'room-1',
    businessId: 'biz-a',
    room_name: 'Hacked',
  }));
  assert.equal(r.statusCode, 401);
  assert.equal(calls.length, 0);
});

test('expired JWT is rejected before database access', async () => {
  const expired = sign({
    sub: 'expired',
    user_metadata: { business_id: 'biz-a', active: true },
  }, { expiresIn: -1 });

  const r = await handler(event(expired, {
    roomId: 'room-1',
    businessId: 'biz-a',
    room_name: 'Hacked',
  }));

  assert.equal(r.statusCode, 401);
  assert.equal(calls.length, 0);
});

test('inactive employee is rejected before database access', async () => {
  const r = await handler(event(token({
    employeeId: 'emp-1',
    staffRole: 'administration',
    active: false,
  }), {
    roomId: 'room-1',
    businessId: 'biz-a',
    room_name: 'Hacked',
  }));

  assert.equal(r.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('employee with room view access cannot mutate administrative fields', async () => {
  const r = await handler(event(frontDesk(), {
    roomId: 'room-1',
    businessId: 'biz-a',
    room_name: 'Should Not Change',
  }));

  assert.equal(r.statusCode, 403);
  assert.match(r.body, /canManageSettings/);
  assert.equal(calls.length, 0);
});

test('administration may update administrative fields with tenant-scoped PATCH', async () => {
  const r = await handler(event(administration(), {
    roomId: 'room-1',
    businessId: 'biz-a',
    room_name: 'Room One',
    room_type: 'Deluxe',
    max_adults: 2,
    notes: 'Updated notes',
  }));

  assert.equal(r.statusCode, 200);
  assert.equal(patchCalls().length, 1);
  assert.match(patchCalls()[0].url, /id=eq\.room-1/);
  assert.match(patchCalls()[0].url, /business_id=eq\.biz-a/);

  const payload = JSON.parse(patchCalls()[0].options.body);
  assert.equal(payload.room_name, 'Room One');
  assert.equal(payload.room_type, 'Deluxe');
  assert.equal(payload.max_adults, 2);
  assert.equal(payload.notes, 'Updated notes');
  assert.equal(payload.room_number, undefined);
  assert.equal(payload.room_code, undefined);
  assert.equal(roomEventCalls().length, 1);
});

test('maintenance may update operational fields with tenant-scoped PATCH', async () => {
  const r = await handler(event(maintenance(), {
    roomId: 'room-1',
    businessId: 'biz-a',
    availability_status: 'unavailable',
    room_condition: 'maintenance',
    unavailable_reason: 'Plumbing repair',
  }));

  assert.equal(r.statusCode, 200);
  assert.equal(patchCalls().length, 1);
  assert.match(patchCalls()[0].url, /id=eq\.room-1/);
  assert.match(patchCalls()[0].url, /business_id=eq\.biz-a/);

  const payload = JSON.parse(patchCalls()[0].options.body);
  assert.equal(payload.availability_status, 'unavailable');
  assert.equal(payload.room_condition, 'maintenance');
  assert.equal(payload.unavailable_reason, 'Plumbing repair');
});

test('administration cannot mutate operational fields without room-change approval', async () => {
  const r = await handler(event(administration(), {
    roomId: 'room-1',
    businessId: 'biz-a',
    active: false,
  }));

  assert.equal(r.statusCode, 403);
  assert.match(r.body, /canApproveRoomChanges/);
  assert.equal(calls.length, 0);
});

test('maintenance cannot mutate administrative fields without settings authority', async () => {
  const r = await handler(event(maintenance(), {
    roomId: 'room-1',
    businessId: 'biz-a',
    room_name: 'Restricted Change',
  }));

  assert.equal(r.statusCode, 403);
  assert.match(r.body, /canManageSettings/);
  assert.equal(calls.length, 0);
});

test('mixed administrative and operational mutation requires both authorities', async () => {
  const r = await handler(event(administration(), {
    roomId: 'room-1',
    businessId: 'biz-a',
    room_name: 'Mixed Change',
    active: false,
  }));

  assert.equal(r.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('business owner with full permissions may perform a mixed room update', async () => {
  const r = await handler(event(owner(), {
    roomId: 'room-1',
    businessId: 'biz-a',
    room_name: 'Owner Change',
    active: false,
    availability_status: 'unavailable',
  }));

  assert.equal(r.statusCode, 200);
  assert.equal(patchCalls().length, 1);

  const payload = JSON.parse(patchCalls()[0].options.body);
  assert.equal(payload.room_name, 'Owner Change');
  assert.equal(payload.active, false);
  assert.equal(payload.availability_status, 'unavailable');
});

test('cross-tenant business substitution is rejected before room mutation', async () => {
  const r = await handler(event(administration(), {
    roomId: 'room-other',
    businessId: 'biz-other',
    room_name: 'Cross Tenant Attempt',
  }));

  assert.equal(r.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('room resource identifier is always paired with authoritative tenant scope', async () => {
  const r = await handler(event(administration(), {
    roomId: 'room-other',
    businessId: 'biz-a',
    room_name: 'Scoped Change',
  }));

  assert.equal(r.statusCode, 200);
  assert.equal(patchCalls().length, 1);
  assert.match(patchCalls()[0].url, /id=eq\.room-other/);
  assert.match(patchCalls()[0].url, /business_id=eq\.biz-a/);
});

test('immutable room_number and room_code cannot be used as mutation fields', async () => {
  const r = await handler(event(administration(), {
    roomId: 'room-1',
    businessId: 'biz-a',
    room_number: 999,
    room_code: 'ATTACK-CODE',
  }));

  assert.equal(r.statusCode, 400);
  assert.match(r.body, /No valid fields to update/);
  assert.equal(patchCalls().length, 0);
});

test('malformed JSON cannot reach the database', async () => {
  const r = await handler(event(administration(), '{not-json'));
  assert.equal(r.statusCode, 500);
  assert.equal(calls.length, 0);
});

test('room data-layer failure is sanitized', async () => {
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (options.method === 'PATCH') {
      return jsonResponse({ error: 'SECRET_DATABASE_ERROR', room: 'secret-room' }, 500);
    }
    return jsonResponse([]);
  };

  const r = await handler(event(administration(), {
    roomId: 'room-1',
    businessId: 'biz-a',
    room_name: 'Room One',
  }));

  assert.equal(r.statusCode, 500);
  assert.doesNotMatch(r.body, /SECRET_DATABASE_ERROR|secret-room/);
  assert.equal(roomEventCalls().length, 0);
});
