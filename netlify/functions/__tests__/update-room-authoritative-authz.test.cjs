const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';

function loadHandler() {
  const path = require.resolve('../update-room.js');
  delete require.cache[path];
  return require(path).handler;
}

function event({ method = 'POST', body = {}, token } = {}) {
  return {
    httpMethod: method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  };
}

function token({
  businessId = 'biz-a',
  role,
  permissionSet,
  employeeId,
  active = true,
} = {}) {
  const userMetadata = { business_id: businessId, active };
  if (employeeId) userMetadata.employee_id = employeeId;
  if (permissionSet) userMetadata.permission_set = permissionSet;

  const payload = {
    sub: 'user-1',
    email: 'user@example.com',
    user_metadata: userMetadata,
  };
  if (role) payload.role = role;
  return jwt.sign(payload, process.env.SUPABASE_JWT_SECRET);
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; },
    async text() { return typeof body === 'string' ? body : JSON.stringify(body); },
  };
}

test('OPTIONS remains public', async () => {
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse({}); };

  const response = await loadHandler()(event({ method: 'OPTIONS' }));

  assert.equal(response.statusCode, 204);
  assert.equal(fetchCalls, 0);
});

test('non-POST methods are rejected', async () => {
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse({}); };

  const response = await loadHandler()(event({ method: 'GET' }));

  assert.equal(response.statusCode, 405);
  assert.equal(fetchCalls, 0);
});

test('anonymous requests are rejected before room mutation', async () => {
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };

  const response = await loadHandler()(event({
    body: { roomId: 'room-a', businessId: 'biz-a', room_name: 'Room A' },
  }));

  assert.equal(response.statusCode, 401);
  assert.equal(fetchCalls, 0);
});

test('invalid JWT is rejected before room mutation', async () => {
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };

  const response = await loadHandler()(event({
    token: 'not-a-jwt',
    body: { roomId: 'room-a', businessId: 'biz-a', room_name: 'Room A' },
  }));

  assert.equal(response.statusCode, 401);
  assert.equal(fetchCalls, 0);
});

test('expired JWT is rejected before room mutation', async () => {
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };

  const expired = jwt.sign({
    sub: 'user-1',
    user_metadata: { business_id: 'biz-a', active: true },
    exp: Math.floor(Date.now() / 1000) - 60,
  }, process.env.SUPABASE_JWT_SECRET);

  const response = await loadHandler()(event({
    token: expired,
    body: { roomId: 'room-a', businessId: 'biz-a', room_name: 'Room A' },
  }));

  assert.equal(response.statusCode, 401);
  assert.equal(fetchCalls, 0);
});

test('tenant substitution is rejected before room mutation', async () => {
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };

  const response = await loadHandler()(event({
    token: token({ businessId: 'biz-a' }),
    body: { roomId: 'room-a', businessId: 'biz-other', room_name: 'Room A' },
  }));

  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalls, 0);
});

test('missing business scope is rejected before room mutation', async () => {
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };

  const noBusinessToken = jwt.sign({
    sub: 'user-1',
    email: 'user@example.com',
    user_metadata: { active: true },
  }, process.env.SUPABASE_JWT_SECRET);

  const response = await loadHandler()(event({
    token: noBusinessToken,
    body: { roomId: 'room-a', businessId: 'biz-a', room_name: 'Room A' },
  }));

  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalls, 0);
});

test('inactive employee is rejected before room mutation', async () => {
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };

  const response = await loadHandler()(event({
    token: token({
      businessId: 'biz-a', role: 'employee', employeeId: 'employee-1',
      active: false, permissionSet: ['canViewRooms'],
    }),
    body: { roomId: 'room-a', businessId: 'biz-a', room_name: 'Room A' },
  }));

  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalls, 0);
});

test('employee without room permission is rejected before room mutation', async () => {
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };

  const response = await loadHandler()(event({
    token: token({
      businessId: 'biz-a', role: 'employee', employeeId: 'employee-1', permissionSet: [],
    }),
    body: { roomId: 'room-a', businessId: 'biz-a', room_name: 'Room A' },
  }));

  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalls, 0);
});

test('authorized business actor is tenant-bound', async () => {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return jsonResponse([{
      id: 'room-a', business_id: 'biz-a', room_number: 1, room_name: 'Room A',
    }]);
  };

  const response = await loadHandler()(event({
    token: token({ businessId: 'biz-a' }),
    body: { roomId: 'room-a', businessId: 'biz-a', room_name: 'Updated Room' },
  }));

  assert.equal(response.statusCode, 200);
  assert.match(calls[0].url, /id=eq\.room-a/);
  assert.match(calls[0].url, /business_id=eq\.biz-a/);
  assert.equal(calls[0].options.method, 'PATCH');
  assert.equal(calls[1].url, 'https://example.supabase.co/rest/v1/room_events');
  const patchBody = JSON.parse(calls[0].options.body);
  assert.equal(patchBody.room_name, 'Updated Room');
});

test('authorized employee with canViewRooms can update a room', async () => {
  global.fetch = async () => jsonResponse([{
    id: 'room-a', business_id: 'biz-a', room_number: 1, room_name: 'Updated Room',
  }]);

  const response = await loadHandler()(event({
    token: token({
      businessId: 'biz-a', role: 'employee', employeeId: 'employee-1',
      permissionSet: ['canViewRooms'],
    }),
    body: { roomId: 'room-a', businessId: 'biz-a', room_name: 'Updated Room' },
  }));

  assert.equal(response.statusCode, 200);
});

test('room mutation remains tenant-scoped and immutable identifiers are not writable', async () => {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/rooms?')) {
      return jsonResponse([{ id: 'room-a', business_id: 'biz-a', room_number: 1 }]);
    }
    return jsonResponse({});
  };

  const response = await loadHandler()(event({
    token: token({ businessId: 'biz-a' }),
    body: {
      roomId: 'room-a', businessId: 'biz-a', room_name: 'Room A',
      room_number: 999, room_code: 'ATTACK',
    },
  }));

  assert.equal(response.statusCode, 200);
  const patch = JSON.parse(calls[0].options.body);
  assert.equal(patch.room_name, 'Room A');
  assert.equal(patch.room_number, undefined);
  assert.equal(patch.room_code, undefined);
  assert.ok(calls[0].url.includes('business_id=eq.biz-a'));
  assert.ok(!calls[0].url.includes('biz-other'));
});

test('data-layer failure does not expose room data', async () => {
  global.fetch = async () => jsonResponse({ error: 'database failure', room: 'secret-room' }, 500);

  const response = await loadHandler()(event({
    token: token({ businessId: 'biz-a' }),
    body: { roomId: 'room-a', businessId: 'biz-a', room_name: 'Room A' },
  }));

  assert.equal(response.statusCode, 500);
  assert.doesNotMatch(response.body, /secret-room/);
});
