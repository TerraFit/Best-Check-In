// netlify/functions/get-employee-by-token.js
// ✅ Employee invitation verification function

import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Get token from query string
    const { token } = event.queryStringParameters || {};

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing token parameter' })
      };
    }

    console.log('🔍 get-employee-by-token called with token:', token);

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Fetch employee by invitation token
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('invitation_token', token)
      .single();

    if (error || !employee) {
      console.error('❌ Employee not found:', error?.message || 'No employee with this token');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid or expired invitation token',
          details: error?.message || 'No employee found with this token'
        })
      };
    }

    console.log('✅ Employee found:', employee.full_name);
    console.log('📱 Phone:', employee.phone_number);
    console.log('📊 Status:', employee.status);
    console.log('⏰ Expiry:', employee.invitation_expiry);

    // Check if token is expired
    const isExpired = new Date() > new Date(employee.invitation_expiry);
    if (isExpired) {
      console.log('❌ Token expired on:', employee.invitation_expiry);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invitation link has expired. Please request a new one from your employer.',
          expired: true
        })
      };
    }

    // Check if already activated
    if (employee.status === 'Active') {
      console.log('❌ Account already activated');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'This account has already been activated.',
          alreadyActivated: true
        })
      };
    }

    // Get business name
    const { data: business } = await supabase
      .from('businesses')
      .select('trading_name')
      .eq('id', employee.business_id)
      .single();

    // Remove sensitive data before sending
    const { password_hash, ...safeEmployee } = employee;

    console.log('✅ Returning employee data for:', safeEmployee.full_name);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        employee: safeEmployee,
        businessName: business?.trading_name || 'J-Bay Zebra Lodge'
      })
    };

  } catch (error) {
    console.error('❌ Error in get-employee-by-token:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};
