const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

console.log('🚀 Environment check:');
console.log('- SUPABASE_URL exists:', !!supabaseUrl);
console.log('- SUPABASE_SERVICE_KEY exists:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async function(event, context) {
  console.log("\n=== NEW REQUEST ===");
  console.log("Method:", event.httpMethod);
  
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
    const data = JSON.parse(event.body);
    console.log("✅ Received:", { 
      email: data.email, 
      hasPassword: !!data.password,
      tradingName: data.tradingName 
    });

    // Validate required fields
    if (!data.email || !data.password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and password required' })
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
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

    console.log("💾 Inserting business:", businessId);

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
    console.error('🔥 Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
