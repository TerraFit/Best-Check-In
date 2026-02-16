import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

console.log('🚀 Environment check:');
console.log('- SUPABASE_URL exists:', !!supabaseUrl);
console.log('- SUPABASE_SERVICE_KEY exists:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

export async function handler(event) {
  console.log("\n=== NEW REQUEST ===");
  console.log("Method:", event.httpMethod);
  console.log("Headers:", JSON.stringify(event.headers, null, 2));
  console.log("Raw body:", event.body);
  
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
    // Parse and log the complete request
    const data = JSON.parse(event.body);
    console.log("✅ PARSED DATA:", JSON.stringify(data, null, 2));
    
    // Check specifically for password
    console.log("🔑 Password field present:", !!data.password);
    console.log("🔑 Password length:", data.password?.length || 0);

    // Validate required fields
    const missing = [];
    if (!data.email) missing.push('email');
    if (!data.password) missing.push('password');
    if (!data.registeredName) missing.push('registeredName');
    
    if (missing.length > 0) {
      console.log("❌ Missing fields:", missing);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields', 
          missing 
        })
      };
    }

    // If we get here, data is valid
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: "Validation passed!",
        receivedEmail: data.email
      })
    };

  } catch (error) {
    console.error("🔥 Parse error:", error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON', details: error.message })
    };
  }
}
