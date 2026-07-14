// netlify/functions/employee-login.js
// Refactored to match production REST API pattern

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  try {
    const { phone, password } = JSON.parse(event.body);
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    // ✅ Clean phone number
    const cleanPhone = phone.replace(/\s+/g, '').trim();
    
    // ✅ Find employee by phone number (REST API)
    const response = await fetch(
      `${supabaseUrl}/rest/v1/employees?phone_number=eq.${encodeURIComponent(cleanPhone)}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase error: ${error}`);
    }

    const employees = await response.json();
    const employee = employees[0];

    if (!employee) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid phone number or password' })
      };
    }

    if (employee.status === 'Disabled') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Account has been disabled' })
      };
    }

    if (employee.status === 'Pending') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Account not activated. Please use the invitation link sent to you.' 
        })
      };
    }

    // ✅ Verify password
    const validPassword = await bcrypt.compare(password, employee.password_hash);
    if (!validPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid phone number or password' })
      };
    }

    // ✅ Update last login (REST API)
    await fetch(
      `${supabaseUrl}/rest/v1/employees?id=eq.${employee.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ last_login: new Date().toISOString() })
      }
    );

    // ✅ Generate token (matches production format)
    const token = jwt.sign(
      {
        sub: employee.id,
        role: 'authenticated',
        user_metadata: {
          employee_id: employee.id,
          business_id: employee.business_id,
          full_name: employee.full_name,
          phone_number: employee.phone_number,
          role: 'EmployeeOverview'
        }
      },
      process.env.SUPABASE_JWT_SECRET,
      { expiresIn: '1d' }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        token: token,
        token_expiry: '1d',
        employee: {
          id: employee.id,
          full_name: employee.full_name,
          phone_number: employee.phone_number,
          business_id: employee.business_id,
          role: employee.role,
          status: employee.status
        }
      })
    };

  } catch (error) {
    console.error('Employee login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
