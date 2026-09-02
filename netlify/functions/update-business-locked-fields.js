// netlify/functions/update-business-locked-fields.js
// Platform-only update path for fields that are intentionally outside normal business profile editing.
import auth from './_auth.cjs';

const { requirePlatformActor, requirePlatformPermission, resolveTenant, authFailure } = auth;

// Keep this endpoint deliberately narrow. Subscription, service state and legal identity
// are platform-controlled and must never be accepted through the normal profile endpoint.
const LOCKED_FIELDS = new Set([
  'registered_name', 'legal_name',
  'subscription_tier', 'current_plan', 'billing_cycle', 'service_paused',
  'status', 'trial_end', 'subscription_status'
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

  const authentication = requirePlatformActor(event);
  if (!authentication.ok) return authFailure(authentication, headers);
  if (!requirePlatformPermission(authentication.principal, 'platform:businesses:write')) {
    return authFailure({ status: 403, error: 'Missing permission: platform:businesses:write' }, headers);
  }

  try {
    const { businessId, updates, reason } = JSON.parse(event.body || '{}');
    const tenant = resolveTenant(authentication.principal, businessId);
    if (!tenant.ok) return authFailure(tenant, headers);

    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'updates object required' }) };
    }

    const updateData = {};
    for (const [key, value] of Object.entries(updates)) {
      if (!LOCKED_FIELDS.has(key) || value === undefined) continue;
      updateData[key] = value;
    }
    if (Object.keys(updateData).length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'No permitted locked fields supplied' }) };
    }
    updateData.updated_at = new Date().toISOString();

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
      body: JSON.stringify(updateData)
    });

    const responseText = await response.text();
    if (!response.ok) {
      console.error('Locked business update failed:', response.status, responseText);
      throw new Error(`HTTP ${response.status}`);
    }

    let result;
    try { result = responseText ? JSON.parse(responseText) : []; }
    catch { throw new Error('Business update returned an invalid database response'); }

    if (!Array.isArray(result) || result.length !== 1) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Business information could not be updated' }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result[0],
        updatedFields: Object.keys(updateData).filter((key) => key !== 'updated_at'),
        reason: typeof reason === 'string' ? reason.slice(0, 500) : undefined,
        message: 'Business information updated successfully'
      })
    };
  } catch (error) {
    console.error('Error updating locked business fields:', error?.message || error);
    if (error instanceof SyntaxError) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid JSON in request body' }) };
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Failed to update business information' }) };
  }
};
