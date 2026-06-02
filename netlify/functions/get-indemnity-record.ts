// netlify/functions/get-indemnity-record.ts - CORRECTED with encoding

import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  try {
    const token = event.queryStringParameters?.token;
    
    if (!token) {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'Token required' }) 
      };
    }

    // ✅ CRITICAL FIX: Encode the token properly
    const encodedToken = encodeURIComponent(token);

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: 'Server configuration error' }) 
      };
    }

    // REST API call with properly encoded token
    const indemnityResponse = await fetch(
      `${supabaseUrl}/rest/v1/indemnity_records?access_token=eq.${encodedToken}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!indemnityResponse.ok) {
      console.error('❌ Failed to fetch indemnity record:', indemnityResponse.status);
      return { 
        statusCode: 404, 
        headers, 
        body: JSON.stringify({ error: 'Indemnity record not found' }) 
      };
    }

    const indemnityData = await indemnityResponse.json();
    
    if (!indemnityData || indemnityData.length === 0) {
      return { 
        statusCode: 404, 
        headers, 
        body: JSON.stringify({ error: 'Indemnity record not found' }) 
      };
    }

    const record = indemnityData[0];

    // Fetch business details separately
    const businessResponse = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${record.business_id}&select=trading_name,logo_url`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      }
    );

    let businessName = '';
    let businessLogo = '';
    
    if (businessResponse.ok) {
      const businessData = await businessResponse.json();
      if (businessData && businessData.length > 0) {
        businessName = businessData[0].trading_name || '';
        businessLogo = businessData[0].logo_url || '';
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        guest_name: record.guest_name,
        guest_first_name: record.guest_first_name,
        guest_last_name: record.guest_last_name,
        passport_or_id: record.passport_or_id,
        signature_data: record.signature_data,
        signed_at: record.signed_at,
        business_name: businessName,
        business_logo: businessLogo
      })
    };

  } catch (error) {
    console.error('❌ Error fetching indemnity record:', error);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: 'Internal server error' }) 
    };
  }
};
