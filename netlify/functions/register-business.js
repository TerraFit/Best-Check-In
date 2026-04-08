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
    
    console.log('📝 Registration attempt:', { 
      email: business?.email,
      businessName: business?.trading_name
    });

    // Validate
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

    // Create Supabase admin client (bypasses all rate limits)
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Check if business already exists
    const { data: existing } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('email', business.email)
      .maybeSingle();

    if (existing) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'A business with this email already exists' })
      };
    }

    // Create user using Admin API (NO EMAIL CONFIRMATION, NO RATE LIMITS)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: business.email,
      password: password,
      email_confirm: true,  // Auto-confirm - no email sent
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

    // Calculate trial dates
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const businessId = uuidv4();

    // Create business record
    const { error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        id: businessId,
        user_id: newUser.user.id,
        trading_name: business.trading_name,
        registered_name: business.registered_name || business.trading_name,
        email: business.email,
        phone: business.phone,
        physical_address: business.physical_address || {},
        website: business.website || null,
        total_rooms: business.total_rooms || 0,
        avg_price: business.avg_price || 0,
        current_plan: business.plan || 'starter',
        max_rooms: business.max_rooms || 5,
        billing_cycle: business.billing_cycle || 'monthly',
        status: 'trial',
        trial_start: new Date().toISOString(),
        trial_end: trialEnd,
        next_billing_date: trialEnd,
        subscription_status: 'trial',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        newsletter_enabled: false
      });

    if (businessError) {
      console.error('Business insert error:', businessError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create business record' })
      };
    }

    console.log('✅ Business registered:', businessId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        businessId: businessId,
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
