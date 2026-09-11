const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-room-limit';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.FASTCHECKIN_JWT_ISSUER = 'fastcheckin';

const { handler } = require('../update-business-profile.js');

function token() {
  return jwt.sign({
    sub: 'owner-a',
    email: 'owner-a@example.com',
    user_metadata: { business_id: 'biz-a', permission_set: ['canManageSettings'] },
  }, process.env.SUPABASE_JWT_SECRET, { issuer: process.env.FASTCHECKIN_JWT_ISSUER, expiresIn: '15m' });
}

function event(body) {
  return {
    httpMethod: 'POST',
    headers: { authorization: `Bearer ${token()}` },
    body: JSON.stringify({ businessId: 'biz-a', ...body }),
  };
}

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

test('total_rooms may be increased up to authoritative max_rooms', async () => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/businesses?') && options.method !== 'PATCH') {
      return response([{ id: 'biz-a', max_rooms: 15 }]);
    }
    return response([{ id: 'biz-a', total_rooms: 15, max_rooms: 15 }]);
  };
  try {
    const result = await handler(event({ total_rooms: 15 }));
    assert.equal(result.statusCode, 200);
    const patch = calls.find((c) => c.options.method === 'PATCH');
    assert.ok(patch);
    assert.equal(JSON.parse(patch.options.body).total_rooms, 15);
  } finally {
    global.fetch = originalFetch;
  }
});

test('total_rooms above authoritative max_rooms is rejected before PATCH', async () => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return response([{ id: 'biz-a', max_rooms: 15 }]);
  };
  try {
    const result = await handler(event({ total_rooms: 16 }));
    assert.equal(result.statusCode, 400);
    const body = JSON.parse(result.body);
    assert.equal(body.code, 'ROOM_LIMIT_REACHED');
    assert.equal(body.maxRooms, 15);
    assert.equal(body.totalRooms, 16);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.method, undefined);
  } finally {
    global.fetch = originalFetch;
  }
});

test('client cannot change max_rooms through profile update', async () => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return response([{ id: 'biz-a', trading_name: 'Safe Name' }]);
  };
  try {
    const result = await handler(event({ trading_name: 'Safe Name', max_rooms: 100 }));
    assert.equal(result.statusCode, 200);
    const patch = calls.find((c) => c.options.method === 'PATCH');
    assert.ok(patch);
    const sent = JSON.parse(patch.options.body);
    assert.equal(sent.max_rooms, undefined);
    assert.equal(sent.trading_name, 'Safe Name');
  } finally {
    global.fetch = originalFetch;
  }
});

test('total_rooms may be reduced below the licensed ceiling', async () => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/businesses?') && options.method !== 'PATCH') {
      return response([{ id: 'biz-a', max_rooms: 15 }]);
    }
    return response([{ id: 'biz-a', total_rooms: 10, max_rooms: 15 }]);
  };
  try {
    const result = await handler(event({ total_rooms: 10 }));
    assert.equal(result.statusCode, 200);
    const patch = calls.find((c) => c.options.method === 'PATCH');
    assert.ok(patch);
    assert.equal(JSON.parse(patch.options.body).total_rooms, 10);
  } finally {
    global.fetch = originalFetch;
  }
});

test('room license lookup failure is sanitized and prevents profile mutation', async () => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return response({ error: 'SECRET database credentials' }, 500);
  };
  try {
    const result = await handler(event({ total_rooms: 10 }));
    assert.equal(result.statusCode, 502);
    assert.match(result.body, /ROOM_LICENSE_LOOKUP_FAILED/);
    assert.doesNotMatch(result.body, /SECRET|credentials/);
    assert.equal(calls.length, 1);
  } finally {
    global.fetch = originalFetch;
  }
});