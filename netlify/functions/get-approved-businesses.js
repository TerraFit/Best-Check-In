import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Validate environment variables
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
    console.log('📡 Creating Supabase client with WebSocket support...');
    
    // Create Supabase client WITH WebSocket support
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        realtime: { ws: ws },
        auth: { persistSession: false }
      }
    );

    console.log('📡 Fetching approved businesses...');
    
    const { data, error } = await supabase
      .from('businesses')
      .select(`
        id,
        trading_name,
        registered_name,
        legal_name,
        email,
        phone,
        status,
        created_at,
        approved_at,
        physical_address,
        subscription_tier,
        payment_status,
        logo_url,
        hero_image_url,
        slogan,
        establishment_type,
        tgsa_grading,
        directors,
        total_rooms,
        avg_price,
        service_paused,
        payment_due_date,
        last_payment_date
      `)
      .eq('status', 'approved')
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

    console.log(`✅ Found ${data?.length || 0} approved businesses`);
    
    // Process each business to add calculated fields
    const processedBusinesses = (data || []).map(business => {
      // Calculate days overdue if payment_due_date exists
      let days_overdue = 0;
      if (business.payment_due_date) {
        const dueDate = new Date(business.payment_due_date);
        const today = new Date();
        const diffTime = today.getTime() - dueDate.getTime();
        days_overdue = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
      
      // Determine payment status based on days overdue
      let payment_status = business.payment_status || 'paid';
      if (days_overdue >= 10) payment_status = 'critical';
      else if (days_overdue >= 5) payment_status = 'overdue';
      else if (days_overdue > 0) payment_status = 'pending';
      
      return {
        ...business,
        days_overdue,
        payment_status
      };
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(processedBusinesses)
    };
    
  } catch (error) {
    console.error('🔥 Unhandled error:', error);
    console.error('🔥 Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        data: [] 
      })
    };
  }
};
