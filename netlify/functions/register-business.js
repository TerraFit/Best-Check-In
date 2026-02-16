import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

console.log("🚀 Initializing function with ENV vars:");
console.log("- SUPABASE_URL exists:", !!supabaseUrl);
console.log("- SUPABASE_SERVICE_KEY exists:", !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function handler(event) {
  console.log("📡 Function invoked with method:", event.httpMethod);
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    console.log("📦 Parsing request body...");
    const data = JSON.parse(event.body);
    console.log("✅ Received data:", { email: data.email, tradingName: data.tradingName });

    // Test database connection first
    console.log("🔍 Testing database connection...");
    const { error: testError } = await supabase.from('businesses').select('count', { count: 'exact', head: true });
    
    if (testError) {
      console.error("❌ Database connection failed:", testError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database connection failed', details: testError.message })
      };
    }
    console.log("✅ Database connection successful");

    // Your insert logic here...
    // (Keep your existing insert code)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Registration successful' })
    };

  } catch (error) {
    console.error("🔥 Fatal error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
}
