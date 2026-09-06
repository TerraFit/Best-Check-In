const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';

function loadHandler() {
  const path = require.resolve('../get-available-rooms.js');
  delete require.cache[path];
  return require(path).handler;
}

function event({ businessId = 'biz-a', token, method = 'GET' } = {}) {
  return {
    httpMethod: method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    queryStringParameters: { businessId, checkIn: '2026-09-10', checkOut: '2026-09-12' },
  };
}

function token({ businessId = 'biz-a', role, employeeId, permissionSet = ['canViewRooms'] } = {}) {
  const userMetadata = { business_id: businessId, active: true };
  if (employeeId) userMetadata.employee_id = employeeId;
  if (role) userMetadata.role = role;
  if (permissionSet) userMetadata.permission_set = permissionSet;
  return jwt.sign({ sub: 'user-1', email: 'user@example.com', user_metadata: userMetadata }, process.env.SUPABASE_JWT_SECRET);
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; },
    async text() { return typeof body === 'string' ? body : JSON.stringify(body); },
  };
}

test('anonymous requests are rejected before database access', async () => {
  let calls = 0;
  global.fetch = async () => { calls += 1; return jsonResponse([]); };
  const response = await loadHandler()(event());
  assert.equal(response.statusCode, 401);
  assert.equal(calls, 0);
});

test('tenant substitution is rejected before database access', async () => {
  let calls = 0;
  global.fetch = async () => { calls += 1; return jsonResponse([]); };
  const response = await loadHandler()(event({ businessId: 'biz-other', token: token() }));
  assert.equal(response.statusCode, 403);
  assert.equal(calls, 0);
});

test('employee without canViewRooms is rejected', async () => {
  let calls = 0;
  global.fetch = async () => { calls += 1; return jsonResponse([]); };
  const response = await loadHandler()(event({ token: token({ role: 'employee', employeeId: 'employee-1', permissionSet: [] }) }));
  assert.equal(response.statusCode, 403);
  assert.equal(calls, 0);
});

test('authorized business actor uses authoritative tenant for both queries', async () => {
  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    if (String(url).includes('/rooms?')) {
      return jsonResponse([{ id: 'room-a', business_id: 'biz-a', room_number: 1, active: true }]);
    }
    return jsonResponse([]);
  };

  const response = await loadHandler()(event({ token: token() }));
  assert.equal(response.statusCode, 200);
  assert.ok(urls.every((url) => url.includes('business_id=eq.biz-a')));
  assert.equal(JSON.parse(response.body).success, true);
});

test('database failures do not expose upstream details', async () => {
  global.fetch = async () => jsonResponse({ error: 'secret database connection details' }, 500);
  const response = await loadHandler()(event({ token: token() }));
  assert.equal(response.statusCode, 500);
  assert.doesNotMatch(response.body, /secret database connection details/);
});

test('platform actors require platform:businesses:read', async () => {
  let calls = 0;
  global.fetch = async () => { calls += 1; return jsonResponse([]); };
  const platformToken = jwt.sign({
    sub: 'platform-user',
    platform_role: 'platform_developer',
  }, process.env.SUPABASE_JWT_SECRET);
  const response = await loadHandler()(event({ token: platformToken }));
  assert.equal(response.statusCode, 403);
  assert.equal(calls, 0);
});
