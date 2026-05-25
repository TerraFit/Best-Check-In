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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    console.log('📝 Received booking data:', body);

    if (!body.business_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing business_id' })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // ✅ Use unified bookings table for all businesses
    const BOOKINGS_TABLE = 'bookings';

    // ✅ Check if business has exceeded its active booking limit
    const countResponse = await fetch(
      `${supabaseUrl}/rest/v1/${BOOKINGS_TABLE}?business_id=eq.${body.business_id}&select=id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    if (!countResponse.ok) {
      throw new Error(`Failed to check booking count: ${countResponse.status}`);
    }

    const existingBookings = await countResponse.json();
    const currentCount = existingBookings.length;

    // Get business limits
    const businessResponse = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${body.business_id}&select=max_active_bookings,trading_name,subscription_tier`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    if (!businessResponse.ok) {
      throw new Error(`Failed to fetch business data: ${businessResponse.status}`);
    }

    const businesses = await businessResponse.json();
    const business = businesses[0];

    if (!business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Business not found' })
      };
    }

    // Set default limit if not set
    const maxActiveBookings = business.max_active_bookings || 500;

    if (currentCount >= maxActiveBookings) {
      console.warn(`⚠️ Booking limit reached for ${business.trading_name}: ${currentCount}/${maxActiveBookings}`);
      return {
        statusCode: 429, // Too Many Requests
        headers,
        body: JSON.stringify({
          success: false,
          error: `Your business has reached its active booking limit of ${maxActiveBookings}. Older records will be archived automatically. Please contact support if you need to increase your limit.`,
          limit_reached: true,
          current_count: currentCount,
          max_limit: maxActiveBookings,
          tier: business.subscription_tier
        })
      };
    }

    // Clean names - Remove titles (Mr., Mrs., Dr., etc.)
    const cleanName = (name) => {
      if (!name) return '';
      const titlePattern = /^(Mr\.?|Mrs\.?|Ms\.?|Miss\.?|Dr\.?|Prof\.?|Rev\.?)\s+/i;
      return name.replace(titlePattern, '').trim();
    };

    let firstName = body.guest_first_name || '';
    let lastName = body.guest_last_name || '';
    let guestName = body.guest_name || '';

    firstName = cleanName(firstName);
    lastName = cleanName(lastName);
    
    if (guestName && !firstName && !lastName) {
      guestName = cleanName(guestName);
      const nameParts = guestName.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    const fullName = `${firstName} ${lastName}`.trim();

    const bookingData = {
      business_id: body.business_id,
      guest_name: fullName || guestName,
      guest_first_name: firstName,
      guest_last_name: lastName,
      guest_email: body.guest_email || '',
      guest_phone: body.guest_phone || '',
      guest_id_number: body.guest_id_number || '',
      guest_id_photo: body.guest_id_photo || '',
      guest_signature: body.guest_signature || '',
      check_in_date: body.check_in_date || new Date().toISOString().split('T')[0],
      check_out_date: body.check_out_date || '',
      nights: body.nights || 1,
      adults: body.adults || 1,
      children: body.children || 0,
      total_amount: body.total_amount || 0,
      status: body.status || 'checked_in',
      guest_province: body.guest_province || '',
      guest_city: body.guest_city || '',
      guest_country: body.guest_country || 'South Africa',
      booking_source: body.booking_source || body.referral_source || '',
      referral_source: body.referral_source || body.booking_source || '',
      marketing_consent: body.marketing_consent || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log(`💾 Saving booking for ${business.trading_name} to:`, BOOKINGS_TABLE);
    console.log(`📊 Current booking count: ${currentCount}/${maxActiveBookings}`);
    console.log('📦 Booking data:', JSON.stringify(bookingData, null, 2));

    const response = await fetch(`${supabaseUrl}/rest/v1/${BOOKINGS_TABLE}`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify([bookingData])
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase error:', errorText);
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          success: false,
          error: `Database error: ${errorText}`,
          details: `Failed to save to ${BOOKINGS_TABLE} table`
        })
      };
    }

    const result = await response.json();
    const newBooking = result[0];

    console.log(`✅ Booking saved successfully for ${business.trading_name}:`, newBooking?.id);
    console.log(`📊 New booking count: ${currentCount + 1}/${maxActiveBookings}`);

    // Send warning if approaching limit (80% or more)
    const percentUsed = ((currentCount + 1) / maxActiveBookings) * 100;
    let warningMessage = null;
    
    if (percentUsed >= 80 && percentUsed < 90) {
      warningMessage = `You're at ${Math.round(percentUsed)}% of your ${maxActiveBookings} booking limit. Consider upgrading your plan for more capacity.`;
    } else if (percentUsed >= 90) {
      warningMessage = `⚠️ You're at ${Math.round(percentUsed)}% of your ${maxActiveBookings} booking limit! Upgrade now to avoid reaching the limit.`;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        booking: newBooking,
        message: 'Booking created successfully',
        warning: warningMessage,
        limits: {
          current: currentCount + 1,
          max: maxActiveBookings,
          percent_used: Math.round(percentUsed)
        }
      })
    };

  } catch (err) {
    console.error('❌ create-booking error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      })
    };
  }
};
