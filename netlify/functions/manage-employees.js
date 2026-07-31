// netlify/functions/manage-employees.js
// RBAC-aware employee CRUD — stores staff_role + permission_set

const jwt = require('jsonwebtoken');
const { requirePermission, principalFromJwt } = require('./_rbac');

exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  try {
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No authorization token provided' }),
      };
    }

    let token = authHeader.replace('Bearer ', '').trim();
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

    const principal = principalFromJwt(decoded);
    if (!requirePermission(principal, 'canManageStaff') && principal.actorType !== 'business') {
      // Business owner tokens always allowed
      if (principal.actorType !== 'business' && principal.role !== 'business_owner') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Missing permission: canManageStaff' }),
        };
      }
    }

    const businessId = decoded.user_metadata?.business_id;
    if (!businessId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Token missing business ID' }),
      };
    }

    if (event.httpMethod === 'GET') {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/employees?business_id=eq.${businessId}&select=*&order=created_at.desc`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );
      if (!response.ok) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to fetch employees' }),
        };
      }
      const data = await response.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: data || [] }),
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      let {
        full_name,
        phone_number,
        role = 'front_desk',
        staff_role,
        permission_set,
      } = body;

      if (!full_name || !phone_number) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Full name and phone number are required' }),
        };
      }

      const cleanPhone = phone_number.replace(/\D/g, '');
      if (cleanPhone.length < 9) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Phone number must be at least 9 digits' }),
        };
      }

      const resolvedRole = staff_role || role || 'front_desk';
      const invitationToken =
        'FCINV_' + Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      const insertData = {
        business_id: businessId,
        full_name,
        phone_number: cleanPhone,
        role: resolvedRole,
        staff_role: resolvedRole,
        permission_set: permission_set || null,
        status: 'Pending',
        active: true,
        invitation_token: invitationToken,
        invitation_expiry: expiryDate.toISOString(),
        invited_at: new Date().toISOString(),
      };

      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/employees`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify([insertData]),
      });

      if (!insertResponse.ok) {
        // Fallback without new columns if migration not applied yet
        const errText = await insertResponse.text();
        if (/staff_role|permission_set|active/i.test(errText)) {
          const legacy = {
            business_id: businessId,
            full_name,
            phone_number: cleanPhone,
            role: resolvedRole,
            status: 'Pending',
            invitation_token: invitationToken,
            invitation_expiry: expiryDate.toISOString(),
            invited_at: new Date().toISOString(),
          };
          const legacyRes = await fetch(`${supabaseUrl}/rest/v1/employees`, {
            method: 'POST',
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify([legacy]),
          });
          if (!legacyRes.ok) {
            const e2 = await legacyRes.text();
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: `Failed to create employee: ${e2}` }),
            };
          }
          const d2 = await legacyRes.json();
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, data: d2[0] }),
          };
        }
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: `Failed to create employee: ${errText}` }),
        };
      }

      const data = await insertResponse.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: data[0] }),
      };
    }

    if (event.httpMethod === 'PUT' || event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}');
      const { id, status, role, staff_role, full_name, phone_number, active, permission_set } =
        body;

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Employee ID required' }),
        };
      }

      const updateData = { updated_at: new Date().toISOString() };
      if (status) updateData.status = status;
      if (active !== undefined) updateData.active = !!active;
      if (status === 'Disabled') updateData.active = false;
      if (status === 'Active') updateData.active = true;
      if (role) {
        updateData.role = role;
        updateData.staff_role = role;
      }
      if (staff_role) {
        updateData.staff_role = staff_role;
        updateData.role = staff_role;
      }
      if (permission_set !== undefined) updateData.permission_set = permission_set;
      if (full_name) updateData.full_name = full_name;
      if (phone_number) {
        const cleanPhone = phone_number.replace(/\D/g, '');
        if (cleanPhone.length >= 9) updateData.phone_number = cleanPhone;
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/employees?id=eq.${id}&business_id=eq.${businessId}`,
        {
          method: 'PATCH',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to update employee: ' + error }),
        };
      }

      const data = await response.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: data[0] }),
      };
    }

    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}');
      const { id } = body;
      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Employee ID required' }),
        };
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/employees?id=eq.${id}&business_id=eq.${businessId}`,
        {
          method: 'DELETE',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );

      if (!response.ok) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to delete employee' }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Employee deleted successfully' }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('manage-employees fatal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};
