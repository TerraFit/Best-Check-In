// netlify/functions/save-guest-profile.js - CORRECTED VERSION

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
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { email, profileData, bookingId, businessId } = body;

    if (!bookingId || !businessId || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'bookingId, businessId and email are required'
        })
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          warning: 'Profile service not configured',
          message: 'Check-in continues'
        })
      };
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    const encodedBookingId = encodeURIComponent(String(bookingId));
    const encodedBusinessId = encodeURIComponent(String(businessId));

    // This endpoint remains anonymous because it is called during guest
    // check-in. Profile mutation is nevertheless bound to the authoritative
    // booking created by the same check-in flow.
    let booking;

    try {
      const bookingResponse = await fetch(
        `${supabaseUrl}/rest/v1/bookings?id=eq.${encodedBookingId}&business_id=eq.${encodedBusinessId}&select=id,business_id,guest_email,status&limit=1`,
        {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!bookingResponse.ok) {
        console.error(
          '❌ Guest booking validation failed:',
          bookingResponse.status
        );

        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ error: 'Unable to validate booking' })
        };
      }

      const bookings = await bookingResponse.json();
      booking = Array.isArray(bookings) ? bookings[0] : null;
    } catch (err) {
      console.error(
        '❌ Guest booking validation error:',
        err?.message || err
      );

      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'Unable to validate booking' })
      };
    }

    if (
      !booking ||
      booking.business_id !== String(businessId) ||
      !booking.guest_email ||
      booking.guest_email.toLowerCase().trim() !== normalizedEmail
    ) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Guest profile authorization failed'
        })
      };
    }

    // The booking is the authoritative, tenant-scoped guest record.
    // The legacy guest_profiles table is global by email and must not be
    // read or mutated from this anonymous endpoint.
    //
    // Keep this endpoint as a compatibility no-op because the current guest
    // check-in flow still calls it after creating the booking.
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Guest profile is stored with the booking'
      })
    };

  } catch (error) {
    console.error('❌ Unhandled error in save-guest-profile:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        warning: 'Profile save error',
        message: 'Check-in continues'
      })
    };
  }
};
