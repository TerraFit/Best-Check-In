// netlify/functions/get-business-branding.js
// Public check-in branding endpoint. Keep this response strictly limited to
// fields required to render the guest-facing check-in experience.

const PUBLIC_BRANDING_FIELDS = [
  'id', 'trading_name', 'logo_url', 'hero_image_url', 'slogan', 'welcome_message',
  'primary_color', 'secondary_color', 'newsletter_enabled', 'newsletter_title',
  'newsletter_prize', 'newsletter_cta', 'newsletter_terms', 'newsletter_draw_date',
  'newsletter_share_text'
];

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };
  }

  try {
    const businessId = event.queryStringParameters?.id;
    if (!businessId) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Business ID required' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };
    }

    // IMPORTANT: this endpoint is intentionally public for QR check-in.
    // Never add private business/contact/subscription/director fields here.
    const select = PUBLIC_BRANDING_FIELDS.join(',');
    const response = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(businessId)}&select=${select}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Business branding lookup failed:', response.status, errorText);
      return { statusCode: 502, headers, body: JSON.stringify({ success: false, error: 'Failed to load branding' }) };
    }

    const data = await response.json();
    const business = data[0];
    if (!business) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Business not found' }) };
    }

    // Defense in depth: never echo unexpected columns even if an upstream
    // data source returns more fields than requested by the SELECT clause.
    const publicBusiness = Object.fromEntries(
      PUBLIC_BRANDING_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(business, field))
        .map((field) => [field, business[field]])
    );

    return { statusCode: 200, headers, body: JSON.stringify(publicBusiness) };
  } catch (error) {
    console.error('Business branding function error:', error?.message || 'unknown error');
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal server error' }) };
  }
};
