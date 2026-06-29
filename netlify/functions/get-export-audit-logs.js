// netlify/functions/get-export-audit-logs.js
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

export const handler = async (event) => {
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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    // Verify SuperAdmin access
    const token = event.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'No authorization token provided' }) };
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    } catch (err) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };
    }

    // Check if user is SuperAdmin
    const userRole = decoded.user_metadata?.role || decoded.role;
    if (userRole !== 'super_admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'SuperAdmin access required' }) };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Build query with filters
    const { businessId, userId, dateFrom, dateTo, limit = 100, offset = 0 } = event.queryStringParameters || {};

    let query = supabase
      .from('sensitive_export_audit')
      .select('*', { count: 'exact' })
      .order('exported_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (businessId) {
      query = query.eq('business_id', businessId);
    }
    if (userId) {
      query = query.eq('exported_by_user_id', userId);
    }
    if (dateFrom) {
      query = query.gte('exported_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('exported_at', dateTo);
    }

    const { data, error, count } = await query;

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
      body: JSON.stringify({ error: 'Failed to fetch audit logs', details: error.message })
    };
  }
};
