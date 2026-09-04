const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';

function loadHandler() {
  const path = require.resolve('../sync-rooms.js');
  delete require.cache[path];
  return require(path).handler;
}

function event({ method = 'POST', body = {}, token } = {}) {
  return {
    httpMethod: method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

function token({ businessId = 'biz-a', role, permissionSet, employeeId, active = true } = {}) {
  const userMetadata = { business_id: businessId, active };
  if (employeeId) userMetadata.employee_id = employeeId;
  if (permissionSet) userMetadata.permission_set = permissionSet;
  const payload = { sub: 'user-1', email: 'user@example.com', user_metadata: userMetadata };
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

function room(id = 'room-a', number = 1, businessId = 'biz-a', active = true) {
  return { id, business_id: businessId, room_number: number, room_code: `R-${number}`, active };
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
  const response = await loadHandler()(event({ body: { businessId: 'biz-a', totalRooms: 3 } }));
  assert.equal(response.statusCode, 401);
  assert.equal(fetchCalls, 0);
});

test('invalid JWT is rejected before room mutation', async () => {
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };
  const response = await loadHandler()(event({ token: 'not-a-jwt', body: { businessId: 'biz-a', totalRooms: 3 } }));
  assert.equal(response.statusCode, 401);
  assert.equal(fetchCalls, 0);
});

test('expired JWT is rejected before room mutation', async () => {
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };
  const expired = jwt.sign({ sub: 'user-1', user_metadata: { business_id: 'biz-a', active: true }, exp: Math.floor(Date.now() / 1000) - 60 }, process.env.SUPABASE_JWT_SECRET);
  const response = await loadHandler()(event({ token: expired, body: { businessId: 'biz-a', totalRooms: 3 } }));
  assert.equal(response.statusCode, 401);
  assert.equal(fetchCalls, 0);
});

test('tenant substitution is rejected before room mutation', async () => {
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };
  const response = await loadHandler()(event({ token: token({ businessId: 'biz-a' }), body: { businessId: 'biz-other', totalRooms: 3 } }));
  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalls, 0);
});

test('missing business scope is rejected before room mutation', async () => {
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };
  const noBusinessToken = jwt.sign({ sub: 'user-1', user_metadata: { active: true } }, process.env.SUPABASE_JWT_SECRET);
  const response = await loadHandler()(event({ token: noBusinessToken, body: { businessId: 'biz-a', totalRooms: 3 } }));
  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalls, 0);
});

test('inactive employee is rejected before room mutation', async () => {
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };
  const response = await loadHandler()(event({ token: token({ businessId: 'biz-a', role: 'employee', employeeId: 'employee-1', active: false, permissionSet: ['canApproveRoomChanges'] }), body: { businessId: 'biz-a', totalRooms: 3 } }));
  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalls, 0);
});

test('employee without room-change approval is rejected before room mutation', async () => {
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return jsonResponse([]); };
  const response = await loadHandler()(event({ token: token({ businessId: 'biz-a', role: 'employee', employeeId: 'employee-1', permissionSet: ['canViewRooms'] }), body: { businessId: 'biz-a', totalRooms: 3 } }));
  assert.equal(response.statusCode, 403);
  assert.equal(fetchCalls, 0);
});

test('authorized foreman with room-change approval can synchronize rooms', async () => {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/rooms?')) return jsonResponse([room()]);
    return jsonResponse([]);
  };
  const response = await loadHandler()(event({ token: token({ businessId: 'biz-a', role: 'foreman', employeeId: 'employee-1', permissionSet: ['canApproveRoomChanges'] }), body: { businessId: 'biz-a', totalRooms: 1 } }));
  assert.equal(response.statusCode, 200);
  assert.ok(calls.some((c) => c.url.includes('business_id=eq.biz-a')));
});

test('business owner may synchronize its own tenant', async () => {
  global.fetch = async (url) => String(url).includes('/rooms?') ? jsonResponse([room()]) : jsonResponse([]);
  const response = await loadHandler()(event({ token: token({ businessId: 'biz-a' }), body: { businessId: 'biz-a', totalRooms: 1 } }));
  assert.equal(response.statusCode, 200);
});

test('room creation is explicitly tenant-scoped', async () => {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/rooms?')) return jsonResponse([]);
    if (String(url).endsWith('/rooms')) return jsonResponse([room('room-new', 1)]);
    return jsonResponse([]);
  };
  const response = await loadHandler()(event({ token: token({ businessId: 'biz-a' }), body: { businessId: 'biz-a', totalRooms: 1 } }));
  assert.equal(response.statusCode, 200);
  const insert = calls.find((c) => c.options.method === 'POST' && c.url.endsWith('/rooms'));
  assert.ok(insert);
  const payload = JSON.parse(insert.options.body);
  assert.equal(payload[0].business_id, 'biz-a');
});

test('data-layer failure does not expose room data', async () => {
  global.fetch = async () => jsonResponse({ error: 'database failure', room: 'secret-room' }, 500);
  const response = await loadHandler()(event({ token: token({ businessId: 'biz-a' }), body: { businessId: 'biz-a', totalRooms: 3 } }));
  assert.equal(response.statusCode, 500);
  assert.doesNotMatch(response.body, /secret-room/);
});
