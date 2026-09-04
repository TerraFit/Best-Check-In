const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const auth = require('../_auth.cjs');
const rbac = require('../_rbac.js');

const SECRET = 'canonical-auth-boundary-test-secret';
function event(token) { return { headers: { authorization: `Bearer ${token}` } }; }
function sign(payload) { return jwt.sign(payload, SECRET, { expiresIn: '1h' }); }
function withSecret(fn) {
  return () => {
    const previous = process.env.SUPABASE_JWT_SECRET;
    process.env.SUPABASE_JWT_SECRET = SECRET;
    try { return fn(); } finally {
      if (previous === undefined) delete process.env.SUPABASE_JWT_SECRET;
      else process.env.SUPABASE_JWT_SECRET = previous;
    }
  };
}

describe('Canonical authorization boundaries', () => {
  it('rejects service-role tokens', withSecret(() => {
    const token = sign({ sub: 'service', role: 'service_role', user_metadata: { business_id: 'biz-a' } });
    const result = auth.authenticateRequest(event(token));
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
  }));

  it('rejects mutable metadata SuperAdmin spoofing', withSecret(() => {
    const token = sign({ sub: 'attacker', role: 'authenticated', user_metadata: { super_admin: true } });
    const result = auth.authenticateRequest(event(token));
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
  }));

  it('rejects mutable metadata super_admin role spoofing', withSecret(() => {
    const token = sign({ sub: 'attacker', role: 'authenticated', user_metadata: { role: 'super_admin', business_id: 'biz-a' } });
    const result = auth.authenticateRequest(event(token));
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
  }));

  it('legacy RBAC assertPermission uses canonical principal', withSecret(() => {
    const token = sign({ sub: 'employee-a', role: 'employee', user_metadata: { employee_id: 'employee-a', business_id: 'biz-a', staff_role: 'housekeeper', permission_set: [] } });
    const result = rbac.assertPermission(event(token), 'canViewHousekeeping');
    assert.equal(result.ok, true);
    assert.equal(result.principal.employeeId, 'employee-a');
    assert.equal(result.principal.businessId, 'biz-a');
  }));

  it('legacy RBAC cannot elevate a metadata SuperAdmin spoof', withSecret(() => {
    const token = sign({ sub: 'attacker', role: 'authenticated', user_metadata: { super_admin: true, business_id: 'biz-a' } });
    const result = rbac.assertPermission(event(token), 'canViewHousekeeping');
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
  }));

  it('legacy REST auth no longer performs an independent JWT verification', () => {
    const source = fs.readFileSync(path.join(__dirname, '../lib/supabase-rest.js'), 'utf8');
    assert.ok(source.includes("import auth from '../_auth.cjs';"));
    assert.ok(source.includes('auth.verifyToken(token)'));
    assert.equal(source.includes("require('jsonwebtoken')"), false);
  });
});
