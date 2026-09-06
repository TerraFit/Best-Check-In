const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

const SECRET = process.env.SUPABASE_JWT_SECRET;
function sign(payload) { return jwt.sign(payload, SECRET, { expiresIn: '15m' }); }
function event(token, body = '{}') {
  return {
    httpMethod: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body
  };
}
async function load(name) { return import(`../${name}?test=${Date.now()}-${Math.random()}`); }

test('create-conversation rejects anonymous requests before database access', async () => {
  const { handler } = await load('create-conversation.js');
  const result = await handler(event(null, JSON.stringify({ businessId: 'biz-b', subject: 'x' })));
  assert.equal(result.statusCode, 401);
});

test('request-archived-data rejects anonymous requests before exporting tenant data', async () => {
  const { handler } = await load('request-archived-data.js');
  const result = await handler(event(null, JSON.stringify({ businessId: 'biz-b', email: 'attacker@example.com' })));
  assert.equal(result.statusCode, 401);
});

test('marketing export v2 rejects anonymous requests through the hardened implementation', async () => {
  const { handler } = await load('export-marketing-contacts-v2.js');
  const result = await handler(event(null, JSON.stringify({ businessId: 'biz-b' })));
  assert.equal(result.statusCode, 401);
});

test('send-whatsapp rejects anonymous requests before messaging provider access', async () => {
  const { handler } = await load('send-whatsapp.ts');
  const result = await handler(event(null, JSON.stringify({ bookingId: 'booking-b', businessId: 'biz-b', phone: '+27821234567' })));
  assert.equal(result.statusCode, 401);
});

test('create-conversation rejects an authenticated user attempting another tenant', async () => {
  const token = sign({ sub: 'owner-a', user_metadata: { business_id: 'biz-a' } });
  const { handler } = await load('create-conversation.js');
  const result = await handler(event(token, JSON.stringify({ businessId: 'biz-b', subject: 'cross tenant' })));
  assert.equal(result.statusCode, 403);
});
