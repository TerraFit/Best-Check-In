import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { business_id, email, guest_name } = JSON.parse(event.body || '{}');

    if (!business_id || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID and email are required' })
      };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Get business name for response
    const { data: business } = await supabase
      .from('businesses')
      .select('trading_name')
      .eq('id', business_id)
      .single();

    // Insert or ignore duplicate
    const { error } = await supabase
      .from('newsletter_subscribers')
      .upsert({
        business_id,
        email: email.toLowerCase(),
        guest_name: guest_name || null,
        source: 'email'
      }, {
        onConflict: 'business_id,email'
      });

    if (error) {
      console.error('Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to subscribe' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        business_name: business?.trading_name 
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
