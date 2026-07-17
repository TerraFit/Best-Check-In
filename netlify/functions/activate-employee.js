// netlify/functions/activate-employee.js
// ✅ Using REST API directly - no WebSocket needed

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
    const { token, password } = JSON.parse(event.body);

    console.log('🔵 Activating employee with token:', token);

    if (!token || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Token and password required' })
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

    // ============================================================
    // ✅ Use REST API - NO WebSocket
    // ============================================================

    // 1. Get employee by token
    const employeeResponse = await fetch(
      `${supabaseUrl}/rest/v1/employees?invitation_token=eq.${encodeURIComponent(token)}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!employeeResponse.ok) {
      const errorText = await employeeResponse.text();
      console.error('❌ Employee fetch error:', errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database error' })
      };
    }

    const employees = await employeeResponse.json();
    const employee = employees?.[0];

    if (!employee) {
      console.log('❌ No employee found with token:', token);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Invalid invitation token' })
      };
    }

    console.log('✅ Employee found:', employee.full_name);

    // Check expiry
    const isExpired = new Date() > new Date(employee.invitation_expiry);
    if (isExpired) {
      console.log('❌ Token expired:', employee.invitation_expiry);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invitation link has expired' })
      };
    }

    // Check if already active
    if (employee.status === 'Active') {
      console.log('❌ Account already activated');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Account already activated' })
      };
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Update employee via REST PATCH
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/employees?id=eq.${employee.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          password_hash: passwordHash,
          status: 'Active',
          activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ Update error:', errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to activate account' })
      };
    }

    const updatedEmployees = await updateResponse.json();
    const updated = updatedEmployees?.[0];

    console.log('✅ Employee activated:', employee.full_name);

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
          status: updated.status
        }
      })
    };

  } catch (error) {
    console.error('❌ Activation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to activate account',
        details: error.message 
      })
    };
  }
};
