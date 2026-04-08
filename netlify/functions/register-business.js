import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

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
      hasPassword: !!password,
      tradingName: business?.trading_name
    });

    // Validate required fields
    if (!business) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business data required' })
      };
    }

    if (!business.email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    if (!password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password is required' })
      };
    }

    if (password.length < 6) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password must be at least 6 characters' })
      };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Check if business already exists
    const { data: existingBusiness } = await supabase
      .from('businesses')
      .select('id')
      .eq('email', business.email)
      .single();

    if (existingBusiness) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'A business with this email already exists' })
      };
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email: business.email,
      password: password,
      options: {
        data: {
          role: 'business',
          business_name: business.trading_name
        }
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create user account: ' + authError.message })
      };
    }

    // Create business record
    const businessId = uuidv4();
    const trialStart = business.trial_start || new Date().toISOString();
    const trialEnd = business.trial_end || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .insert({
        id: businessId,
        user_id: authUser.user?.id,
        trading_name: business.trading_name,
        registered_name: business.registered_name || business.trading_name,
        email: business.email,
        phone: business.phone,
        physical_address: business.physical_address,
        website: business.website || null,
        total_rooms: business.total_rooms || 0,
        avg_price: business.avg_price || 0,
        current_plan: business.plan || 'starter',
        max_rooms: business.max_rooms || 5,
        billing_cycle: business.billing_cycle || 'monthly',
        status: business.status || 'trial',
        trial_start: trialStart,
        trial_end: trialEnd,
        next_billing_date: business.next_billing_date || trialEnd,
        subscription_status: 'trial',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
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

    console.log('✅ Business registered successfully:', businessId);

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
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message || 'Unknown error'
      })
    };
  }
};
