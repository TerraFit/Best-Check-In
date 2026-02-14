import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function handler(event) {
  // Always return JSON, even on error
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    console.log('📦 Received registration request');
    
    // Parse request body
    const data = JSON.parse(event.body);
    console.log('✅ Parsed data:', { 
      email: data.email,
      tradingName: data.tradingName,
      hasPassword: !!data.password
    });

    // Validate required fields
    if (!data.email || !data.password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          details: 'Email and password are required'
        })
      };
    }

    // Check if email already exists
    const { data: existing, error: checkError } = await supabase
      .from('businesses')
      .select('email')
      .eq('email', data.email)
      .maybeSingle();

    if (existing) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ 
          error: 'Email already registered',
          details: 'This email is already in use'
        })
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    console.log('🔐 Password hashed');

    // Prepare business data
    const businessId = uuidv4();
    const businessRecord = {
      id: businessId,
      registered_name: data.registeredName,
      business_number: data.businessNumber,
      trading_name: data.tradingName,
      phone: data.phone,
      email: data.email,
      password_hash: hashedPassword,
      physical_address: data.physicalAddress,
      postal_address: data.sameAsPhysical ? data.physicalAddress : data.postalAddress,
      directors: data.directors || [],
      subscription_tier: 'trial',
      payment_method: 'pending',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    console.log('💾 Saving to Supabase...');

    // Insert into database
    const { data: business, error: insertError } = await supabase
      .from('businesses')
      .insert([businessRecord])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Supabase error:', insertError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database error',
          details: insertError.message,
          code: insertError.code
        })
      };
    }

    console.log('✅ Business created:', business.id);

    // Return success
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        businessId: business.id,
        message: 'Registration successful! Please check your email.'
      })
    };

  } catch (error) {
    console.error('🔥 Unhandled error:', error);
    console.error('Stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      })
    };
  }
}
