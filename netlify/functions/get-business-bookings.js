// netlify/functions/get-business-bookings.js
// ✅ FINAL DIAGNOSTIC: Logs everything, safe for production (no stack trace exposed)

console.log('🚀🚀🚀 get-business-bookings FUNCTION LOADED 🚀🚀🚀');
console.log('📦 Node version:', process.version);
console.log('🌐 fetch available:', typeof fetch === 'function' ? '✅ YES' : '❌ NO');

const jwt = require('jsonwebtoken');

console.log('✅ jwt loaded successfully');

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

console.log('✅ createResponse defined');

// ✅ Safe error logger
const logError = (message, error) => {
  console.error(`❌ ${message}:`, error?.message || error);
  if (error?.stack) {
    console.error('📚 Stack trace:', error.stack);
  }
};

exports.handler = async (event) => {
  console.log('🔵🔵🔵 HANDLER STARTED 🔵🔵🔵');
  console.log('📡 HTTP Method:', event.httpMethod);
  console.log('📡 Query params:', event.queryStringParameters);
  console.log('📡 Headers present:', {
    authorization: !!event.headers.authorization,
    'content-type': event.headers['content-type'] || 'not set'
  });
  
  try {
    console.log('🔵 Step 1: Checking OPTIONS...');
    if (event.httpMethod === 'OPTIONS') {
      console.log('✅ OPTIONS request - returning 204');
      return createResponse(204, {});
    }
    
    console.log('🔵 Step 2: Checking GET...');
    if (event.httpMethod !== 'GET') {
      console.log('❌ Not GET - returning 405');
      return createResponse(405, { success: false, error: 'Method Not Allowed' });
    }
    
    console.log('🔵 Step 3: Getting auth token...');
    const token = event.headers.authorization?.replace('Bearer ', '');
    console.log('🔑 Token present:', !!token);
    console.log('🔑 Token length:', token?.length || 0);
    
    if (!token) {
      console.log('❌ No token - returning 401');
      return createResponse(401, { success: false, error: 'No authorization token provided' });
    }
    
    console.log('🔵 Step 4: Verifying JWT...');
    console.log('🔐 JWT_SECRET present:', !!process.env.SUPABASE_JWT_SECRET);
    console.log('🔐 JWT_SECRET length:', process.env.SUPABASE_JWT_SECRET?.length || 0);
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
      console.log('✅ JWT verified successfully');
      console.log('📋 Decoded sub:', decoded.sub);
      console.log('📋 Decoded user_metadata:', JSON.stringify(decoded.user_metadata));
    } catch (err) {
      logError('JWT verification failed', err);
      return createResponse(401, { success: false, error: 'Invalid token' });
    }
    
    console.log('🔵 Step 5: Getting business ID...');
    const businessIdFromToken = decoded.user_metadata?.business_id;
    const { businessId: businessIdFromQuery, limit = 25, page = 1 } = event.queryStringParameters || {};
    const targetBusinessId = businessIdFromQuery || businessIdFromToken;
    
    console.log('🏢 Business ID from token:', businessIdFromToken);
    console.log('🏢 Business ID from query:', businessIdFromQuery);
    console.log('🎯 Target business ID:', targetBusinessId);
    
    if (!targetBusinessId) {
      console.log('❌ No business ID - returning 400');
      return createResponse(400, { success: false, error: 'Missing businessId parameter' });
    }
    
    console.log('🔵 Step 6: Getting Supabase credentials...');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    console.log('🔗 SUPABASE_URL present:', !!supabaseUrl);
    console.log('🔑 SUPABASE_SERVICE_KEY present:', !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Missing credentials - returning 500');
      logError('Missing Supabase credentials', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
      return createResponse(500, { success: false, error: 'Server configuration error' });
    }
    
    console.log('🔵 Step 7: Building URL...');
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const url = `${supabaseUrl}/rest/v1/bookings?business_id=eq.${targetBusinessId}&order=check_in_date.desc&limit=${limit}&offset=${offset}`;
    
    console.log('🔗 URL:', url);
    console.log('📊 Limit:', limit);
    console.log('📊 Offset:', offset);
    
    console.log('🔵 Step 8: Fetching from Supabase...');
    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    console.log('📡 Supabase response status:', response.status);
    console.log('📡 Supabase response ok:', response.ok);
    console.log('📡 Supabase response statusText:', response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Supabase error response:', errorText);
      logError('Supabase query failed', { status: response.status, body: errorText });
      return createResponse(response.status, {
        success: false,
        error: 'Supabase query failed',
        status: response.status
      });
    }
    
    console.log('🔵 Step 9: Parsing response...');
    const bookings = await response.json();
    console.log(`✅ Bookings fetched: ${bookings.length}`);
    
    if (bookings.length > 0) {
      console.log('📋 First booking:', {
        id: bookings[0]?.id,
        guest_name: bookings[0]?.guest_name,
        status: bookings[0]?.status,
        business_id: bookings[0]?.business_id
      });
    }
    
    console.log('🔵 Step 10: Returning response...');
    return createResponse(200, {
      success: true,
      bookings: bookings,
      total_count: bookings.length,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(bookings.length / parseInt(limit))
    });
    
  } catch (err) {
    console.error('❌❌❌ CATASTROPHIC ERROR ❌❌❌');
    logError('Unhandled exception', err);
    return createResponse(500, {
      success: false,
      error: 'Internal server error'
    });
  }
};

console.log('✅✅✅ FUNCTION DEFINITION COMPLETE ✅✅✅');
