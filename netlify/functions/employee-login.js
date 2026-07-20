// netlify/functions/employee-login.js
// ✅ SIMPLIFIED: National phone numbers only (no international formatting)

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
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
      body = JSON.parse(event.body);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    console.log('📥 Request body:', JSON.stringify(body, null, 2));
    
    // ✅ Get phone number - support both field names
    let phone = body.phone_number || body.phone;
    const password = body.password;

    console.log('📱 Raw phone input:', phone);

    if (!phone) {
      console.error('❌ No phone number provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Phone number is required' })
      };
    }

    if (!password) {
      console.error('❌ No password provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password is required' })
      };
    }

    // ============================================================
    // ✅ SIMPLIFIED: Remove spaces and special characters
    // Only keep digits (0-9)
    // ============================================================
    const cleanPhone = phone.replace(/\D/g, '');
    console.log('📱 Cleaned phone (digits only):', cleanPhone);

    if (cleanPhone.length < 9) {
      console.error('❌ Phone number too short:', cleanPhone.length);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Phone number must be at least 9 digits' 
        })
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
    // ✅ Store and compare phone numbers as clean digits only
    // ============================================================

    // 1. Try exact match on clean phone number
    const response = await fetch(
      `${supabaseUrl}/rest/v1/employees?phone_number=eq.${cleanPhone}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('❌ Supabase error:', response.status);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database error' })
      };
    }

    let employees = await response.json();
    let employee = employees?.[0];

    // 2. If not found, try cleaning all phone numbers in the database
    if (!employee) {
      console.log('🔍 No exact match, checking all employees...');
      
      const allResponse = await fetch(
        `${supabaseUrl}/rest/v1/employees?select=*`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!allResponse.ok) {
        console.error('❌ Supabase error:', allResponse.status);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Database error' })
        };
      }

      const allEmployees = await allResponse.json();
      
      // Find employee by cleaning their stored phone number
      employee = allEmployees?.find(emp => {
        const cleanedDbPhone = (emp.phone_number || '').replace(/\D/g, '');
        return cleanedDbPhone === cleanPhone;
      });

      if (employee) {
        console.log('✅ Found employee via cleaned match:', employee.full_name);
        console.log('📱 Stored phone:', employee.phone_number);
        console.log('📱 Cleaned match:', cleanPhone);
      }
    }

    if (!employee) {
      console.log('❌ No employee found for phone:', cleanPhone);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid phone number or password' })
      };
    }

    console.log('✅ Employee found:', employee.full_name);
    console.log('📱 Phone:', employee.phone_number);
    console.log('📊 Status:', employee.status);

    // Check if employee is active
    if (employee.status === 'Disabled') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Account has been disabled. Please contact your administrator.' })
      };
    }

    if (employee.status === 'Pending') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: 'Account not yet activated. Please use the invitation link sent to you.' 
        })
      };
    }

    // Verify password
    if (!employee.password_hash) {
      console.error('❌ No password hash found for employee:', employee.full_name);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: 'Account not properly set up. Please contact your administrator.' 
        })
      };
    }

    const validPassword = await bcrypt.compare(password, employee.password_hash);
    if (!validPassword) {
      console.log('❌ Invalid password for employee:', employee.full_name);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid phone number or password' })
      };
    }

    // Generate JWT token
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
          role: employee.role
        }
      },
      process.env.SUPABASE_JWT_SECRET,
      { expiresIn: tokenExpiry }
    );

    console.log('✅ Employee login successful:', employee.full_name);

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
          role: employee.role,
          business_id: employee.business_id,
          status: employee.status
        }
      })
    };

  } catch (error) {
    console.error('❌ Employee login error:', error);
    console.error('❌ Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Login failed',
        details: error.message 
      })
    };
  }
};
