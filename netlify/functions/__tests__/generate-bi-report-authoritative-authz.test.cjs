const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const jwt = require('jsonwebtoken');

const SECRET = process.env.SUPABASE_JWT_SECRET || 'test-secret';
process.env.SUPABASE_JWT_SECRET = SECRET;

const originalRequire = Module.prototype.require;
const originalImport = global.import;

function token(payload, options = {}) {
  return jwt.sign(payload, SECRET, { algorithm: 'HS256', expiresIn: '1h', ...options });
}

function event({ method = 'GET', authorization, query = {} } = {}) {
  return {
    httpMethod: method,
    headers: authorization ? { authorization } : {},
    queryStringParameters: query,
    body: null,
  };
}

function loadHandler({ principal, allowed = true, business = { id: 'biz-a', status: 'approved' }, internalError = null } = {}) {
  delete require.cache[require.resolve('../generate-bi-report.js')];

  const auth = {
    requireBusinessActor: () => principal ? { ok: true, principal } : { ok: false, status: 401, error: 'Authentication required' },
    requireBusinessPermission: (p, permission) => Boolean(p && (p.permissions || []).includes(permission)),
    resolveTenant: (p, requested) => {
      if (p.actorType === 'business' || p.actorType === 'employee') {
        if (requested && requested !== p.businessId) return { ok: false, status: 403, error: 'Forbidden' };
        return { ok: true, businessId: p.businessId };
      }
      return { ok: false, status: 403, error: 'Forbidden' };
    },
    authFailure: (failure, headers) => ({ statusCode: failure.status || failure.statusCode || 403, headers: headers || { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: failure.error || 'Forbidden' }) }),
  };

  Module.prototype.require = function (request) {
    if (request === './_auth.cjs') return auth;
    return originalRequire.apply(this, arguments);
  };

  const handlerModule = require('../generate-bi-report.js');
  Module.prototype.require = originalRequire;
  return handlerModule.handler;
}

async function invoke(options) {
  const handler = loadHandler(options);
  return handler(event(options.event || {}));
}

for (const [name, fn] of [
  ['anonymous request is rejected', async () => {
    const response = await invoke({ event: {} });
    assert.equal(response.statusCode, 401);
  }],
  ['invalid JWT is rejected', async () => {
    const response = await invoke({ event: { authorization: 'Bearer invalid' } });
    assert.equal(response.statusCode, 401);
  }],
  ['expired JWT is rejected', async () => {
    const response = await invoke({ event: { authorization: `Bearer ${token({ role: 'authenticated', sub: 'biz-a' }, { expiresIn: -1 })}` } });
    assert.equal(response.statusCode, 401);
  }],
  ['employee without export permission is rejected', async () => {
    const response = await invoke({ principal: { actorType: 'employee', businessId: 'biz-a', permissions: [] }, event: { authorization: 'Bearer ignored' } });
    assert.equal(response.statusCode, 403);
  }],
  ['employee cannot substitute another tenant', async () => {
    const response = await invoke({ principal: { actorType: 'employee', businessId: 'biz-a', permissions: ['canExportReports'] }, event: { authorization: 'Bearer ignored', query: { businessId: 'biz-b' } } });
    assert.equal(response.statusCode, 403);
  }],
  ['platform actor is rejected', async () => {
    const response = await invoke({ principal: { actorType: 'platform', businessId: 'biz-a', permissions: ['canExportReports'] }, event: { authorization: 'Bearer ignored' } });
    assert.equal(response.statusCode, 403);
  }],
  ['service-role JWT is rejected', async () => {
    const response = await invoke({ event: { authorization: `Bearer ${token({ role: 'service_role', sub: 'service' })}` } });
    assert.equal(response.statusCode, 401);
  }],
  ['super admin is rejected', async () => {
    const response = await invoke({ principal: { actorType: 'super_admin', businessId: 'biz-a', permissions: ['canExportReports'] }, event: { authorization: 'Bearer ignored' } });
    assert.equal(response.statusCode, 403);
  }],
  ['metadata-only super_admin spoof is rejected', async () => {
    const response = await invoke({ event: { authorization: `Bearer ${token({ role: 'authenticated', sub: 'biz-a', user_metadata: { role: 'super_admin', business_id: 'biz-a' } })}` } });
    assert.equal(response.statusCode, 401);
  }],
  ['business owner is allowed without employee permission metadata', async () => {
    const response = await invoke({ principal: { actorType: 'business', businessId: 'biz-a', permissions: ['canExportReports'] }, event: { authorization: 'Bearer ignored' } });
    assert.notEqual(response.statusCode, 401);
    assert.notEqual(response.statusCode, 403);
  }],
  ['authorized employee is tenant-bound', async () => {
    const response = await invoke({ principal: { actorType: 'employee', businessId: 'biz-a', permissions: ['canExportReports'] }, event: { authorization: 'Bearer ignored', query: { businessId: 'biz-a' } } });
    assert.notEqual(response.statusCode, 403);
  }],
  ['wrong HTTP method is rejected', async () => {
    const response = await invoke({ event: { method: 'POST', authorization: 'Bearer ignored' } });
    assert.equal(response.statusCode, 405);
  }],
  ['OPTIONS remains public preflight', async () => {
    const response = await invoke({ event: { method: 'OPTIONS' } });
    assert.equal(response.statusCode, 204);
  }],
]) {
  test(`BI report: ${name}`, fn);
}

process.on('exit', () => {
  Module.prototype.require = originalRequire;
  global.import = originalImport;
});
