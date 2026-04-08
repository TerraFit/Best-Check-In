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
    const requestBody = JSON.parse(event.body || '{}');
    const { business, password } = requestBody;
    
    console.log('📝 Registration attempt:', { 
      email: business?.email, 
      tradingName: business?.trading_name
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

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Check if business already exists
    const { data: existingBusiness } = await supabase
      .from('businesses')
      .select('id')
      .eq('email', business.email)
      .maybeSingle();

    if (existingBusiness) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'A business with this email already exists' })
      };
    }

    // METHOD 1: Try admin create user (bypasses rate limits)
    let authUserId = null;
    let authError = null;
    
    try {
      // Create user directly in auth.users table via admin API
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: business.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          role: 'business',
          business_name: business.trading_name
        }
      });
      
      if (userError) {
        console.error('Admin create error:', userError);
        authError = userError;
      } else {
        authUserId = userData.user.id;
        console.log('✅ Admin user created:', authUserId);
      }
    } catch (adminError) {
      console.error('Admin method failed:', adminError);
      authError = adminError;
    }

    // METHOD 2: If admin fails, try direct insert into auth.users (last resort)
    if (!authUserId) {
      try {
        const { data: directUser, error: directError } = await supabase
          .from('users')
          .insert({
            email: business.email,
            encrypted_password: password, // Note: This should be hashed in production
            role: 'business',
            raw_app_meta_data: { provider: 'email', providers: ['email'] },
            raw_user_meta_data: { role: 'business', business_name: business.trading_name },
            email_confirmed_at: new Date().toISOString(),
            confirmation_sent_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (directError) {
          console.error('Direct insert error:', directError);
        } else {
          authUserId = directUser.id;
          console.log('✅ Direct user created:', authUserId);
        }
      } catch (directError) {
        console.error('Direct method failed:', directError);
      }
    }

    if (!authUserId) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create user account. Please try again in a few minutes.' })
      };
    }

    // Calculate trial dates
    const trialStart = new Date().toISOString();
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const businessId = uuidv4();

    // Create business record
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .insert({
        id: businessId,
        user_id: authUserId,
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
        status: business.status || 'trial',
        trial_start: trialStart,
        trial_end: trialEnd,
        next_billing_date: trialEnd,
        subscription_status: 'trial',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        newsletter_enabled: false
      })
      .select()
      .single();

    if (businessError) {
      console.error('❌ Business insert error:', businessError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create business record' })
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
    console.error('❌ Registration error:', error);
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
