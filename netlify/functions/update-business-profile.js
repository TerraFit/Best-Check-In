// netlify/functions/update-business-profile.js
// ✅ Complete rewrite with full newsletter field support

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Method Not Allowed' 
      })
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body);
    const { businessId, ...fields } = body;

    // Validate business ID
    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Business ID required' 
        })
      };
    }

    // Validate Supabase configuration
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Server configuration error' 
        })
      };
    }

    // Add updated timestamp
    fields.updated_at = new Date().toISOString();

    // Clean up fields - remove undefined, null, or empty string values
    Object.keys(fields).forEach(key => {
      if (fields[key] === undefined || fields[key] === null || fields[key] === '') {
        delete fields[key];
      }
    });

    // ============================================================
    // ✅ ALLOWED FIELDS - Full list of updatable fields
    // ============================================================
    const ALLOWED_FIELDS = [
      // Basic Info
      'trading_name',
      'registered_name',
      'legal_name',
      'slogan',
      'welcome_message',
      'email',
      'secondary_email',
      'phone',
      'mobile_phone',
      'secondary_phone',
      'website',
      
      // Property Details
      'total_rooms',
      'avg_price',
      'establishment_type',
      'tgsa_grading',
      'max_rooms',
      
      // Images
      'logo_url',
      'hero_image_url',
      
      // Address
      'physical_address',
      'postal_address',
      
      // Subscription
      'subscription_tier',
      'current_plan',
      'billing_cycle',
      'service_paused',
      
      // ============================================================
      // ✅ NEWSLETTER SETTINGS - These are the key fields
      // ============================================================
      'newsletter_enabled',
      'newsletter_title',
      'newsletter_prize',
      'newsletter_cta',
      'newsletter_terms',
      'newsletter_draw_date',
      'newsletter_share_text',
      
      // Marketing
      'marketing_consent_enabled',
      
      // Directors (as JSON)
      'directors',
      
      // Timestamps
      'updated_at'
    ];

    // Filter fields to only allow known fields
    const filteredFields = {};
    Object.keys(fields).forEach(key => {
      if (ALLOWED_FIELDS.includes(key)) {
        filteredFields[key] = fields[key];
      } else {
        console.warn(`⚠️ Skipping unknown field: ${key}`);
      }
    });

    // Check if there's anything to update
    if (Object.keys(filteredFields).length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'No valid fields to update' 
        })
      };
    }

    console.log('📝 Updating business:', businessId);
    console.log('📝 Fields to update:', Object.keys(filteredFields));

    // Build the PATCH request
    const response = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'  // ✅ Don't return data, just status
      },
      body: JSON.stringify(filteredFields)
    });

    // Handle response
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Update error:', response.status, errorText);
      
      // Check for specific error types
      if (response.status === 404) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: 'Business not found' 
          })
        };
      }
      
      if (response.status === 401 || response.status === 403) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: 'Unauthorized - Invalid API key' 
          })
        };
      }

      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    // ============================================================
    // ✅ SUCCESS - Return minimal response
    // ============================================================
    console.log('✅ Business updated successfully:', businessId);
    
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
    console.error('❌ Error updating business profile:', error);
    
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body' 
        })
      };
    }

    // Generic error response
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
