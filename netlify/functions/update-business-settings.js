// netlify/functions/update-business-settings.js
import { createClient } from '@supabase/supabase-js';

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { businessId, marketing_consent_enabled } = JSON.parse(event.body);

    if (!businessId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Business ID required' }) };
    }

    if (typeof marketing_consent_enabled !== 'boolean') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'marketing_consent_enabled must be a boolean' }) };
    }

    const { error } = await supabase
      .from('businesses')
      .update({
        marketing_consent_enabled: marketing_consent_enabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId);

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Settings updated successfully',
        marketing_consent_enabled
      })
    };

  } catch (error) {
    console.error('Error updating business settings:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to update settings' })
    };
  }
};
