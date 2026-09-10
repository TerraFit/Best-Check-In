const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const ORIGINAL_ENV = { ...process.env };

function token(overrides = {}, options = {}) {
  const role = overrides.role || 'business_owner';
  const businessId = overrides.businessId === undefined ? 'biz-a' : overrides.businessId;
  const active = overrides.active === undefined ? true : overrides.active;
  const permissions = overrides.permissions === undefined ? ['canApproveRoomChanges'] : overrides.permissions;
  const employeeId = overrides.employeeId || 'emp-a';

  return jwt.sign({
    sub: overrides.sub || (role === 'employee' ? employeeId : 'user-a'),
    email: overrides.email || 'user@example.com',
    user_metadata: {
      business_id: businessId,
      ...(role === 'employee' ? { employee_id: employeeId, staff_role: overrides.staffRole || 'Foreman' } : {}),
      active,
      permission_set: permissions,
    },
    ...overrides,
    user_metadata: {
      business_id: businessId,
      ...(role === 'employee' ? { employee_id: employeeId, staff_role: overrides.staffRole || 'Foreman' } : {}),
      active,
      permission_set: permissions,
      ...(overrides.user_metadata || {}),
    },
  }, process.env.SUPABASE_JWT_SECRET || 'test-secret', {
    issuer: process.env.FASTCHECKIN_JWT_ISSUER || 'fastcheckin',
    expiresIn: options.expiresIn || '1h',
  });
}

function event({ method = 'POST', body = {}, authToken } = {}) {
  return {
    httpMethod: method,
    headers: authToken ? { authorization: `Bearer ${authToken}` } : {},
    body: JSON.stringify(body),
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function business(maxRooms = 3) {
  return { id: 'biz-a', max_rooms: maxRooms };
}

function room(id, roomNumber, active = true) {
  return { id, room_number: roomNumber, active };
}

function loadHandler() {
  delete require.cache[require.resolve('../sync-rooms.js')];
  return require('../sync-rooms.js').handler;
}

const oldFetch = global.fetch;

test.beforeEach(() => {
  process.env.SUPABASE_JWT_SECRET = 'test-secret';
  process.env.FASTCHECKIN_JWT_ISSUER = 'fastcheckin';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'service-key';
});

test.afterEach(() => {
  global.fetch = oldFetch;
  process.env = { ...ORIGINAL_ENV };
});

test('OPTIONS remains public', async () => {
  global.fetch = async () => { throw new Error('fetch should not be called'); };
  const response = await loadHandler()(event({ method: 'OPTIONS' }));
  assert.equal(response.statusCode, 204);
});

test('non-POST methods are rejected', async () => {
  global.fetch = async () => { throw new Error('fetch should not be called'); };
  const response = await loadHandler()(event({ method: 'GET' }));
  assert.equal(response.statusCode, 405);
});

test('anonymous requests are rejected before room mutation', async () => {
  global.fetch = async () => { throw new Error('fetch should not be called'); };
  const response = await loadHandler()(event({ body: { businessId: 'biz-a', totalRooms: 3 } }));
  assert.equal(response.statusCode, 401);
});

test('invalid JWT is rejected before room mutation', async () => {
  global.fetch = async () => { throw new Error('fetch should not be called'); };
  const response = await loadHandler()(event({ authToken: 'invalid', body: { businessId: 'biz-a', totalRooms: 3 } }));
  assert.equal(response.statusCode, 401);
});

test('expired JWT is rejected before room mutation', async () => {
  global.fetch = async () => { throw new Error('fetch should not be called'); };
  const expired = token({}, { expiresIn: -1 });
  const response = await loadHandler()(event({ authToken: expired, body: { businessId: 'biz-a', totalRooms: 3 } }));
  assert.equal(response.statusCode, 401);
});

test('tenant substitution is rejected before room mutation', async () => {
  global.fetch = async () => { throw new Error('fetch should not be called'); };
  const response = await loadHandler()(event({ authToken: token({ businessId: 'biz-a' }), body: { businessId: 'biz-b', totalRooms: 3 } }));
  assert.equal(response.statusCode, 403);
});

test('missing business scope is rejected before room mutation', async () => {
  global.fetch = async () => { throw new Error('fetch should not be called'); };
  const response = await loadHandler()(event({ authToken: token({ businessId: null }), body: { businessId: 'biz-a', totalRooms: 3 } }));
  assert.equal(response.statusCode, 403);
});

test('inactive employee is rejected before room mutation', async () => {
  global.fetch = async () => { throw new Error('fetch should not be called'); };
  const response = await loadHandler()(event({ authToken: token({ role: 'employee', active: false }), body: { businessId: 'biz-a', totalRooms: 3 } }));
  assert.equal(response.statusCode, 403);
});

test('employee without room-change approval is rejected before room mutation', async () => {
  global.fetch = async () => { throw new Error('fetch should not be called'); };
  const response = await loadHandler()(event({ authToken: token({ role: 'employee', permissions: ['canViewRooms'] }), body: { businessId: 'biz-a', totalRooms: 3 } }));
  assert.equal(response.statusCode, 403);
});

test('authorized foreman with room-change approval can synchronize rooms', async () => {
  global.fetch = async (url, options = {}) => {
    if (String(url).includes('/businesses?')) return jsonResponse([business(3)]);
    if (String(url).includes('/rooms?')) return jsonResponse([]);
    if (String(url).endsWith('/rooms')) return jsonResponse([room('room-1', 1)]);
    if (String(url).includes('/room_events')) return jsonResponse([]);
    return jsonResponse([]);
  };
  const response = await loadHandler()(event({ authToken: token({ role: 'employee' }), body: { businessId: 'biz-a', totalRooms: 1 } }));
  assert.equal(response.statusCode, 200);
});

test('business owner may synchronize its own tenant', async () => {
  global.fetch = async (url, options = {}) => {
    if (String(url).includes('/businesses?')) return jsonResponse([business(3)]);
    if (String(url).includes('/rooms?')) return jsonResponse([]);
    if (String(url).endsWith('/rooms')) return jsonResponse([room('room-1', 1), room('room-2', 2), room('room-3', 3)]);
    if (String(url).includes('/room_events')) return jsonResponse([]);
    return jsonResponse([]);
  };
  const response = await loadHandler()(event({ authToken: token({ role: 'business_owner' }), body: { businessId: 'biz-a', totalRooms: 3 } }));
  assert.equal(response.statusCode, 200);
});

test('licensed ceiling allows synchronization exactly up to max_rooms', async () => {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/businesses?')) return jsonResponse([business(3)]);
    if (String(url).includes('/rooms?')) return jsonResponse([room('room-1', 1), room('room-2', 2)]);
    if (String(url).endsWith('/rooms')) return jsonResponse([room('room-3', 3)]);
    if (String(url).includes('/room_events')) return jsonResponse([]);
    return jsonResponse([]);
  };
  const response = await loadHandler()(event({ authToken: token({ businessId: 'biz-a' }), body: { businessId: 'biz-a', totalRooms: 3 } }));
  assert.equal(response.statusCode, 200);
  assert.ok(calls.some((c) => c.options.method === 'POST' && c.url.endsWith('/rooms')));
});

test('licensed ceiling rejects excess rooms before room lookup or mutation', async () => {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/businesses?')) return jsonResponse([business(3)]);
    return jsonResponse([]);
  };
  const response = await loadHandler()(event({ authToken: token({ businessId: 'biz-a' }), body: { businessId: 'biz-a', totalRooms: 4 } }));
  assert.equal(response.statusCode, 400);
  const body = JSON.parse(response.body);
  assert.equal(body.code, 'ROOM_LIMIT_REACHED');
  assert.equal(body.maxRooms, 3);
  assert.equal(body.totalRooms, 4);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /businesses\?id=eq\.biz-a&select=id,max_rooms/);
});

test('room creation is explicitly tenant-scoped', async () => {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/businesses?')) return jsonResponse([business(3)]);
    if (String(url).includes('/rooms?')) return jsonResponse([]);
    if (String(url).endsWith('/rooms')) return jsonResponse([room('room-new', 1)]);
    if (String(url).includes('/room_events')) return jsonResponse([]);
    return jsonResponse([]);
  };
  const response = await loadHandler()(event({ authToken: token({ businessId: 'biz-a' }), body: { businessId: 'biz-a', totalRooms: 1 } }));
  assert.equal(response.statusCode, 200);
  const insert = calls.find((c) => c.options.method === 'POST' && c.url.endsWith('/rooms'));
  assert.ok(insert);
  const payload = JSON.parse(insert.options.body);
  assert.equal(payload[0].business_id, 'biz-a');
});

test('data-layer failure does not expose room data', async () => {
  global.fetch = async (url) => {
    if (String(url).includes('/businesses?')) return jsonResponse([business(3)]);
    if (String(url).includes('/rooms?')) return jsonResponse({ secret: 'room-data' }, 500);
    return jsonResponse([]);
  };
  const response = await loadHandler()(event({ authToken: token({ businessId: 'biz-a' }), body: { businessId: 'biz-a', totalRooms: 1 } }));
  assert.equal(response.statusCode, 500);
  assert.doesNotMatch(response.body, /room-data/);
});
