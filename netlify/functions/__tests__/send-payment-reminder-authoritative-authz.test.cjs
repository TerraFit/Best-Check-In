const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-authoritative-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

function sign(payload) { return jwt.sign(payload, process.env.SUPABASE_JWT_SECRET, { expiresIn: '15m' }); }
function event(token, body = '{}') {
  return { httpMethod: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body };
}
async function load() { return import(`../send-payment-reminder.js?test=${Date.now()}-${Math.random()}`); }

test('send-payment-reminder rejects anonymous callers before database access', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls += 1; throw new Error('DB must not be reached'); };
  try {
    const { handler } = await load();
    const result = await handler(event(null, JSON.stringify({ businessId: 'biz-a', daysOverdue: 5 })));
    assert.equal(result.statusCode, 401);
    assert.equal(calls, 0);
  } finally { global.fetch = originalFetch; }
});

test('send-payment-reminder rejects authenticated business actors', async () => {
  const token = sign({ sub: 'owner-a', user_metadata: { business_id: 'biz-a' } });
  const { handler } = await load();
  const result = await handler(event(token, JSON.stringify({ businessId: 'biz-a', daysOverdue: 5 })));
  assert.equal(result.statusCode, 403);
});

test('send-payment-reminder rejects platform actors without billing permission', async () => {
  const token = sign({ sub: 'platform-a', platform_role: 'platform_support' });
  const { handler } = await load();
  const result = await handler(event(token, JSON.stringify({ businessId: 'biz-a', daysOverdue: 5 })));
  assert.equal(result.statusCode, 403);
});

test('send-payment-reminder rejects invalid overdue values', async () => {
  const token = sign({ sub: 'finance-a', platform_role: 'platform_finance' });
  const { handler } = await load();
  const result = await handler(event(token, JSON.stringify({ businessId: 'biz-a', daysOverdue: 99999 })));
  assert.equal(result.statusCode, 400);
});
