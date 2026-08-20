// netlify/functions/get-business-branding.js
// Returns the complete business profile required by the business dashboard.

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };
  }

  try {
    const businessId = event.queryStringParameters?.id;
    if (!businessId) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Business ID required' }) };

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };
    }

    const select = [
      'id', 'trading_name', 'registered_name', 'legal_name', 'email', 'secondary_email',
      'phone', 'mobile_phone', 'secondary_phone', 'directors', 'logo_url', 'hero_image_url',
      'slogan', 'welcome_message', 'total_rooms', 'avg_price', 'physical_address',
      'postal_address', 'trial_end', 'subscription_status', 'subscription_tier', 'current_plan',
      'billing_cycle', 'establishment_type', 'tgsa_grading', 'status', 'created_at',
      'service_paused', 'setup_complete', 'primary_color', 'secondary_color',
      'newsletter_enabled', 'newsletter_title', 'newsletter_prize', 'newsletter_cta',
      'newsletter_terms', 'newsletter_draw_date', 'newsletter_share_text'
    ].join(',');

    const response = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(businessId)}&select=${select}`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' } }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase error:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const business = data[0];
    if (!business) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Business not found' }) };

    return { statusCode: 200, headers, body: JSON.stringify(business) };
  } catch (error) {
    console.error('Function error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error', message: error.message }) };
  }
};
