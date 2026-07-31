// netlify/functions/employee-login.js
// RBAC: updates last_login; JWT carries staff_role, department, permission_set

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    let phone = body.phone_number || body.phone;
    const password = body.password;

    if (!phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Phone number is required' }),
      };
    }
    if (!password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password is required' }),
      };
    }

    const cleanDigits = phone.replace(/\D/g, '');
    const variants = [];
    variants.push(cleanDigits);
    if (cleanDigits.startsWith('0')) variants.push(cleanDigits.substring(1));
    if (!cleanDigits.startsWith('0')) variants.push('0' + cleanDigits);
    if (cleanDigits.startsWith('27')) {
      const without27 = cleanDigits.substring(2);
      variants.push(without27);
      if (!without27.startsWith('0')) variants.push('0' + without27);
    }
    if (cleanDigits.startsWith('027')) variants.push(cleanDigits.substring(3));
    if (!cleanDigits.startsWith('27')) {
      if (cleanDigits.length === 9) {
        variants.push('27' + cleanDigits);
        variants.push('+27' + cleanDigits);
      } else if (cleanDigits.length === 10 && cleanDigits.startsWith('0')) {
        const withoutZero = cleanDigits.substring(1);
        variants.push('27' + withoutZero);
        variants.push('+27' + withoutZero);
      }
    }
    const uniqueVariants = [...new Set(variants)];

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }

    const allResponse = await fetch(`${supabaseUrl}/rest/v1/employees?select=*`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!allResponse.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database error' }),
      };
    }

    const allEmployees = await allResponse.json();
    let employee = null;

    for (const variant of uniqueVariants) {
      const cleanVariant = variant.replace(/\D/g, '');
      employee = allEmployees?.find((emp) => {
        const storedClean = (emp.phone_number || '').replace(/\D/g, '');
        return storedClean === cleanVariant;
      });
      if (employee) break;
    }

    if (!employee) {
      const primaryVariant = uniqueVariants[0];
      employee = allEmployees?.find((emp) => {
        const storedClean = (emp.phone_number || '').replace(/\D/g, '');
        return storedClean.includes(primaryVariant) || primaryVariant.includes(storedClean);
      });
    }

    if (!employee) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid phone number or password' }),
      };
    }

    if (employee.status === 'Disabled' || employee.active === false) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Account has been disabled. Please contact your administrator.',
        }),
      };
    }

    if (employee.status === 'Pending') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Account not yet activated. Please use the invitation link sent to you.',
        }),
      };
    }

    if (!employee.password_hash) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Account not properly set up. Please contact your administrator.',
        }),
      };
    }

    const validPassword = await bcrypt.compare(password, employee.password_hash);
    if (!validPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid phone number or password' }),
      };
    }

    const nowIso = new Date().toISOString();
    // Update last_login (non-blocking for login success)
    try {
      await fetch(`${supabaseUrl}/rest/v1/employees?id=eq.${employee.id}`, {
        method: 'PATCH',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ last_login: nowIso, updated_at: nowIso }),
      });
    } catch (e) {
      console.warn('last_login update failed', e.message);
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

    const tokenExpiry = '7d';
    const token = jwt.sign(
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
        token: token,
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
          status: employee.status,
          active: employee.active !== false,
          last_login: nowIso,
        },
      }),
    };
  } catch (error) {
    console.error('Employee login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Login failed',
        details: error.message,
      }),
    };
  }
};
