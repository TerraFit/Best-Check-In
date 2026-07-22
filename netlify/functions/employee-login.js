// netlify/functions/employee-login.js
// ✅ COMPLETE: Handles ALL phone number formats

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
    // ✅ GENERATE ALL POSSIBLE PHONE FORMATS FOR MATCHING
    // ============================================================
    
    // Clean input: remove all non-digit characters
    const cleanDigits = phone.replace(/\D/g, '');
    console.log('📱 Cleaned digits:', cleanDigits);

    // Generate all possible variants
    const variants = [];
    
    // 1. Input as-is (already cleaned)
    variants.push(cleanDigits);
    
    // 2. If starts with 0, also try without 0 (international format without +)
    if (cleanDigits.startsWith('0')) {
      variants.push(cleanDigits.substring(1));
    }
    
    // 3. If doesn't start with 0, try with 0 (national format)
    if (!cleanDigits.startsWith('0')) {
      variants.push('0' + cleanDigits);
    }
    
    // 4. If starts with 27, also try with 0 (for national format from international)
    if (cleanDigits.startsWith('27')) {
      const without27 = cleanDigits.substring(2);
      variants.push(without27);
      if (!without27.startsWith('0')) {
        variants.push('0' + without27);
      }
    }
    
    // 5. If starts with 027, try without 027
    if (cleanDigits.startsWith('027')) {
      variants.push(cleanDigits.substring(3));
    }
    
    // 6. Add +27 version
    if (!cleanDigits.startsWith('27')) {
      // Try to add +27
      if (cleanDigits.length === 9) {
        variants.push('27' + cleanDigits);
        variants.push('+27' + cleanDigits);
      } else if (cleanDigits.length === 10 && cleanDigits.startsWith('0')) {
        const withoutZero = cleanDigits.substring(1);
        variants.push('27' + withoutZero);
        variants.push('+27' + withoutZero);
      }
    }
    
    // 7. Remove duplicates
    const uniqueVariants = [...new Set(variants)];
    console.log('📱 Phone variants to try:', uniqueVariants);

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
    // ✅ SEARCH FOR EMPLOYEE WITH ANY PHONE VARIANT
    // ============================================================

    // Get all employees
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
    console.log(`📊 Found ${allEmployees?.length || 0} total employees`);

    let employee = null;
    let matchedVariant = null;

    // Try each variant against stored phone numbers
    for (const variant of uniqueVariants) {
      // Clean the variant (just in case)
      const cleanVariant = variant.replace(/\D/g, '');
      
      console.log(`🔍 Trying variant: ${cleanVariant}`);
      
      // Try exact match on stored phone
      employee = allEmployees?.find(emp => {
        const storedPhone = emp.phone_number || '';
        // Remove non-digits from stored phone
        const storedClean = storedPhone.replace(/\D/g, '');
        const matches = storedClean === cleanVariant;
        if (matches) {
          console.log(`✅ Match found: stored="${storedPhone}" vs variant="${cleanVariant}"`);
        }
        return matches;
      });
      
      if (employee) {
        matchedVariant = cleanVariant;
        break;
      }
    }

    // If still not found, try contains match (for partial matches)
    if (!employee) {
      console.log('🔍 Trying partial match...');
      
      // Use the first variant (the most likely one)
      const primaryVariant = uniqueVariants[0];
      
      employee = allEmployees?.find(emp => {
        const storedPhone = emp.phone_number || '';
        const storedClean = storedPhone.replace(/\D/g, '');
        // Check if variant is contained in stored phone or vice versa
        return storedClean.includes(primaryVariant) || primaryVariant.includes(storedClean);
      });
      
      if (employee) {
        console.log('✅ Found via partial match:', employee.full_name);
      }
    }

    if (!employee) {
      console.log('❌ No employee found for phone variants:', uniqueVariants);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid phone number or password' })
      };
    }

    console.log('✅ Employee found:', employee.full_name);
    console.log('📱 Stored phone:', employee.phone_number);
    console.log('📱 Matched variant:', matchedVariant);
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
