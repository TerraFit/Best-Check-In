import { supabaseFetch } from './lib/supabase-rest.js';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed', data: [] })
    };
  }

  try {
    // Exclude large base64 fields - only get URLs
    const data = await supabaseFetch(
      `businesses?status=eq.approved&select=id,registered_name,trading_name,legal_name,registration_number,business_number,vat_number,establishment_type,tgsa_grading,phone,email,physical_address,postal_address,subscription_tier,payment_status,last_payment_date,payment_due_date,created_at,status,service_paused,slogan,total_rooms,avg_price,logo_url,hero_image_url&order=created_at.desc&limit=50`
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: data || [], count: data?.length || 0 })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message, data: [] })
    };
  }
};
