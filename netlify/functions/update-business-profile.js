// netlify/functions/update-business-profile.js
// Update establishment profile fields through the canonical server-side authorization model.
import auth from './_auth.cjs';

const { requireBusinessActor, resolveTenant, requireBusinessPermission, authFailure } = auth;

const EDITABLE_PROFILE_FIELDS = new Set([
  'trading_name', 'slogan', 'welcome_message',
  'email', 'secondary_email', 'phone', 'mobile_phone', 'secondary_phone', 'website',
  'total_rooms', 'avg_price', 'establishment_type', 'tgsa_grading', 'max_rooms',
  'logo_url', 'hero_image_url', 'physical_address', 'postal_address',
  'newsletter_enabled', 'newsletter_title', 'newsletter_prize', 'newsletter_cta',
  'newsletter_terms', 'newsletter_draw_date', 'newsletter_share_text',
  'marketing_consent_enabled', 'directors', 'updated_at'
]);

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };

  const authentication = requireBusinessActor(event);
  if (!authentication.ok) return authFailure(authentication, headers);

  if (!requireBusinessPermission(authentication.principal, 'canManageSettings')) {
    return authFailure({ status: 403, error: 'Missing permission: canManageSettings' }, headers);
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { businessId, ...fields } = body;
    const tenant = resolveTenant(authentication.principal, businessId);
    if (!tenant.ok) return authFailure(tenant, headers);

    // Platform-controlled commercial/status fields must not be changed through the normal profile endpoint.
    const filteredFields = {};
    for (const [key, value] of Object.entries(fields)) {
      if (!EDITABLE_PROFILE_FIELDS.has(key) || value === undefined) continue;
      filteredFields[key] = value;
    }

    if (Object.keys(filteredFields).length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'No editable profile fields supplied' }) };
    }

    filteredFields.updated_at = new Date().toISOString();

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(tenant.businessId)}`, {
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
      console.error('Business profile update failed:', response.status, responseText);
      if (response.status === 404) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Business not found' }) };
      throw new Error(`HTTP ${response.status}`);
    }

    let updatedBusinesses;
    try { updatedBusinesses = responseText ? JSON.parse(responseText) : []; }
    catch { throw new Error('Business update returned an invalid database response'); }

    if (!Array.isArray(updatedBusinesses) || updatedBusinesses.length !== 1) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Business profile could not be updated' }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Profile updated successfully', updatedFields: Object.keys(filteredFields), data: updatedBusinesses[0] })
    };
  } catch (error) {
    console.error('Error updating business profile:', error?.message || error);
    if (error instanceof SyntaxError) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid JSON in request body' }) };
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Failed to update business profile' }) };
  }
};
