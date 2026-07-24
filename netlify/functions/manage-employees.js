// netlify/functions/manage-employees.js
// ✅ SIMPLIFIED: Phone numbers as digits only (no international formatting)

const jwt = require('jsonwebtoken');

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  console.log('🔵 ========================================');
  console.log('🔵 manage-employees called');
  console.log('🔵 Method:', event.httpMethod);
  console.log('🔵 Supabase URL:', supabaseUrl);
  console.log('🔵 Has key:', !!supabaseKey);
  console.log('🔵 ========================================');

  try {
    const authHeader = event.headers.authorization;
    console.log('🔵 Authorization header present:', !!authHeader);

    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No authorization token provided' })
      };
    }

    let token = authHeader.replace('Bearer ', '').trim();
    console.log('🔵 Token length after cleanup:', token.length);

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
      console.log('✅ Token verified successfully');
    } catch (verifyErr) {
      console.error('❌ JWT verification failed:', verifyErr.message);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token: ' + verifyErr.message })
      };
    }

    const businessId = decoded.user_metadata?.business_id;

    console.log('🔵 Decoded JWT:');
    console.log('🔵   - business_id from token:', businessId);
    console.log('🔵   - sub (user id):', decoded.sub);
    console.log('🔵   - role:', decoded.role);

    if (!businessId) {
      console.log('❌ No business_id in token');
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Token missing business ID' })
      };
    }

    // ============================================================
    // ✅ GET - List all employees
    // ============================================================
    if (event.httpMethod === 'GET') {
      console.log('🔵 GET employees for business:', businessId);

      const response = await fetch(
        `${supabaseUrl}/rest/v1/employees?business_id=eq.${businessId}&select=*&order=created_at.desc`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ GET error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to fetch employees' })
        };
      }

      const data = await response.json();
      console.log('🔵 GET returned:', data.length, 'employees');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: data || [] })
      };
    }

    // ============================================================
    // ✅ POST - Create new employee
    // ============================================================
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      let { full_name, phone_number, role = 'EmployeeOverview' } = body;

      console.log('🔵 POST employee:');
      console.log('🔵   - businessId from token:', businessId);
      console.log('🔵   - full_name:', full_name);
      console.log('🔵   - phone_number:', phone_number);
      console.log('🔵   - role:', role);

      if (!full_name || !phone_number) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Full name and phone number are required' })
        };
      }

      // ✅ SIMPLIFIED: Clean phone number - only digits
      const cleanPhone = phone_number.replace(/\D/g, '');
      console.log('📱 Cleaned phone:', cleanPhone);

      if (cleanPhone.length < 9) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Phone number must be at least 9 digits' })
        };
      }

      // Generate invitation token
      const invitationToken = 'FCINV_' + Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      const insertData = {
        business_id: businessId,
        full_name,
        phone_number: cleanPhone, // ✅ Store as digits only
        role,
        status: 'Pending',
        invitation_token: invitationToken,
        invitation_expiry: expiryDate.toISOString(),
        invited_at: new Date().toISOString()
      };

      console.log('🔵 Inserting data:', JSON.stringify(insertData, null, 2));

      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/employees`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify([insertData])
      });

      if (!insertResponse.ok) {
        const error = await insertResponse.text();
        console.error('❌ Insert error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: `Failed to create employee: ${error}` })
        };
      }

      const data = await insertResponse.json();
      console.log('✅ Insert success!');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: data[0],
          message: 'Employee created successfully'
        })
      };
    }

    // ============================================================
    // ✅ PUT - Update employee (status, role, etc.)
    // ============================================================
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body);
      const { id, status, role, full_name, phone_number } = body;

      console.log('🔵 PUT employee:', id);
      console.log('🔵   - status:', status);
      console.log('🔵   - role:', role);

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Employee ID required' })
        };
      }

      const updateData = { updated_at: new Date().toISOString() };
      if (status) updateData.status = status;
      if (role) updateData.role = role;
      if (full_name) updateData.full_name = full_name;
      if (phone_number) {
        // ✅ Clean phone if updating
        const cleanPhone = phone_number.replace(/\D/g, '');
        if (cleanPhone.length >= 9) {
          updateData.phone_number = cleanPhone;
        } else {
          console.warn('⚠️ Phone number too short, skipping update');
        }
      }

      console.log('🔵 Update data:', JSON.stringify(updateData, null, 2));

      const response = await fetch(
        `${supabaseUrl}/rest/v1/employees?id=eq.${id}&business_id=eq.${businessId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(updateData)
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Update error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to update employee' })
        };
      }

      const data = await response.json();
      console.log('✅ Update success:', data[0]?.id);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: data[0] })
      };
    }

    // ============================================================
    // ✅ DELETE - Remove employee
    // ============================================================
    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body);
      const { id } = body;

      console.log('🔵 DELETE employee:', id);

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Employee ID required' })
        };
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/employees?id=eq.${id}&business_id=eq.${businessId}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Delete error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to delete employee' })
        };
      }

      console.log('✅ Delete success');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Employee deleted successfully' })
      };
    }

    console.log('❌ Method not allowed:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('❌ Unhandled error:', error);
    console.error('❌ Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
