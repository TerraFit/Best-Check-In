// netlify/functions/employee-login.js
// FIXED: Handles both international and local SA phone numbers

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.handler = async function(event) {
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  console.log('🔵 employee-login called');

  try {
    const { phone, password } = JSON.parse(event.body);
    
    // ✅ Clean phone number - keep only digits
    const digitsOnly = phone.replace(/\D/g, '');
    console.log('🔵 Digits only:', digitsOnly);

    // ✅ Generate all possible formats for South African numbers
    const phoneVariants = [
      phone, // Original input
      digitsOnly, // Just digits
      `+27${digitsOnly}`, // International format with +
      `27${digitsOnly}`, // International format without +
    ];

    // ✅ If it's a local SA number (starts with 0), add the international variants
    if (digitsOnly.startsWith('0')) {
      const withoutLeadingZero = digitsOnly.substring(1);
      phoneVariants.push(`+27${withoutLeadingZero}`);
      phoneVariants.push(`27${withoutLeadingZero}`);
    }

    // ✅ If it's already international (starts with 27), add the local variants
    if (digitsOnly.startsWith('27')) {
      const withoutCountryCode = digitsOnly.substring(2);
      phoneVariants.push(`0${withoutCountryCode}`);
      phoneVariants.push(`+27${withoutCountryCode}`);
    }

    // Remove duplicates
    const uniqueVariants = [...new Set(phoneVariants)];
    console.log('🔵 Phone variants:', uniqueVariants);

    // ✅ Try each variant
    let employee = null;
    let foundVariant = null;

    for (const variant of uniqueVariants) {
      if (!variant) continue;
      
      const response = await fetch(
        `${supabaseUrl}/rest/v1/employees?phone_number=eq.${encodeURIComponent(variant)}&select=*`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      );

      if (response.ok) {
        const employees = await response.json();
        if (employees && employees.length > 0) {
          employee = employees[0];
          foundVariant = variant;
          break;
        }
      }
    }

    console.log('🔵 Found employee with variant:', foundVariant);

    if (!employee) {
      console.log('❌ No employee found for phone:', phone);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid phone number or password' })
      };
    }

    console.log('🔵 Employee found:', employee.full_name);
    console.log('🔵 Status:', employee.status);
    console.log('🔵 Has password_hash:', !!employee.password_hash);

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

    if (!employee.password_hash) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Account not fully set up. Please use the invitation link sent to you.' 
        })
      };
    }

    const validPassword = await bcrypt.compare(password, employee.password_hash);
    console.log('🔵 Password valid:', validPassword);

    if (!validPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid phone number or password' })
      };
    }

    // ✅ Update last login
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
    console.error('❌ Employee login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
