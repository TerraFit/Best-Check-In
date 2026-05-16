import { createClient } from '@supabase/supabase-js';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  // Log everything for debugging
  console.log('🚀 Function started');
  console.log('📡 HTTP Method:', event.httpMethod);
  console.log('🔑 SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
  console.log('🔑 SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_KEY);
  
  // Check environment variables first
  if (!process.env.SUPABASE_URL) {
    console.error('❌ SUPABASE_URL is missing');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'SUPABASE_URL environment variable is not set' })
    };
  }
  
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY is missing');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'SUPABASE_SERVICE_KEY environment variable is not set' })
    };
  }

  try {
    console.log('📡 Creating Supabase client...');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    console.log('✅ Supabase client created');

    console.log('📡 Executing query...');
    const { data, error } = await supabase
      .from('businesses')
      .select('id, trading_name, registered_name, email, phone, status')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase query error:', error);
      throw error;
    }

    console.log(`✅ Query successful, found ${data?.length || 0} businesses`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data || [])
    };
  } catch (error) {
    console.error('🔥 Catch block error:', error);
    console.error('🔥 Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        type: error.name 
      })
    };
  }
};
