const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

function sign(payload) { return jwt.sign(payload, process.env.SUPABASE_JWT_SECRET, { expiresIn: '15m' }); }
function event(token, body) { return { httpMethod: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body) }; }
async function load() { return import(`../send-qr-email.js?test=${Date.now()}-${Math.random()}`); }

test('send-qr-email rejects anonymous callers before database access', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls += 1; throw new Error('DB must not be reached'); };
  try {
    const { handler } = await load();
    const result = await handler(event(null, { businessId: 'biz-a', qrCodeUrl: 'data:image/png;base64,abc', checkInUrl: 'https://example.com' }));
    assert.equal(result.statusCode, 401);
    assert.equal(calls, 0);
  } finally { global.fetch = originalFetch; }
});

test('send-qr-email rejects an authenticated user attempting another tenant', async () => {
  const token = sign({ sub: 'owner-a', user_metadata: { business_id: 'biz-a' } });
  const { handler } = await load();
  const result = await handler(event(token, { businessId: 'biz-b', qrCodeUrl: 'data:image/png;base64,abc', checkInUrl: 'https://example.com' }));
  assert.equal(result.statusCode, 403);
});

test('send-qr-email rejects malformed QR payload before database access', async () => {
  const token = sign({ sub: 'owner-a', user_metadata: { business_id: 'biz-a' } });
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls += 1; throw new Error('DB must not be reached'); };
  try {
    const { handler } = await load();
    const result = await handler(event(token, { businessId: 'biz-a', qrCodeUrl: 'https://attacker.example/qr.png', checkInUrl: 'https://example.com' }));
    assert.equal(result.statusCode, 400);
    assert.equal(calls, 0);
  } finally { global.fetch = originalFetch; }
});
