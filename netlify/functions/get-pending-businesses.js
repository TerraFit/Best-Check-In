import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  // Log environment variables
  console.log('🔍 SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
  console.log('🔍 SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_KEY);
  console.log('🔍 ws module available:', typeof ws === 'function');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Configuration error',
        details: 'Missing Supabase credentials',
        data: []
      })
    };
  }

  try {
    // CRITICAL: Create Supabase client WITH WebSocket support
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        realtime: {
          ws: ws  // THIS IS THE KEY FIX
        },
        auth: {
          persistSession: false
        }
      }
    );
    
    console.log('✅ Supabase client created with WebSocket support');
    
    // Fetch ALL pending businesses with complete data
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select(`
        id,
        registered_name,
        business_number,
        trading_name,
        phone,
        email,
        physical_address,
        postal_address,
        directors,
        subscription_tier,
        payment_method,
        status,
        total_rooms,
        avg_price,
        seasons,
        setup_complete,
        approved_at,
        created_at
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database error', 
          details: error.message,
          data: []
        })
      };
    }

    // Log what we're sending back
    console.log(`✅ Found ${businesses?.length || 0} pending businesses`);
    if (businesses && businesses.length > 0) {
      console.log('📸 First business:', {
        id: businesses[0].id,
        trading_name: businesses[0].trading_name,
        has_directors: !!businesses[0].directors,
        directors_count: businesses[0].directors?.length || 0
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(businesses || [])
    };

  } catch (error) {
    console.error('🔥 Unhandled error:', error);
    console.error('🔥 Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        data: []
      })
    };
  }
};
