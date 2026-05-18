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

    // REST API call to businesses table
    const response = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=id,trading_name,registered_name,email,phone,logo_url,hero_image_url,slogan,welcome_message,total_rooms,avg_price,physical_address,trial_end,subscription_status,newsletter_enabled,establishment_type,tgsa_grading,status,created_at`,
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

    // Consistent response shape: { success: true, data: business }
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
