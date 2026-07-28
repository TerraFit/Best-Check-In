// netlify/functions/get-business-bookings.js
// ✅ STEP 1: Supabase query (no JWT)

console.log('📦📦📦 STEP 1 - Supabase query (no JWT) 📦📦📦');

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  console.log('🔵 HANDLER - Step 1: Supabase query');
  console.log('📡 Query params:', event.queryStringParameters);
  
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(204, {});
  }
  
  if (event.httpMethod !== 'GET') {
    return createResponse(405, { success: false, error: 'Method Not Allowed' });
  }
  
  try {
    const targetBusinessId = event.queryStringParameters?.businessId;
    console.log('🎯 Business ID:', targetBusinessId);
    
    if (!targetBusinessId) {
      return createResponse(400, { success: false, error: 'Business ID required' });
    }
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    console.log('🔗 Supabase URL exists:', !!supabaseUrl);
    console.log('🔑 Supabase Key exists:', !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing credentials');
      return createResponse(500, { success: false, error: 'Missing Supabase credentials' });
    }
    
    const limit = parseInt(event.queryStringParameters?.limit || 25);
    const offset = (parseInt(event.queryStringParameters?.page || 1) - 1) * limit;
    const url = `${supabaseUrl}/rest/v1/bookings?business_id=eq.${targetBusinessId}&order=check_in_date.desc&limit=${limit}&offset=${offset}`;
    
    console.log('🔗 Supabase URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    console.log('📡 Supabase status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Supabase error:', errorText);
      return createResponse(response.status, {
        success: false,
        error: 'Supabase query failed',
        details: errorText
      });
    }
    
    const bookings = await response.json();
    console.log('✅ Bookings fetched:', bookings.length);
    
    // ✅ Log first booking to verify data
    if (bookings.length > 0) {
      console.log('📋 First booking:', {
        id: bookings[0].id,
        guest_name: bookings[0].guest_name,
        business_id: bookings[0].business_id
      });
    }
    
    return createResponse(200, {
      success: true,
      bookings: bookings,
      total_count: bookings.length,
      page: parseInt(event.queryStringParameters?.page || 1),
      limit: limit,
      total_pages: Math.ceil(bookings.length / limit)
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('📚 Stack:', err.stack);
    return createResponse(500, { success: false, error: err.message });
  }
};
