// netlify/functions/employee-login.js
// Employee login with phone number

import { createClient } from '@supabase/supabase-js';
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
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Clean phone number
    const cleanPhone = phone.replace(/\s+/g, '').trim();
    
    // Find employee by phone number
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('phone_number', cleanPhone)
      .single();

    if (error || !employee) {
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

    // Verify password
    const validPassword = await bcrypt.compare(password, employee.password_hash);
    if (!validPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid phone number or password' })
      };
    }

    // Update last login
    await supabase
      .from('employees')
      .update({ last_login: new Date().toISOString() })
      .eq('id', employee.id);

    // Generate token
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
