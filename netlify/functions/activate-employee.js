// netlify/functions/activate-employee.js
// Public invitation capability endpoint. The invitation token is the credential.

import bcrypt from 'bcryptjs';

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body must be valid JSON' })
      };
    }

    const { token, password } = body;

    if (!token || typeof token !== 'string' || token.length > 256 || !password || typeof password !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid token and password are required' })
      };
    }

    if (password.length < 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password must be at least 8 characters' })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    const authHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    };

    const employeeResponse = await fetch(
      `${supabaseUrl}/rest/v1/employees?invitation_token=eq.${encodeURIComponent(token)}&status=eq.Pending&select=id,business_id,full_name,phone_number,role,invitation_expiry&limit=1`,
      { headers: authHeaders }
    );

    if (!employeeResponse.ok) {
      const errorText = await employeeResponse.text();
      console.error('❌ Employee fetch error:', employeeResponse.status, errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Unable to verify invitation' })
      };
    }

    const employees = await employeeResponse.json();
    const employee = employees?.[0];

    if (!employee) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired invitation token' })
      };
    }

    const now = new Date();
    const expiry = new Date(employee.invitation_expiry);
    if (!employee.invitation_expiry || Number.isNaN(expiry.getTime()) || now > expiry) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invitation link has expired' })
      };
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const activatedAt = new Date().toISOString();

    // Consume the invitation atomically. A second concurrent request using the
    // same token cannot overwrite the password after the first activation.
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/employees?id=eq.${encodeURIComponent(employee.id)}&status=eq.Pending&invitation_token=eq.${encodeURIComponent(token)}`,
      {
        method: 'PATCH',
        headers: {
          ...authHeaders,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          password_hash: passwordHash,
          status: 'Active',
          activated_at: activatedAt,
          invitation_token: null,
          updated_at: activatedAt
        })
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ Update error:', updateResponse.status, errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to activate account' })
      };
    }

    const updatedEmployees = await updateResponse.json();
    const updated = updatedEmployees?.[0];

    if (!updated) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Invitation is no longer valid' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Account activated successfully',
        employee: {
          id: updated.id,
          full_name: updated.full_name,
          phone_number: updated.phone_number,
          role: updated.role,
          status: updated.status
        }
      })
    };
  } catch (error) {
    console.error('❌ Activation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to activate account' })
    };
  }
};
