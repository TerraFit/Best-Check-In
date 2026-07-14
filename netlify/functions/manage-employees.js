// netlify/functions/manage-employees.js
// DEBUG VERSION - Minimal to find the crash

import jwt from 'jsonwebtoken';

export const handler = async function(event) {
  // ✅ Simple response to test if function works at all
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ 
      success: true, 
      message: 'Function is working!',
      method: event.httpMethod,
      hasAuth: !!event.headers.authorization
    })
  };
};

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
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
    // ✅ Authenticate using JWT (matches business-login pattern)
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No authorization token provided' })
      };
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    const businessId = decoded.user_metadata?.business_id;

    if (!businessId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Token missing business ID' })
      };
    }

    // ============================================================
    // GET - List all employees
    // ============================================================
    if (event.httpMethod === 'GET') {
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
        console.error('Supabase GET error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to fetch employees' })
        };
      }

      const data = await response.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: data || [] })
      };
    }

    // ============================================================
    // POST - Create new employee
    // ============================================================
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      const { full_name, phone_number, role = 'EmployeeOverview' } = body;

      if (!full_name || !phone_number) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Full name and phone number are required' })
        };
      }

      // Check if employee already exists
      const checkResponse = await fetch(
        `${supabaseUrl}/rest/v1/employees?business_id=eq.${businessId}&phone_number=eq.${encodeURIComponent(phone_number)}&select=id`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      );

      if (!checkResponse.ok) {
        const error = await checkResponse.text();
        console.error('Supabase check error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to check existing employee' })
        };
      }

      const existing = await checkResponse.json();
      if (existing && existing.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Employee with this phone number already exists' })
        };
      }

      // Generate invitation token
      const invitationToken = 'FCINV_' + Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      // Insert new employee
      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/employees`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify([{
          business_id: businessId,
          full_name,
          phone_number,
          role,
          status: 'Pending',
          invitation_token: invitationToken,
          invitation_expiry: expiryDate.toISOString(),
          invited_at: new Date().toISOString()
        }])
      });

      if (!insertResponse.ok) {
        const error = await insertResponse.text();
        console.error('Supabase insert error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: `Failed to create employee: ${error}` })
        };
      }

      const data = await insertResponse.json();
      const newEmployee = data[0];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: newEmployee,
          message: 'Employee created successfully'
        })
      };
    }

    // ============================================================
    // PUT - Update employee
    // ============================================================
    if (event.httpMethod === 'PUT') {
      const { id, status, role, full_name, phone_number } = JSON.parse(event.body);

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
      if (phone_number) updateData.phone_number = phone_number;

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
        console.error('Supabase update error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to update employee' })
        };
      }

      const data = await response.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: data[0] })
      };
    }

    // ============================================================
    // DELETE - Remove employee
    // ============================================================
    if (event.httpMethod === 'DELETE') {
      const { id } = JSON.parse(event.body);

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
        console.error('Supabase delete error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to delete employee' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Employee deleted successfully' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Employee management error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
