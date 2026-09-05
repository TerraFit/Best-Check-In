const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.SUPABASE_JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'service-key';
process.env.SUPER_ADMIN_JWT_ISSUER = 'fastcheckin';
process.env.SUPER_ADMIN_JWT_AUDIENCE = 'super-admin';

let handler;
let calls;

const TASK = {
  id: 'task-1',
  business_id: 'biz-1',
  room_id: 'room-1',
  assigned_staff_id: 'emp-1',
  assigned_staff_name: 'Alice',
  task_type: 'refresh',
  is_checkout: false,
  status: 'pending',
  inspection_status: 'pending',
  booking_id: 'booking-1',
  guest_name: 'Guest',
};

function token({ role = 'authenticated', sub = 'user-1', businessId = 'biz-1', employeeId, staffRole, permissions, platformRole, issuer, audience, meta = {} } = {}) {
  const user_metadata = {
    business_id: businessId,
    ...(employeeId ? { employee_id: employeeId } : {}),
    ...(staffRole ? { staff_role: staffRole } : {}),
    ...(permissions ? { permission_set: permissions } : {}),
    ...meta,
  };
  return jwt.sign({ sub, role, platform_role: platformRole, user_metadata, iss: issuer, aud: audience }, process.env.SUPABASE_JWT_SECRET, { expiresIn: '1h' });
}

function event(body, authorization, method = 'POST') {
  return { httpMethod: method, headers: authorization ? { Authorization: `Bearer ${authorization}` } : {}, body: typeof body === 'string' ? body : JSON.stringify(body) };
}

function response(status, data = {}) {
  return { ok: status >= 200 && status < 300, status, async json() { return data; }, async text() { return typeof data === 'string' ? data : JSON.stringify(data); } };
}

before(async () => {
  ({ handler } = await import('../update-housekeeping-task.js?test=update-housekeeping-task-authz'));
});

beforeEach(() => {
  calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/housekeeping_tasks?id=eq.task-1') && !options.method) return response(200, [TASK]);
    if (String(url).includes('/housekeeping_tasks?id=eq.task-1') && options.method === 'PATCH') return response(200, [{ ...TASK, ...(JSON.parse(options.body || '{}')) }]);
    if (String(url).includes('/employees')) return response(200, [{ id: 'emp-2', business_id: 'biz-1', status: 'Active' }]);
    if (String(url).includes('/rooms?')) return response(204, []);
    if (String(url).includes('/room_events')) return response(201, []);
    return response(404, []);
  };
});

after(() => { delete global.fetch; });

const ownEmployee = () => token({ sub: 'user-1', employeeId: 'emp-1', staffRole: 'housekeeper' });
const otherEmployee = () => token({ sub: 'user-2', employeeId: 'emp-2', staffRole: 'housekeeper' });
const manager = () => token({ sub: 'manager-1', employeeId: 'emp-m', staffRole: 'Manager' });
const owner = () => token({ sub: 'owner-1' });
const platform = () => token({ sub: 'platform-1', businessId: undefined, platformRole: 'platform_operations' });
const superAdmin = () => token({ sub: 'admin-1', role: 'super_admin', businessId: undefined, issuer: 'fastcheckin', audience: 'super-admin' });
const serviceRole = () => token({ sub: 'service-1', role: 'service_role' });
const spoofedSuperAdmin = () => token({ sub: 'attacker-1', meta: { super_admin: true } });

