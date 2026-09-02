// netlify/functions/manage-employees.js
// Canonical server-side authentication and tenant authorization.
import auth from './_auth.cjs';

const { requireBusinessActor, resolveTenant, requireBusinessPermission, authFailure } = auth;

export const handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  try {
    const authResult = requireBusinessActor(event);
    if (!authResult.ok) return authFailure(authResult, headers);
    if (!requireBusinessPermission(authResult.principal, 'canManageStaff')) {
      return authFailure({ status: 403, error: 'Missing permission: canManageStaff' }, headers);
    }

    const requestedBusinessId = event.queryStringParameters?.businessId || (() => {
      try {
        const body = JSON.parse(event.body || '{}');
        return body.businessId || body.business_id || null;
      } catch {
        return null;
      }
    })();
    const tenant = resolveTenant(authResult.principal, requestedBusinessId);
    if (!tenant.ok) return authFailure(tenant, headers);
    const businessId = tenant.businessId;

    if (event.httpMethod === 'GET') {
      const response = await fetch(`${supabaseUrl}/rest/v1/employees?business_id=eq.${encodeURIComponent(businessId)}&select=*&order=created_at.desc`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
      });
      if (!response.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch employees' }) };
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: (await response.json()) || [] }) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { full_name, phone_number, role = 'front_desk', staff_role, department, additional_departments = [], permission_set } = body;
      if (!full_name || !phone_number) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Full name and phone number are required' }) };
      const cleanPhone = phone_number.replace(/\D/g, '');
      if (cleanPhone.length < 9) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Phone number must be at least 9 digits' }) };
      const resolvedRole = staff_role || role || 'front_desk';
      const invitationToken = 'FCINV_' + Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiryDate = new Date(); expiryDate.setDate(expiryDate.getDate() + 7);
      const extras = Array.isArray(additional_departments) ? [...new Set(additional_departments.filter(Boolean))] : [];
      const insertData = { business_id: businessId, full_name, phone_number: cleanPhone, role: resolvedRole, staff_role: resolvedRole, department: department || null, additional_departments: extras, permission_set: permission_set || null, status: 'Pending', active: true, invitation_token: invitationToken, invitation_expiry: expiryDate.toISOString(), invited_at: new Date().toISOString() };
      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/employees`, {
        method: 'POST', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify([insertData])
      });
      if (!insertResponse.ok) {
        const errText = await insertResponse.text();
        if (/additional_departments/i.test(errText)) {
          delete insertData.additional_departments;
          const retry = await fetch(`${supabaseUrl}/rest/v1/employees`, {
            method: 'POST', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify([insertData])
          });
          if (!retry.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: `Failed to create employee: ${await retry.text()}` }) };
          const data = await retry.json(); return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: data[0] }) };
        }
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Failed to create employee: ${errText}` }) };
      }
      const data = await insertResponse.json();
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: data[0] }) };
    }

    if (event.httpMethod === 'PUT' || event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}');
      const { id, status, role, staff_role, department, additional_departments, full_name, phone_number, active, permission_set } = body;
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Employee ID required' }) };
      const updateData = { updated_at: new Date().toISOString() };
      if (status) updateData.status = status;
      if (active !== undefined) updateData.active = !!active;
      if (status === 'Disabled') updateData.active = false;
      if (status === 'Active') updateData.active = true;
      if (role) { updateData.role = role; updateData.staff_role = role; }
      if (staff_role) { updateData.staff_role = staff_role; updateData.role = staff_role; }
      if (department !== undefined) updateData.department = department;
      if (additional_departments !== undefined) updateData.additional_departments = Array.isArray(additional_departments) ? [...new Set(additional_departments.filter(Boolean))] : [];
      if (permission_set !== undefined) updateData.permission_set = permission_set;
      if (full_name) updateData.full_name = full_name;
      if (phone_number) { const cleanPhone = phone_number.replace(/\D/g, ''); if (cleanPhone.length >= 9) updateData.phone_number = cleanPhone; }
      const response = await fetch(`${supabaseUrl}/rest/v1/employees?id=eq.${encodeURIComponent(id)}&business_id=eq.${encodeURIComponent(businessId)}`, {
        method: 'PATCH', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(updateData)
      });
      if (!response.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update employee: ' + await response.text() }) };
      const data = await response.json(); return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: data[0] }) };
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Employee ID required' }) };
      const response = await fetch(`${supabaseUrl}/rest/v1/employees?id=eq.${encodeURIComponent(id)}&business_id=eq.${encodeURIComponent(businessId)}`, {
        method: 'DELETE', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
      });
      if (!response.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to delete employee' }) };
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Employee deleted successfully' }) };
    }
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    console.error('manage-employees fatal:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Internal server error' }) };
  }
};
