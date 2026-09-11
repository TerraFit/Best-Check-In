const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) };
}

function buildHash(data, privateKey) {
  const values = [
    data.SiteCode, data.TransactionId, data.TransactionReference, data.Amount, data.Status,
    data.Optional1, data.Optional2, data.Optional3, data.Optional4, data.Optional5,
    data.CurrencyCode, data.IsTest, data.StatusMessage,
  ].map((value) => value == null ? '' : String(value));
  return crypto.createHash('sha512').update(`${values.join('')}${privateKey}`.toLowerCase()).digest('hex');
}

test('Ozow notification rejects forged callbacks before database access', async () => {
  process.env.OZOW_SITE_CODE = 'SITE';
  process.env.OZOW_PRIVATE_KEY = 'private';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'service-key';
  const originalFetch = global.fetch;
  let called = false;
  global.fetch = async () => { called = true; return response([]); };

  try {
    const { handler } = await import('../ozow-payment-notify.js?forged');
    const result = await handler({ httpMethod: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ SiteCode: 'SITE', TransactionId: 'oz-1', TransactionReference: 'OZ-1', Amount: '349.00', Status: 'Complete', CurrencyCode: 'ZAR', IsTest: 'false', Hash: 'forged' }).toString() });
    assert.equal(result.statusCode, 400);
    assert.equal(called, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test('Ozow notification validates hash and transaction amount before completing payment', async () => {
  process.env.OZOW_SITE_CODE = 'SITE';
  process.env.OZOW_PRIVATE_KEY = 'private';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'service-key';
  const originalFetch = global.fetch;
  const calls = [];
  const notification = { SiteCode: 'SITE', TransactionId: 'oz-provider-1', TransactionReference: 'OZ-1', Amount: '349.00', Status: 'Complete', Optional1: '', Optional2: '', Optional3: '', Optional4: '', Optional5: '', CurrencyCode: 'ZAR', IsTest: 'false', StatusMessage: 'Complete' };
  notification.Hash = buildHash(notification, 'private');

  global.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (String(url).includes('transactions?')) return response([{ id: 'OZ-1', business_id: 'biz-1', plan_id: 'starter', billing_cycle: 'monthly', amount: 349, status: 'pending' }]);
    return response({});
  };

  try {
    const { handler } = await import('../ozow-payment-notify.js?valid');
    const result = await handler({ httpMethod: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(notification) });
    assert.equal(result.statusCode, 200);
    assert.equal(calls.length, 3);
    assert.match(calls[1].url, /transactions\?id=eq\.OZ-1/);
    assert.match(calls[2].url, /businesses\?id=eq\.biz-1/);
  } finally {
    global.fetch = originalFetch;
  }
});
