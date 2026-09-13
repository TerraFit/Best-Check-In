// netlify/functions/update-business-profile.js
// Update establishment profile fields through the canonical server-side authorization model.
import auth from './_auth.cjs';

const { requireBusinessActor, resolveTenant, requireBusinessPermission, authFailure } = auth;

const EDITABLE_PROFILE_FIELDS = new Set([
  'trading_name', 'slogan', 'welcome_message',
  'email', 'secondary_email', 'phone', 'mobile_phone', 'secondary_phone', 'website',
  'total_rooms', 'avg_price', 'establishment_type', 'tgsa_grading',
  'logo_url', 'hero_image_url', 'physical_address', 'postal_address',
  'newsletter_enabled', 'newsletter_title', 'newsletter_prize', 'newsletter_cta',
  'newsletter_terms', 'newsletter_draw_date', 'newsletter_share_text',
  'marketing_consent_enabled', 'directors'
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

    // max_rooms is a platform-controlled licensing ceiling. It is deliberately not
    // editable through the normal business profile endpoint.
    const filteredFields = {};
    for (const [key, value] of Object.entries(fields)) {
      if (!EDITABLE_PROFILE_FIELDS.has(key) || value === undefined) continue;
      filteredFields[key] = value;
    }

    if (Object.keys(filteredFields).length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'No editable profile fields supplied' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };
    }

    // When total_rooms is being changed, read the licensed ceiling from the authoritative
    // tenant row before allowing the mutation. Never trust a client-supplied max_rooms.
    if (Object.prototype.hasOwnProperty.call(filteredFields, 'total_rooms')) {
      const requestedTotalRooms = Number(filteredFields.total_rooms);
      if (!Number.isInteger(requestedTotalRooms) || requestedTotalRooms < 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'total_rooms must be a non-negative integer' }) };
      }
      filteredFields.total_rooms = requestedTotalRooms;

      const licenseResponse = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(tenant.businessId)}&select=id,max_rooms`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      });
      if (!licenseResponse.ok) {
        const licenseError = await licenseResponse.text();
        console.error('Business room license lookup failed:', licenseResponse.status, licenseError);
        return { statusCode: 502, headers, body: JSON.stringify({ success: false, error: 'Failed to load room license', code: 'ROOM_LICENSE_LOOKUP_FAILED' }) };
      }

      const licenseRows = await licenseResponse.json();
      const license = Array.isArray(licenseRows) ? licenseRows[0] : null;
      if (!license || license.id !== tenant.businessId) {
        return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Business not found' }) };
      }

      const maxRooms = license.max_rooms === null || license.max_rooms === undefined ? null : Number(license.max_rooms);
      if (maxRooms !== null && (!Number.isInteger(maxRooms) || maxRooms < 0)) {
        console.error('Invalid room license configuration for business:', tenant.businessId);
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Invalid room license configuration', code: 'ROOM_LICENSE_INVALID' }) };
      }
      if (maxRooms !== null && requestedTotalRooms > maxRooms) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Room limit reached. Upgrade your plan to add more rooms.',
            code: 'ROOM_LIMIT_REACHED',
            totalRooms: requestedTotalRooms,
            maxRooms,
          })
        };
      }
    }

    // Do not force an updated_at column here. The profile mutation must depend only on
    // columns that are actually being edited; database triggers can manage timestamps.
    const response = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(tenant.businessId)}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(filteredFields)
    });

    const responseText = await response.text();
    if (!response.ok) {
      console.error('Business profile update failed:', response.status, responseText);
      if (response.status === 404) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Business not found' }) };
      return { statusCode: 502, headers, body: JSON.stringify({ success: false, error: 'Business profile could not be updated' }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Profile updated successfully',
        updatedFields: Object.keys(filteredFields)
      })
    };
  } catch (error) {
    console.error('Error updating business profile:', error?.message || error);
    if (error instanceof SyntaxError) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid JSON in request body' }) };
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Failed to update business profile' }) };
  }
};