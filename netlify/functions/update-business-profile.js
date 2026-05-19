export const handler = async function(event) {
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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { businessId, ...fields } = body;

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Business ID required' })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Server configuration error' })
      };
    }

    // Add updated timestamp
    fields.updated_at = new Date().toISOString();

    // Map newsletter fields correctly
    const newsletterFields = [
      'newsletter_enabled',
      'newsletter_title',
      'newsletter_prize',
      'newsletter_cta',
      'newsletter_terms',
      'newsletter_draw_date',
      'newsletter_share_text'
    ];

    // Only include newsletter fields that were sent
    newsletterFields.forEach(field => {
      if (fields[field] === undefined) {
        delete fields[field];
      }
    });

    // Remove undefined values from all fields
    Object.keys(fields).forEach(key => {
      if (fields[key] === undefined) {
        delete fields[key];
      }
    });

    console.log('📝 Updating business:', businessId);
    console.log('📝 Fields to update:', Object.keys(fields));

    const response = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(fields)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update error:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const updatedBusiness = result[0];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: updatedBusiness,
        message: 'Profile updated successfully'
      })
    };

  } catch (error) {
    console.error('Error updating business profile:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to update business profile'
      })
    };
  }
};
