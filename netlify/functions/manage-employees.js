// netlify/functions/manage-employees.js
// Canonical server-side authentication, tenant authorization, and staff privilege boundaries.
import auth from './_auth.cjs';

const { requireBusinessActor, resolveTenant, requireBusinessPermission, authFailure } = auth;

const ROLE_LEVELS = new Map([
  ['Employee (Legacy)', 0],
  ['EmployeeOverview', 0],
  ['employee', 0],
  ['front_desk', 0],
  ['housekeeper', 0],
  ['laundry_attendant', 0],
  ['marketing', 0],
  ['finance', 0],
  ['night_auditor', 0],
  ['security', 0],
  ['custom', 0],
  ['Team Leader', 1],
  ['team_leader', 1],
  ['Supervisor', 2],
  ['supervisor', 2],
  ['Foreman', 3],
  ['foreman', 3],
  ['maintenance', 0],
  ['Manager', 4],
  ['manager', 4],
  ['general_manager', 4],
  ['administration', 0],
  ['Director', 5],
  ['director', 5],
]);

const CANONICAL_ROLES = new Map([
  ['Employee (Legacy)', 'Employee (Legacy)'], ['EmployeeOverview', 'Employee (Legacy)'], ['employee', 'Employee (Legacy)'],
  ['front_desk', 'Employee (Legacy)'], ['housekeeper', 'Employee (Legacy)'], ['laundry_attendant', 'Employee (Legacy)'],
  ['marketing', 'Employee (Legacy)'], ['finance', 'Employee (Legacy)'], ['night_auditor', 'Employee (Legacy)'],
  ['security', 'Employee (Legacy)'], ['custom', 'Employee (Legacy)'],
  ['Team Leader', 'Team Leader'], ['team_leader', 'Team Leader'],
  ['Supervisor', 'Supervisor'], ['supervisor', 'Supervisor'],
  ['Foreman', 'Foreman'], ['foreman', 'Foreman'],
  ['Manager', 'Manager'], ['manager', 'Manager'], ['general_manager', 'Manager'],
  ['Director', 'Director'], ['director', 'Director'],
]);

function normalizeRole(role) {
  if (typeof role !== 'string' || !role.trim()) return 'Employee (Legacy)';
  return CANONICAL_ROLES.get(role) || null;
}

function roleLevel(role) {
  return ROLE_LEVELS.get(role) ?? null;
}

function validateStaffAuthority(principal, targetEmployeeId, targetRole, requestedRole, requestedPermissions) {
  const isEmployee = principal?.actorType === 'employee';
  const isOwner = principal?.actorType === 'business';

  if (!isEmployee && !isOwner) return { ok: false, status: 403, error: 'Forbidden' };

  if (isEmployee) {
    if (
      targetEmployeeId !== undefined &&
      targetEmployeeId !== null &&
      String(targetEmployeeId) === String(principal.employeeId)
    ) {
      return { ok: false, status: 403, error: 'Cannot change your own authority' };
    }

    const actorRole = normalizeRole(principal.staffRole || principal.role);
    const actorLevel = roleLevel(actorRole);

    if (actorLevel === null) {
      return { ok: false, status: 403, error: 'Insufficient authority' };
    }

    if (requestedRole !== undefined) {
      const canonicalRequestedRole = normalizeRole(requestedRole);
      if (!canonicalRequestedRole) {
        return { ok: false, status: 403, error: 'Unsupported staff role' };
      }

      const requestedLevel = roleLevel(canonicalRequestedRole);
      if (requestedLevel === null || requestedLevel >= actorLevel) {
        return { ok: false, status: 403, error: 'Insufficient authority to assign this role' };
      }
    }

    if (requestedPermissions !== undefined) {
      if (!Array.isArray(requestedPermissions)) {
        return { ok: false, status: 403, error: 'Invalid permission set' };
      }

      const actorPermissions = Array.isArray(principal.permissions) ? principal.permissions : [];
      if (!requestedPermissions.every((permission) => actorPermissions.includes(permission))) {
        return { ok: false, status: 403, error: 'Cannot grant permissions you do not possess' };
      }
    }

    if (targetRole !== undefined && targetRole !== null) {
      const targetCanonicalRole = normalizeRole(targetRole);
      const targetLevel = roleLevel(targetCanonicalRole);

      if (targetLevel === null || targetLevel >= actorLevel) {
        return { ok: false, status: 403, error: 'Insufficient authority over target employee' };
      }
    }
  } else if (requestedRole !== undefined) {
    const canonicalRequestedRole = normalizeRole(requestedRole);
    if (!canonicalRequestedRole) {
      return { ok: false, status: 403, error: 'Unsupported staff role' };
    }
  }

  if (requestedPermissions !== undefined) {
    if (!Array.isArray(requestedPermissions)) {
      return { ok: false, status: 403, error: 'Invalid permission set' };
    }

    if (isEmployee) {
      const actorPermissions = Array.isArray(principal.permissions) ? principal.permissions : [];
      if (!requestedPermissions.every((permission) => actorPermissions.includes(permission))) {
        return { ok: false, status: 403, error: 'Cannot grant permissions you do not possess' };
      }
    }
  }

  return { ok: true };
}

async function getTargetEmployee(supabaseUrl, supabaseKey, businessId, employeeId) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/employees?id=eq.${encodeURIComponent(employeeId)}&business_id=eq.${encodeURIComponent(businessId)}&select=id,role,staff_role`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    }
  );

  if (!response.ok) return { ok: false, status: 500, error: 'Failed to fetch target employee' };

  const data = await response.json();
  if (!Array.isArray(data) || !data[0]) {
    return { ok: false, status: 404, error: 'Employee not found' };
  }

  return { ok: true, employee: data[0] };
}

function safeDatabaseFailure(headers, operation) {
  return { statusCode: 500, headers, body: JSON.stringify({ error: `Failed to ${operation}` }) };
}

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
      if (!response.ok) return safeDatabaseFailure(headers, 'fetch employees');
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: (await response.json()) || [] }) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { full_name, phone_number, role = 'front_desk', staff_role, department, additional_departments = [], permission_set } = body;
      if (!full_name || !phone_number) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Full name and phone number are required' }) };
      const cleanPhone = phone_number.replace(/\D/g, '');
      if (cleanPhone.length < 9) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Phone number must be at least 9 digits' }) };
      const resolvedRole = staff_role || role || 'front_desk';
      const authority = validateStaffAuthority(
        authResult.principal,
        undefined,
        undefined,
        resolvedRole,
        permission_set
      );
      if (!authority.ok) return authFailure(authority, headers);
      const canonicalRole = normalizeRole(resolvedRole);
      const invitationToken = 'FCINV_' + Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiryDate = new Date(); expiryDate.setDate(expiryDate.getDate() + 7);
      const extras = Array.isArray(additional_departments) ? [...new Set(additional_departments.filter(Boolean))] : [];
      const insertData = { business_id: businessId, full_name, phone_number: cleanPhone, role: canonicalRole, staff_role: canonicalRole, department: department || null, additional_departments: extras, permission_set: permission_set === undefined ? null : permission_set, status: 'Pending', active: true, invitation_token: invitationToken, invitation_expiry: expiryDate.toISOString(), invited_at: new Date().toISOString() };
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
          if (!retry.ok) return safeDatabaseFailure(headers, 'create employee');
          const data = await retry.json(); return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: data[0] }) };
        }
        return safeDatabaseFailure(headers, 'create employee');
      }
      const data = await insertResponse.json();
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: data[0] }) };
    }

    if (event.httpMethod === 'PUT' || event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}');
      const { id, status, role, staff_role, department, additional_departments, full_name, phone_number, active, permission_set } = body;
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Employee ID required' }) };
      const requestedRole = staff_role !== undefined ? staff_role : role;

      // Reject self-authority changes and invalid requested authority before
      // performing any database lookup.
      const preliminaryAuthority = validateStaffAuthority(
        authResult.principal,
        id,
        undefined,
        requestedRole,
        permission_set
      );
      if (!preliminaryAuthority.ok) return authFailure(preliminaryAuthority, headers);

      let targetEmployee = null;
      if (authResult.principal.actorType === 'employee') {
        const target = await getTargetEmployee(supabaseUrl, supabaseKey, businessId, id);
        if (!target.ok) return authFailure(target, headers);
        targetEmployee = target.employee;

        // The target's current authority must be established server-side
        // before an employee can mutate that employee.
        const targetAuthority = validateStaffAuthority(
          authResult.principal,
          id,
          targetEmployee.staff_role || targetEmployee.role,
          undefined,
          undefined
        );
        if (!targetAuthority.ok) return authFailure(targetAuthority, headers);
      }
      const updateData = { updated_at: new Date().toISOString() };
      if (status) updateData.status = status;
      if (active !== undefined) updateData.active = !!active;
      if (status === 'Disabled') updateData.active = false;
      if (status === 'Active') updateData.active = true;
      if (requestedRole !== undefined) {
        const canonicalRole = normalizeRole(requestedRole);
        updateData.role = canonicalRole;
        updateData.staff_role = canonicalRole;
      }
      if (department !== undefined) updateData.department = department;
      if (additional_departments !== undefined) updateData.additional_departments = Array.isArray(additional_departments) ? [...new Set(additional_departments.filter(Boolean))] : [];
      if (permission_set !== undefined) updateData.permission_set = permission_set;
      if (full_name) updateData.full_name = full_name;
      if (phone_number) { const cleanPhone = phone_number.replace(/\D/g, ''); if (cleanPhone.length >= 9) updateData.phone_number = cleanPhone; }
      const response = await fetch(`${supabaseUrl}/rest/v1/employees?id=eq.${encodeURIComponent(id)}&business_id=eq.${encodeURIComponent(businessId)}`, {
        method: 'PATCH', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(updateData)
      });
      if (!response.ok) return safeDatabaseFailure(headers, 'update employee');
      const data = await response.json(); return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: data[0] }) };
    }

    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body || '{}');
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Employee ID required' }) };

      if (authResult.principal.actorType === 'employee') {
        const target = await getTargetEmployee(supabaseUrl, supabaseKey, businessId, id);
        if (!target.ok) return authFailure(target, headers);

        const authority = validateStaffAuthority(
          authResult.principal,
          id,
          target.employee.staff_role || target.employee.role,
          undefined,
          undefined
        );
        if (!authority.ok) return authFailure(authority, headers);
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/employees?id=eq.${encodeURIComponent(id)}&business_id=eq.${encodeURIComponent(businessId)}`, {
        method: 'DELETE', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
      });
      if (!response.ok) return safeDatabaseFailure(headers, 'delete employee');
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Employee deleted successfully' }) };
    }
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    console.error('manage-employees fatal:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
