import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { business, password } = JSON.parse(event.body || '{}');
    
    console.log('📝 Registration:', { 
      email: business?.email,
      businessName: business?.trading_name
    });

    if (!business || !business.email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and password are required' })
      };
    }

    if (password.length < 6) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password must be at least 6 characters' })
      };
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Check if business exists
    const { data: existing } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('email', business.email)
      .maybeSingle();

    if (existing) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email already registered' })
      };
    }

    // Create user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: business.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'business',
        business_name: business.trading_name
      }
    });

    if (createError) {
      console.error('Create user error:', createError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: createError.message })
      };
    }

    console.log('✅ User created:', newUser.user.id);

    // Calculate dates
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const businessId = uuidv4();
    
    // Generate a unique business number (you can adjust this format)
    const businessNumber = `REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create business record with ALL required fields
    const businessData = {
      id: businessId,
      user_id: newUser.user.id,
      business_number: businessNumber,  // ← ADD THIS - REQUIRED FIELD
      trading_name: business.trading_name,
      registered_name: business.registered_name || business.trading_name,
      email: business.email,
      phone: business.phone,
      physical_address: business.physical_address || {},
      total_rooms: business.total_rooms || 0,
      avg_price: business.avg_price || 0,
      status: 'pending',  // Changed from 'trial' to 'pending' if that's what your table expects
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Only add optional fields if they exist in the table
    if (business.plan) businessData.current_plan = business.plan;
    if (business.max_rooms) businessData.max_rooms = business.max_rooms;
    if (business.billing_cycle) businessData.billing_cycle = business.billing_cycle;
    if (trialEnd) businessData.trial_end = trialEnd;

    console.log('📝 Inserting business:', businessData);

    const { data: businessRecord, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert(businessData)
      .select()
      .single();

    if (businessError) {
      console.error('Business insert error:', businessError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create business record: ' + businessError.message })
      };
    }

    console.log('✅ Business registered:', businessId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        businessId: businessId,
        business: businessRecord,
        message: 'Registration successful'
      })
    };

  } catch (error) {
    console.error('Registration error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
