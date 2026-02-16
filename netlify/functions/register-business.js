import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function handler(event) {
  console.log("🚀 Register function started");
  
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
    console.log("✅ Received:", { email: data.email, hasPassword: !!data.password });

    // Validate required fields
    if (!data.email || !data.password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and password required' })
      };
    }

    // Check if email already exists
    console.log("🔍 Checking for existing email...");
    const { data: existing, error: checkError } = await supabase
      .from('businesses')
      .select('email')
      .eq('email', data.email)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Check error:', checkError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database error during check' })
      };
    }

    if (existing) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Email already registered' })
      };
    }

    // Hash password
    console.log("🔐 Hashing password...");
    const hashedPassword = await bcrypt.hash(data.password, 10);
    console.log("✅ Password hashed");

    // Prepare business data
    const businessId = uuidv4();
    const businessRecord = {
      id: businessId,
      registered_name: data.registeredName || '',
      business_number: data.businessNumber || '',
      trading_name: data.tradingName || '',
      phone: data.phone || '',
      email: data.email,
      password_hash: hashedPassword,
      physical_address: data.physicalAddress || {},
      postal_address: data.postalAddress || {},
      directors: data.directors || [],
      subscription_tier: data.subscriptionTier || 'monthly',
      payment_method: data.paymentMethod || 'card',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    console.log("💾 Inserting into Supabase...");

    const { data: business, error: insertError } = await supabase
      .from('businesses')
      .insert([businessRecord])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database insert failed',
          details: insertError.message
        })
      };
    }

    console.log("✅ Business created:", business.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        businessId: business.id,
        message: 'Registration successful!'
      })
    };

  } catch (error) {
    console.error('🔥 Fatal error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
}
