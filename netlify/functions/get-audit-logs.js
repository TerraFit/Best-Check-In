// netlify/functions/get-audit-logs.js
// Fetch food restriction audit logs

import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from './_utils.js';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
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

    const { businessId, limit = 50, offset = 0 } = event.queryStringParameters || {};

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID required' })
      };
    }

    // Super admins can access any business, employees only their own
    if (authUser.role !== 'super_admin' && authUser.business_id !== businessId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied' })
      };
    }

    const { data, error, count } = await supabase
      .from('food_restriction_audit')
      .select('*', { count: 'exact' })
      .eq('business_id', businessId)
      .order('timestamp', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: data || [],
        total: count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      })
    };

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
