// netlify/functions/manage-employees.js
// CRUD operations for employees

import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from './_utils.js';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Verify authentication
    const authUser = verifyAuth(event.headers.authorization);
    
    if (!authUser) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    // Get businessId from query params
    const { businessId } = event.queryStringParameters || {};

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID required' })
      };
    }

    // Check if user has access to this business
    if (authUser.role !== 'super_admin' && authUser.business_id !== businessId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied' })
      };
    }

    // ============================================================
    // GET - List all employees
    // ============================================================
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
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
      const { full_name, phone_number, role = 'EmployeeOverview' } = JSON.parse(event.body);
      
      if (!full_name || !phone_number) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Full name and phone number are required' })
        };
      }

      // Check if employee already exists
      const { data: existing, error: checkError } = await supabase
        .from('employees')
        .select('id')
        .eq('business_id', businessId)
        .eq('phone_number', phone_number)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Employee with this phone number already exists' })
        };
      }

      // Generate invitation token (7-day expiry)
      const invitationToken = `FCINV_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      const { data, error } = await supabase
        .from('employees')
        .insert([{
          business_id: businessId,
          full_name,
          phone_number,
          role,
          status: 'Pending',
          invitation_token: invitationToken,
          invitation_expiry: expiryDate.toISOString(),
          invited_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          data,
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

      const { data, error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', id)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) throw error;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data })
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

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)
        .eq('business_id', businessId);

      if (error) throw error;

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
      body: JSON.stringify({ error: error.message })
    };
  }
};
