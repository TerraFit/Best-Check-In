// netlify/functions/preview-employee-portal.js
// Business Owner only: create a temporary employee JWT to preview the Employee Portal.
// Does NOT change employee-login, JWT contracts for real logins, or password flows.

const jwt = require('jsonwebtoken');

function isBusinessOwnerToken(decoded) {
  if (!decoded) return false;
  const meta = decoded.user_metadata || {};
  if (decoded.role === 'service_role' || meta.super_admin) return false;
  // Real business owner tokens: business_id present, no employee_id
  if (meta.business_id && !meta.employee_id) return true;
  if (meta.role === 'business' || meta.role === 'business_owner') return true;
  return false;
}

exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No authorization token provided' }),
      };
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    } catch (verifyErr) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token: ' + verifyErr.message }),
      };
    }

    if (!isBusinessOwnerToken(decoded)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Preview is only available to authenticated business owners',
        }),
      };
    }

    const businessId = decoded.user_metadata?.business_id || decoded.sub;
    if (!businessId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Token missing business ID' }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }

    // First Active employee for this business, ordered by creation date (oldest first)
    const listUrl =
      `${supabaseUrl}/rest/v1/employees` +
      `?business_id=eq.${encodeURIComponent(businessId)}` +
      `&select=*` +
      `&order=created_at.asc`;

    const listRes = await fetch(listUrl, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to load employees: ' + errText }),
      };
    }

    const employees = await listRes.json();
    const employee = (employees || []).find((emp) => {
      const statusOk =
        emp.status === 'Active' ||
        (emp.status == null && emp.active !== false && emp.password_hash);
      const activeOk = emp.active !== false;
      return statusOk && activeOk;
    });

    if (!employee) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'No active employee exists.',
          code: 'NO_ACTIVE_EMPLOYEE',
          message: 'No active employee exists. Please create an employee first.',
        }),
      };
    }

    const staffRole = employee.staff_role || employee.role || 'EmployeeOverview';
    let permissionSet = employee.permission_set || null;
    if (typeof permissionSet === 'string') {
      try {
        permissionSet = JSON.parse(permissionSet);
      } catch {
        permissionSet = null;
      }
    }

    // Short-lived preview token — same shape as employee-login so existing RBAC / APIs work.
    // Additive metadata only; does not change production employee-login JWT generation.
    const tokenExpiry = '2h';
    const previewToken = jwt.sign(
      {
        sub: employee.id,
        role: 'employee',
        user_metadata: {
          employee_id: employee.id,
          business_id: employee.business_id,
          full_name: employee.full_name,
          phone_number: employee.phone_number,
          role: staffRole,
          staff_role: staffRole,
          department: employee.department || null,
          permission_set: permissionSet,
          active: employee.active !== false,
          preview: true,
          preview_by: decoded.user_metadata?.email || decoded.sub,
        },
      },
      process.env.SUPABASE_JWT_SECRET,
      { expiresIn: tokenExpiry }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        preview: true,
        token: previewToken,
        token_expiry: tokenExpiry,
        employee: {
          id: employee.id,
          full_name: employee.full_name,
          phone_number: employee.phone_number,
          role: staffRole,
          staff_role: staffRole,
          department: employee.department || null,
          permission_set: permissionSet,
          business_id: employee.business_id,
          status: employee.status || 'Active',
          active: employee.active !== false,
        },
      }),
    };
  } catch (error) {
    console.error('preview-employee-portal error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Preview session failed',
        details: error.message,
      }),
    };
  }
};
