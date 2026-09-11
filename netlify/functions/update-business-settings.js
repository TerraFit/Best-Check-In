// netlify/functions/update-business-settings.js
import { createClient } from '@supabase/supabase-js';
import auth from './_auth.cjs';

const { requireBusinessActor, resolveTenant, requireBusinessPermission, authFailure } = auth;

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const authentication = requireBusinessActor(event);
  if (!authentication.ok) return authFailure(authentication, headers);

  if (!requireBusinessPermission(authentication.principal, 'canManageSettings')) {
    return authFailure({ status: 403, error: 'Missing permission: canManageSettings' }, headers);
  }

  try {
    const { businessId, marketing_consent_enabled } = JSON.parse(event.body || '{}');
    const tenant = resolveTenant(authentication.principal, businessId);
    if (!tenant.ok) return authFailure(tenant, headers);

    if (typeof marketing_consent_enabled !== 'boolean') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'marketing_consent_enabled must be a boolean' }) };
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { error } = await supabase
      .from('businesses')
      .update({ marketing_consent_enabled, updated_at: new Date().toISOString() })
      .eq('id', tenant.businessId);

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Settings updated successfully', marketing_consent_enabled })
    };
  } catch (error) {
    console.error('Error updating business settings:', error?.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update settings' }) };
  }
};
