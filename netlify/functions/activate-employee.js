// netlify/functions/activate-employee.js
// Employee onboarding activation - FIXED

import { createClient } from '@supabase/supabase-js';
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

    // ✅ FIXED: Disable Realtime
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        realtime: { enabled: false }
      }
    );

    // Find the employee by invitation token
    const { data: employee, error: findError } = await supabase
      .from('employees')
      .select('*')
      .eq('invitation_token', token)
      .eq('status', 'Pending')
      .gte('invitation_expiry', new Date().toISOString())
      .single();

    if (findError || !employee) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired invitation token' })
      };
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Activate employee
    const { data, error: updateError } = await supabase
      .from('employees')
      .update({
        password_hash: passwordHash,
        status: 'Active',
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', employee.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Account activated successfully',
        employee: {
          id: data.id,
          full_name: data.full_name,
          phone_number: data.phone_number,
          role: data.role
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
