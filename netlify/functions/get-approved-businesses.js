import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle preflight
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

  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Configuration error', data: [] })
    };
  }

  try {
    console.log('📡 Creating Supabase client with WebSocket support...');
    console.log('📡 ws module available:', typeof ws === 'function');
    
    // CRITICAL: Create client with WebSocket transport option
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        realtime: {
          ws: ws  // THIS IS THE KEY FIX - provide the ws module
        },
        auth: {
          persistSession: false
        }
      }
    );

    console.log('📡 Fetching approved businesses...');
    const { data, error } = await supabase
      .from('businesses')
      .select('id, trading_name, registered_name, email, phone, status, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message, data: [] })
      };
    }

    console.log(`✅ Found ${data?.length || 0} approved businesses`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data || [])
    };
  } catch (error) {
    console.error('🔥 Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message, data: [] })
    };
  }
};
