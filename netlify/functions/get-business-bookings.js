// netlify/functions/get-business-bookings.js
// ✅ PRODUCTION VERSION - Real Supabase data

console.log('📦📦📦 PRODUCTION VERSION - REAL SUPABASE DATA 📦📦📦');

const jwt = require('jsonwebtoken');

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
  console.log('🔵 PRODUCTION HANDLER - Real Supabase data');
  console.log('📡 Method:', event.httpMethod);
  console.log('📡 Query:', event.queryStringParameters);
  
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(204, {});
  }
  
  if (event.httpMethod !== 'GET') {
    return createResponse(405, { success: false, error: 'Method Not Allowed' });
  }
  
  try {
    const targetBusinessId = event.queryStringParameters?.businessId;
    console.log('🎯 Target business ID:', targetBusinessId);
    
    if (!targetBusinessId) {
      return createResponse(400, { success: false, error: 'Business ID required' });
    }
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return createResponse(500, { success: false, error: 'Server configuration error' });
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
    console.log('✅ Real bookings fetched:', bookings.length);
    
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
    return createResponse(500, { success: false, error: err.message });
  }
};
