import { createClient } from '@supabase/supabase-js';

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

  // Log environment variables (without exposing full values)
  console.log('🔍 SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
  console.log('🔍 SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_KEY);
  
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
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    console.log('✅ Supabase client created');
    
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
      console.log('📸 Sample director data:', businesses[0].directors.map(d => ({
        name: d.name,
        idNumber: d.idNumber,
        hasIdPhoto: !!d.idPhoto,
        idPhotoLength: d.idPhoto?.length || 0
      })));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(businesses || [])
    };

  } catch (error) {
    console.error('🔥 Unhandled error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        data: []
      })
    };
  }
};
