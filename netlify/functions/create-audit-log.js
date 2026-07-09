// netlify/functions/create-audit-log.js
// Create a new audit log entry

import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from './_utils.js';

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

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const authUser = verifyAuth(event.headers.authorization);
    
    if (!authUser) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    const { business_id, employee_id, employee_name, guest_id, guest_name, previous_value, new_value } = JSON.parse(event.body);

    if (!business_id || !employee_id || !guest_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    const { data, error } = await supabase
      .from('food_restriction_audit')
      .insert([{
        business_id,
        employee_id,
        employee_name,
        guest_id,
        guest_name,
        previous_value: previous_value || 'None',
        new_value: new_value || 'None',
        timestamp: new Date().toISOString()
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
        message: 'Audit log created successfully'
      })
    };

  } catch (error) {
    console.error('Error creating audit log:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
