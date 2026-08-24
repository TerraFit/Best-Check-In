const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { phoneDigitVariants } = require('./_housekeepingServiceAuth.cjs');
exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  try {
    let body; try { body = JSON.parse(event.body); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON in request body' }) }; }
    const phone = body.phone_number || body.phone, password = body.password;
    const requestedBusinessId = body.business_id || body.businessId || null;
    if (!phone) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Phone number is required' }) };
    if (!password) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password is required' }) };
    const uniqueVariants = phoneDigitVariants(phone);
    if (!uniqueVariants.length) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid phone number or password' }) };
    const supabaseUrl = process.env.SUPABASE_URL, supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    const orClause = uniqueVariants.map((v) => `phone_number.eq.${encodeURIComponent(v)}`).join(',');
    // The production employees table does not have the optional `active` column.
    // Account activity is already represented by the canonical `status` field.
    let path = `employees?select=id,business_id,full_name,phone_number,password_hash,status,staff_role,role,department,permission_set&or=(${orClause})`;
    if (requestedBusinessId) path += `&business_id=eq.${encodeURIComponent(requestedBusinessId)}`;
    const lookupResponse = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' } });
    if (!lookupResponse.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Database error' }) };
    let candidates = await lookupResponse.json(); if (!Array.isArray(candidates)) candidates = [];
    const matched = candidates.filter((emp) => uniqueVariants.includes(String(emp.phone_number || '').replace(/\D/g, '')));
    if (matched.length === 0) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid phone number or password' }) };
    if (matched.length > 1) {
      const businessIds = new Set(matched.map((e) => String(e.business_id)));
      if (businessIds.size > 1 && !requestedBusinessId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid phone number or password', code: 'AMBIGUOUS_PHONE' }) };
    }
    const employee = matched[0];
    const isActive = employee.status !== 'Disabled';
    if (!isActive) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Account has been disabled. Please contact your administrator.', code: 'EMPLOYEE_DISABLED' }) };
    if (employee.status === 'Pending') return { statusCode: 403, headers, body: JSON.stringify({ error: 'Account not yet activated. Please use the invitation link sent to you.' }) };
    if (!employee.password_hash) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Account not properly set up. Please contact your administrator.' }) };
    if (!(await bcrypt.compare(password, employee.password_hash))) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid phone number or password' }) };
    const nowIso = new Date().toISOString();
    try { await fetch(`${supabaseUrl}/rest/v1/employees?id=eq.${encodeURIComponent(employee.id)}`, { method: 'PATCH', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ last_login: nowIso, updated_at: nowIso }) }); } catch (e) {}
    const staffRole = employee.staff_role || employee.role || 'Employee (Legacy)';
    let permissionSet = employee.permission_set || null;
    if (typeof permissionSet === 'string') { try { permissionSet = JSON.parse(permissionSet); } catch { permissionSet = null; } }
    const token = jwt.sign({ sub: employee.id, role: 'employee', user_metadata: { employee_id: employee.id, business_id: employee.business_id, full_name: employee.full_name, phone_number: employee.phone_number, role: staffRole, staff_role: staffRole, department: employee.department || null, permission_set: permissionSet, active: isActive } }, process.env.SUPABASE_JWT_SECRET, { expiresIn: '7d' });
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, token, token_expiry: '7d', employee: { id: employee.id, full_name: employee.full_name, phone_number: employee.phone_number, role: staffRole, staff_role: staffRole, department: employee.department || null, permission_set: permissionSet, business_id: employee.business_id, status: employee.status, active: isActive, last_login: nowIso } }) };
  } catch (error) {
    console.error('Employee login error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Login failed', details: error.message }) };
  }
};
