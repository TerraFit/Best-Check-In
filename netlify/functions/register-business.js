import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function handler(event) {
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
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  try {
    console.log('📦 Received registration request');
    
    const data = JSON.parse(event.body);
    console.log('✅ Parsed data:', { 
      email: data.email,
      tradingName: data.tradingName,
      hasPassword: !!data.password
    });

    if (!data.email || !data.password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and password required' })
      };
    }

    // Check if email exists
    const { data: existing } = await supabase
      .from('businesses')
      .select('email')
      .eq('email', data.email)
      .maybeSingle();

    if (existing) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Email already registered' })
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    const businessId = uuidv4();
    
    // Prepare data EXACTLY matching your table schema
    const businessRecord = {
      id: businessId,
      registered_name: data.registeredName || '',
      business_number: data.businessNumber || '',
      trading_name: data.tradingName || '',
      phone: data.phone || '',
      email: data.email,
      password_hash: hashedPassword,
      physical_address: data.physicalAddress || { line1: '', city: '', province: '', postalCode: '', country: 'South Africa' },
      postal_address: data.postalAddress || { line1: '', city: '', province: '', postalCode: '', country: 'South Africa' },
      directors: data.directors || [],
      subscription_tier: data.subscriptionTier || 'monthly',
      payment_method: data.paymentMethod || 'card',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    console.log('💾 Inserting:', JSON.stringify(businessRecord, null, 2));

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
          error: 'Database error',
          details: insertError.message,
          code: insertError.code
        })
      };
    }

    console.log('✅ Business created:', business.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        businessId: business.id 
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
