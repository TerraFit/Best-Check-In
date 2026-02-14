import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function handler(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { businessId } = JSON.parse(event.body);

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID required' })
      };
    }

    // Get business details
    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (fetchError || !business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Business not found' })
      };
    }

    // Generate setup token
    const setupToken = uuidv4();
    const setupLink = `https://fastcheckin.netlify.app/setup/${setupToken}`;

    // Save token to database
    const { error: tokenError } = await supabase
      .from('setup_tokens')
      .insert([{
        token: setupToken,
        business_id: businessId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }]);

    if (tokenError) {
      console.error('❌ Token error:', tokenError);
    }

    // For now, just return the setup link
    // Later you'll integrate Resend to actually send emails
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Credentials ready',
        setupLink: setupLink,
        // In production, you'd send this via email instead of returning it
        note: 'This link would be emailed to the business owner'
      })
    };

  } catch (error) {
    console.error('🔥 Unhandled error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
}
