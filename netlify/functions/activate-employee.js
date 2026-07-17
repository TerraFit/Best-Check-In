// netlify/functions/activate-employee.js
// ✅ Fixed: Added WebSocket support for Node.js 20

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import WebSocket from 'ws';  // ✅ ADD THIS

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

    // ============================================================
    // ✅ FIX: Initialize Supabase with WebSocket transport
    // ============================================================
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        realtime: {
          transport: WebSocket  // ✅ This is the fix!
        }
      }
    );

    // Verify token and get employee
    const { data: employee, error: fetchError } = await supabase
      .from('employees')
      .select('*')
      .eq('invitation_token', token)
      .single();

    if (fetchError || !employee) {
      console.error('❌ Employee fetch error:', fetchError);
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

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Update employee
    const { data: updated, error: updateError } = await supabase
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

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to activate account' })
      };
    }

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
