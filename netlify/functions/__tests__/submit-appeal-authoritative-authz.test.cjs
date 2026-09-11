const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret-for-submit-appeal-auth';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.RESEND_API_KEY = '';

const SECRET = process.env.SUPABASE_JWT_SECRET;

function sign(payload, options = {}) {
  return jwt.sign(payload, SECRET, { expiresIn: '15m', ...options });
}

function event(token, body = {}, method = 'POST') {
  return {
    httpMethod: method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

function businessToken(businessId = 'biz-a') {
  return sign({ sub: `owner-${businessId}`, user_metadata: { business_id: businessId, email: `${businessId}@example.com` } });
}

function employeeToken(businessId = 'biz-a', permissions = ['canManageSettings']) {
  return sign({
    sub: `emp-${businessId}`,
    user_metadata: {
      business_id: businessId,
      employee_id: `emp-${businessId}`,
      staff_role: 'Manager',
      permission_set: permissions,
      email: `${businessId}@example.com`,
    },
  });
}

function platformToken(role = 'platform_operations') {
  return sign({ sub: 'platform-1', platform_role: role });
}

function serviceRoleToken() {
  return sign({ sub: 'service-role', role: 'service_role' });
}

function superAdminToken() {
  return sign({ sub: 'admin-1', role: 'super_admin' }, { issuer: 'fastcheckin', audience: 'super-admin' });
}

const baseBody = {
  originalRequestId: 'request-1',
  businessId: 'biz-a',
  businessName: 'ATTACKER NAME',
  businessEmail: 'attacker@example.com',
  businessIdDisplay: 'ATTACKER-ID',
  fieldName: 'Trading Name',
  currentValue: 'ATTACKER CURRENT',
  requestedValue: 'New Trading Name',
  originalReason: 'Legal update',
  rejectionReason: 'Rejected by admin',
  appealMessage: 'Please reconsider this request.',
  attachments: [],
};

async function loadFunction() {
  return import(`../submit-appeal.js?test=${Date.now()}-${Math.random()}`);
}

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return typeof body === 'string' ? JSON.parse(body) : body; },
    async text() { return typeof body === 'string' ? body : JSON.stringify(body); },
  };
}

function mockAppealFlow(calls = [], options = {}) {
  return async (url, requestOptions = {}) => {
    calls.push({ url, options: requestOptions });
    if (url.includes('/rest/v1/change_requests?')) {
      if (options.changeRequestStatus === 'approved') {
        return response(200, [{
          id: 'request-1', business_id: 'biz-a', status: 'approved',
          field_name: 'Trading Name', current_value: 'Old Trading Name',
          requested_value: 'New Trading Name', reason: 'Legal update',
          rejection_reason: 'Rejected by admin', business_name: 'Old Trading Name', business_email: 'biz-a@example.com'
        }]);
      }
      if (options.changeRequestTenant === 'biz-b') {
        return response(200, [{ id: 'request-1', business_id: 'biz-b', status: 'rejected', field_name: 'Trading Name', current_value: 'B', requested_value: 'C' }]);
      }
      return response(200, [{
        id: 'request-1', business_id: 'biz-a', status: 'rejected',
        field_name: 'Trading Name', current_value: 'Old Trading Name',
        requested_value: 'New Trading Name', reason: 'Legal update',
        rejection_reason: 'Rejected by admin', business_name: 'Old Trading Name', business_email: 'biz-a@example.com'
      }]);
    }
    if (url.includes('/rest/v1/businesses?')) {
      return response(200, [{ id: 'biz-a', trading_name: 'Old Trading Name', email: 'biz-a@example.com' }]);
    }
    if (url.includes('/rest/v1/appeals')) {
      if (options.appealInsertFailure) return response(500, 'SECRET appeal insert details');
      return response(201, [{ id: 'appeal-1', status: 'pending' }]);
    }
    return response(200, []);
  };
}

test('appeal: anonymous request is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(null, baseBody));
  assert.equal(result.statusCode, 401);
});

test('appeal: invalid JWT is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event('not-a-jwt', baseBody));
  assert.equal(result.statusCode, 401);
});

test('appeal: expired JWT is rejected', async () => {
  const { handler } = await loadFunction();
  const token = sign({ sub: 'expired', user_metadata: { business_id: 'biz-a' } }, { expiresIn: -1 });
  const result = await handler(event(token, baseBody));
  assert.equal(result.statusCode, 401);
});

test('appeal: employee without settings permission is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(employeeToken('biz-a', ['canViewRooms']), baseBody));
  assert.equal(result.statusCode, 403);
});

test('appeal: employee cannot substitute another tenant', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(employeeToken('biz-a'), { ...baseBody, businessId: 'biz-b' }));
  assert.equal(result.statusCode, 403);
});

test('appeal: platform actor is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(platformToken(), baseBody));
  assert.equal(result.statusCode, 403);
});

test('appeal: service-role token is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(serviceRoleToken(), baseBody));
  assert.equal(result.statusCode, 403);
});

test('appeal: SuperAdmin is rejected from business endpoint', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(superAdminToken(), baseBody));
  assert.equal(result.statusCode, 403);
});

test('appeal: metadata-only SuperAdmin spoof is rejected', async () => {
  const { handler } = await loadFunction();
  const token = sign({
    sub: 'spoof',
    role: 'authenticated',
    user_metadata: {
      business_id: 'biz-a', employee_id: 'emp-a', staff_role: 'Manager',
      role: 'super_admin', permission_set: ['canManageSettings'],
    },
  });
  const result = await handler(event(token, baseBody));
  assert.equal(result.statusCode, 403);
});

test('appeal: business owner is allowed and server derives authoritative request/business data', async () => {
  const { handler } = await loadFunction();
  const calls = [];
  global.fetch = mockAppealFlow(calls);
  const result = await handler(event(businessToken(), baseBody));
  assert.equal(result.statusCode, 200);
  const inserted = calls.find(call => call.url.includes('/rest/v1/appeals'));
  const payload = JSON.parse(inserted.options.body)[0];
  assert.equal(payload.business_id, 'biz-a');
  assert.equal(payload.business_name, 'Old Trading Name');
  assert.equal(payload.business_email, 'biz-a@example.com');
  assert.equal(payload.current_value, 'Old Trading Name');
  assert.equal(payload.requested_value, 'New Trading Name');
  assert.equal(payload.field_name, 'Trading Name');
  assert.equal(payload.status, 'pending');
});

test('appeal: employee is tenant-bound and cannot override authoritative request fields', async () => {
  const { handler } = await loadFunction();
  const calls = [];
  global.fetch = mockAppealFlow(calls);
  const result = await handler(event(employeeToken(), { ...baseBody, businessName: 'ATTACKER', currentValue: 'ATTACKER', requestedValue: 'ATTACKER REQUEST' }));
  assert.equal(result.statusCode, 200);
  const inserted = calls.find(call => call.url.includes('/rest/v1/appeals'));
  const payload = JSON.parse(inserted.options.body)[0];
  assert.equal(payload.business_id, 'biz-a');
  assert.equal(payload.business_name, 'Old Trading Name');
  assert.equal(payload.current_value, 'Old Trading Name');
  assert.equal(payload.requested_value, 'New Trading Name');
});

test('appeal: missing original request is rejected', async () => {
  const { handler } = await loadFunction();
  global.fetch = mockAppealFlow();
  const result = await handler(event(businessToken(), { ...baseBody, originalRequestId: undefined }));
  assert.equal(result.statusCode, 400);
});

test('appeal: missing appeal message is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(businessToken(), { ...baseBody, appealMessage: '' }));
  assert.equal(result.statusCode, 400);
});

test('appeal: original request must belong to authenticated tenant', async () => {
  const { handler } = await loadFunction();
  global.fetch = mockAppealFlow([], { changeRequestTenant: 'biz-b' });
  const result = await handler(event(businessToken('biz-a'), baseBody));
  assert.equal(result.statusCode, 403);
});

test('appeal: only rejected request can be appealed', async () => {
  const { handler } = await loadFunction();
  global.fetch = mockAppealFlow([], { changeRequestStatus: 'approved' });
  const result = await handler(event(businessToken(), baseBody));
  assert.equal(result.statusCode, 400);
});

test('appeal: malformed JSON is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(businessToken(), '{bad json'));
  assert.equal(result.statusCode, 400);
});

test('appeal: appeal insert failure is sanitized', async () => {
  const { handler } = await loadFunction();
  global.fetch = mockAppealFlow([], { appealInsertFailure: true });
  const result = await handler(event(businessToken(), baseBody));
  assert.equal(result.statusCode, 500);
  assert.doesNotMatch(result.body, /SECRET appeal insert details/);
});

test('appeal: wrong HTTP method is rejected', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(businessToken(), baseBody, 'GET'));
  assert.equal(result.statusCode, 405);
});

test('appeal: OPTIONS remains public preflight', async () => {
  const { handler } = await loadFunction();
  const result = await handler(event(null, {}, 'OPTIONS'));
  assert.equal(result.statusCode, 204);
});
