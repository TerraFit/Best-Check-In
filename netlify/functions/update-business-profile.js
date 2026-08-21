// netlify/functions/update-business-profile.js
// Update business profile fields through the service-role REST API.

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };

  try {
    const body = JSON.parse(event.body || '{}');
    const { businessId, ...fields } = body;
    if (!businessId) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Business ID required' }) };

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };

    fields.updated_at = new Date().toISOString();

    const ALLOWED_FIELDS = [
      'trading_name', 'registered_name', 'legal_name', 'slogan', 'welcome_message',
      'email', 'secondary_email', 'phone', 'mobile_phone', 'secondary_phone', 'website',
      'total_rooms', 'avg_price', 'establishment_type', 'tgsa_grading', 'max_rooms',
      'logo_url', 'hero_image_url', 'physical_address', 'postal_address',
      'subscription_tier', 'current_plan', 'billing_cycle', 'service_paused',
      'newsletter_enabled', 'newsletter_title', 'newsletter_prize', 'newsletter_cta',
      'newsletter_terms', 'newsletter_draw_date', 'newsletter_share_text',
      'marketing_consent_enabled', 'directors', 'updated_at'
    ];

    const filteredFields = {};
    for (const [key, value] of Object.entries(fields)) {
      if (!ALLOWED_FIELDS.includes(key)) {
        console.warn(`⚠️ Skipping unknown field: ${key}`);
        continue;
      }
      // Empty strings are intentional for editable contact fields: an owner may clear a value.
      // Only undefined is omitted. Null is preserved where the database accepts it.
      if (value !== undefined) filteredFields[key] = value;
    }

    if (Object.keys(filteredFields).length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'No valid fields to update' }) };
    }

    console.log('📝 Updating business:', businessId);
    console.log('📝 Fields to update:', Object.keys(filteredFields));

    const response = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(businessId)}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(filteredFields)
    });

    const responseText = await response.text();
    if (!response.ok) {
      console.error('❌ Update error:', response.status, responseText);
      if (response.status === 404) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Business not found' }) };
      if (response.status === 401 || response.status === 403) return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Unauthorized - Invalid API key' }) };
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }

    let updatedBusinesses = [];
    try { updatedBusinesses = responseText ? JSON.parse(responseText) : []; } catch (parseError) {
      throw new Error('Business update returned an invalid database response');
    }

    // Supabase can return HTTP 200 even when an UPDATE matched zero rows.
    // Never report success unless the targeted business row was actually returned.
    if (!Array.isArray(updatedBusinesses) || updatedBusinesses.length !== 1) {
      console.error('❌ Business update matched no row:', { businessId, responseText });
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Business profile could not be updated', details: 'No matching business record was updated' }) };
    }

    const updatedBusiness = updatedBusinesses[0];
    console.log('✅ Business updated successfully:', businessId, Object.keys(filteredFields));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Profile updated successfully',
        updatedFields: Object.keys(filteredFields),
        data: updatedBusiness
      })
    };
  } catch (error) {
    console.error('❌ Error updating business profile:', error);
    if (error instanceof SyntaxError) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid JSON in request body' }) };
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message || 'Failed to update business profile' }) };
  }
};