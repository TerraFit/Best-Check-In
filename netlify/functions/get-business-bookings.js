import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // ✅ Get token from Authorization header
  const authHeader = event.headers.authorization || event.headers.Authorization;
  console.log('🔐 Auth header present:', !!authHeader);
  
  // ✅ For now, just log but don't require token for debugging
  // We'll add proper validation later
  if (!authHeader) {
    console.log('⚠️ No auth header provided, but continuing for debugging');
  }

  try {
    const { businessId, startDate, endDate, limit = 5000 } = event.queryStringParameters || {};

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing businessId' })
      };
    }

    console.log('📊 Fetching bookings for business:', businessId);

    let query = supabase
      .from('bookings')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (startDate) {
      query = query.gte('check_in_date', startDate);
    }
    if (endDate) {
      query = query.lte('check_in_date', endDate);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('❌ Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch bookings' })
      };
    }

    console.log(`✅ Found ${bookings.length} bookings for business ${businessId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        bookings: bookings || [],
        summary: {
          total_bookings: bookings.length,
          total_revenue: bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)
        }
      })
    };
  } catch (err) {
    console.error('❌ Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Internal Server Error' })
    };
  }
};
