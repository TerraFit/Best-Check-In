const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

function sign(payload) { return jwt.sign(payload, process.env.SUPABASE_JWT_SECRET, { expiresIn: '15m' }); }
function event(token, body) { return { httpMethod: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body) }; }
async function load() { return import(`../create-lost-found-item.js?test=${Date.now()}-${Math.random()}`); }

test('create-lost-found-item rejects anonymous callers before database access', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls += 1; throw new Error('DB must not be reached'); };
  try {
    const { handler } = await load();
    const result = await handler(event(null, { businessId: 'biz-a', item_name: 'Wallet' }));
    assert.equal(result.statusCode, 401);
    assert.equal(calls, 0);
  } finally { global.fetch = originalFetch; }
});

test('create-lost-found-item rejects a booking belonging to another tenant', async () => {
  const token = sign({ sub: 'owner-a', user_metadata: { business_id: 'biz-a' } });
  const originalFetch = global.fetch;
  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const { handler } = await load();
    const result = await handler(event(token, { businessId: 'biz-a', booking_id: 'booking-b', item_name: 'Wallet' }));
    assert.equal(result.statusCode, 403);
    assert.equal(urls.length, 1);
    assert.match(urls[0], /\/rest\/v1\/bookings\?/);
    assert.match(urls[0], /business_id=eq\.biz-a/);
    assert.match(urls[0], /id=eq\.booking-b/);
  } finally { global.fetch = originalFetch; }
});

test('create-lost-found-item rejects a room belonging to another tenant', async () => {
  const token = sign({ sub: 'owner-a', user_metadata: { business_id: 'biz-a' } });
  const originalFetch = global.fetch;
  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const { handler } = await load();
    const result = await handler(event(token, { businessId: 'biz-a', room_id: 'room-b', item_name: 'Wallet' }));
    assert.equal(result.statusCode, 403);
    assert.equal(urls.length, 1);
    assert.match(urls[0], /\/rest\/v1\/rooms\?/);
    assert.match(urls[0], /business_id=eq\.biz-a/);
    assert.match(urls[0], /id=eq\.room-b/);
  } finally { global.fetch = originalFetch; }
});

test('create-lost-found-item ignores forged guest fields when booking is authoritative', async () => {
  const token = sign({ sub: 'owner-a', user_metadata: { business_id: 'biz-a' } });
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (url, options = {}) => {
    const value = String(url);
    requests.push({ url: value, body: options.body ? JSON.parse(options.body) : null });
    if (value.includes('/rest/v1/bookings?')) {
      return new Response(JSON.stringify([{ id: 'booking-a', business_id: 'biz-a', guest_name: 'Real Guest', guest_email: 'real@example.com', guest_phone: '+27110000000', check_in_date: '2026-09-01', check_out_date: '2026-09-03', booking_reference: 'REAL-1', room_number: '4', room_name: 'Earth' }]), { status: 200 });
    }
    if (value.includes('/rest/v1/lost_and_found_tag_sequences?')) {
      return new Response(JSON.stringify([{ year: 2026, last_seq: 7 }]), { status: 200 });
    }
    if (value.includes('/rest/v1/lost_and_found_tag_sequences')) return new Response(JSON.stringify([]), { status: 200 });
    if (value.includes('/rest/v1/lost_and_found?')) return new Response(JSON.stringify([{ id: 'lf-1' }]), { status: 200 });
    return new Response('', { status: 201 });
  };
  try {
    const { handler } = await load();
    const result = await handler(event(token, {
      businessId: 'biz-a',
      booking_id: 'booking-a',
      item_name: 'Wallet',
      guest_name: 'Attacker Guest',
      guest_email: 'attacker@example.com',
      guest_phone: '+27000000000',
      room_number: '999',
      room_name: 'Attacker Room'
    }));
    assert.equal(result.statusCode, 200);
    const insert = requests.find((r) => r.url.includes('/rest/v1/lost_and_found?') || r.url.endsWith('/rest/v1/lost_and_found'));
    assert.ok(insert);
    assert.equal(insert.body[0].guest_name, 'Real Guest');
    assert.equal(insert.body[0].guest_email, 'real@example.com');
    assert.equal(insert.body[0].guest_phone, '+27110000000');
    assert.equal(insert.body[0].room_number, '4');
    assert.equal(insert.body[0].room_name, 'Earth');
    assert.equal(insert.body[0].booking_reference, 'REAL-1');
  } finally { global.fetch = originalFetch; }
});
