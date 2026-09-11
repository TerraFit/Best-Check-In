const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '../..', '..');
const FILE = path.join(ROOT, 'netlify/functions/upload-housekeeping-issue-photo.js');
const SOURCE = fs.readFileSync(FILE, 'utf8');

const ORIGINAL_ENV = { ...process.env };

function loadHandler({ gate = { ok: true, principal: { business_id: 'biz-a' } }, scope = { ok: true, businessId: 'biz-a' }, fetchImpl } = {}) {
  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    require: (request) => {
      if (request === './_housekeepingServiceAuth.cjs') {
        return {
          authenticateHousekeepingServiceLive: async () => gate,
          resolveBusinessId: (_principal, businessId) => ({ ...scope, requestedBusinessId: businessId }),
        };
      }
      return require(request);
    },
    console,
    process,
    Buffer,
    fetch: fetchImpl || (async () => ({ ok: true })),
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(SOURCE, sandbox, { filename: FILE });
  return module.exports.handler;
}

function imageEvent(businessId = 'biz-a') {
  return {
    httpMethod: 'POST',
    body: JSON.stringify({ businessId, image: 'data:image/png;base64,aGVsbG8=' }),
  };
}

function parseBody(response) {
  return JSON.parse(response.body);
}

test.afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

test('authenticated tenant can upload and storage path uses the authoritative tenant', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'service-key';
  const requests = [];
  const handler = loadHandler({
    gate: { ok: true, principal: { business_id: 'biz-a' } },
    scope: { ok: true, businessId: 'biz-a' },
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return { ok: true };
    },
  });

  const response = await handler(imageEvent('biz-a'));
  assert.equal(response.statusCode, 200);
  assert.equal(parseBody(response).success, true);
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /^https:\/\/example\.supabase\.co\/storage\/v1\/object\/housekeeping-issue-photos\/biz-a\/\d{4}\/\d{2}\/[0-9a-f-]+\.png$/);
  assert.match(parseBody(response).url, /\/housekeeping-issue-photos\/biz-a\/\d{4}\/\d{2}\/[0-9a-f-]+\.png$/);
});

test('cross-tenant businessId substitution is rejected before storage access', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'service-key';
  let fetchCalled = false;
  const handler = loadHandler({
    gate: { ok: true, principal: { business_id: 'biz-a' } },
    scope: { ok: false, status: 403, error: 'Business scope mismatch' },
    fetchImpl: async () => { fetchCalled = true; return { ok: true }; },
  });

  const response = await handler(imageEvent('biz-b'));
  assert.equal(response.statusCode, 403);
  assert.equal(parseBody(response).error, 'Business scope mismatch');
  assert.equal(fetchCalled, false);
});

test('storage failure exposes only a generic error and never the upstream response body', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'service-key';
  const handler = loadHandler({
    fetchImpl: async () => ({ ok: false, text: async () => 'secret storage bucket policy, internal host and request details' }),
  });

  const response = await handler(imageEvent());
  const body = parseBody(response);
  assert.equal(response.statusCode, 500);
  assert.equal(body.error, 'Failed to upload issue photo');
  assert.equal('details' in body, false);
  assert.doesNotMatch(response.body, /secret storage bucket policy|internal host|request details/);
});

test('unexpected storage exceptions expose only a generic error', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'service-key';
  const handler = loadHandler({
    fetchImpl: async () => { throw new Error('internal storage hostname, token and SQL details'); },
  });

  const response = await handler(imageEvent());
  const body = parseBody(response);
  assert.equal(response.statusCode, 500);
  assert.equal(body.error, 'Failed to upload issue photo');
  assert.doesNotMatch(response.body, /internal storage hostname|token and SQL details/);
});

test('unexpected request parsing exceptions expose only a generic error', async () => {
  const handler = loadHandler();
  const response = await handler({ httpMethod: 'POST', body: '{not valid json' });
  const body = parseBody(response);
  assert.equal(response.statusCode, 500);
  assert.equal(body.error, 'Failed to upload issue photo');
  assert.doesNotMatch(response.body, /Unexpected token|JSON/);
});
