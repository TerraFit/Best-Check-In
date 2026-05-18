export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
    };
  }

  try {
    const businessId = event.queryStringParameters?.id;
    
    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Business ID required' })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Server configuration error' })
      };
    }

    // REST API call with ALL fields (no lines lost!)
    const response = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=id,trading_name,registered_name,legal_name,email,phone,fixed_phone,website,logo_url,hero_image_url,slogan,welcome_message,total_rooms,avg_price,physical_address,postal_address,physical_address_locked,trial_start,trial_end,subscription_status,subscription_tier,payment_status,payment_method,last_payment_date,payment_due_date,establishment_type,tgsa_grading,tgsa_accredited,tgsa_rating,status,created_at,approved_at,updated_at,service_paused,setup_complete,newsletter_enabled,newsletter_title,newsletter_prize,newsletter_cta,newsletter_terms,newsletter_draw_date,newsletter_share_text,primary_color,secondary_color,registration_number,business_number,vat_number,stripe_customer_id,stripe_subscription_id,max_rooms,seasons,custom_trial_days`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const business = data[0];

    if (!business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Business not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: business
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Internal server error', 
        message: error.message 
      })
    };
  }
};
