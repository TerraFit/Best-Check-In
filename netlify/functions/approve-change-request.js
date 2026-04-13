import { createClient } from '@supabase/supabase-js';

export const handler = async function(event) {
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

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { businessId, businessName, fieldName, currentValue, requestedValue, reason } = JSON.parse(event.body);

    console.log('📝 Change request received:', {
      businessId,
      businessName,
      fieldName,
      currentValue,
      requestedValue,
      reason
    });

    if (!businessId || !fieldName || !requestedValue || !reason) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Insert change request
    const { data, error } = await supabase
      .from('change_requests')
      .insert([{
        business_id: businessId,
        business_name: businessName,
        field_name: fieldName,
        current_value: currentValue,
        requested_value: requestedValue,
        reason: reason,
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('❌ Error creating change request:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to submit change request: ' + error.message })
      };
    }

    console.log('✅ Change request submitted:', data[0].id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Change request submitted successfully',
        requestId: data[0].id
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
};
