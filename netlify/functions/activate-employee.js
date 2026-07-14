// netlify/functions/activate-employee.js
// REST API ONLY - No Supabase client, no WebSocket issues

import bcrypt from 'bcryptjs';

export const handler = async function(event) {
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
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error' })
    };
  }

  try {
    const { token, password } = JSON.parse(event.body);

    if (!token || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Token and password are required' })
      };
    }

    if (password.length < 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password must be at least 8 characters' })
      };
    }

    // ✅ Find employee by invitation token (REST API)
    const response = await fetch(
      `${supabaseUrl}/rest/v1/employees?invitation_token=eq.${encodeURIComponent(token)}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Supabase find error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to find employee' })
      };
    }

    const employees = await response.json();
    const employee = employees[0];

    if (!employee) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired invitation token' })
      };
    }

    // ✅ Check expiry
    if (new Date() > new Date(employee.invitation_expiry)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invitation token has expired' })
      };
    }

    if (employee.status !== 'Pending') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Account already activated' })
      };
    }

    // ✅ Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // ✅ Activate employee (REST API)
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
      const error = await updateResponse.text();
      console.error('Supabase update error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to activate employee' })
      };
    }

    const updatedData = await updateResponse.json();
    const activatedEmployee = updatedData[0];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Account activated successfully',
        employee: {
          id: activatedEmployee.id,
          full_name: activatedEmployee.full_name,
          phone_number: activatedEmployee.phone_number,
          role: activatedEmployee.role
        }
      })
    };

  } catch (error) {
    console.error('Employee activation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
