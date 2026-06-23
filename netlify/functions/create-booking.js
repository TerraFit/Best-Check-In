// netlify/functions/create-booking.js - CORRECTED with field validation

export const handler = async (event) => {
  console.log(`📊 create-booking called at ${new Date().toISOString()}`);
  
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
    console.log('📝 Received booking for:', body.guest_email);

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
      console.error('❌ Missing Supabase credentials');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Clean and prepare booking data
    const cleanName = (name) => {
      if (!name) return '';
      const titlePattern = /^(Mr\.?|Mrs\.?|Ms\.?|Miss\.?|Dr\.?|Prof\.?|Rev\.?)\s+/i;
      return name.replace(titlePattern, '').trim();
    };

    let firstName = cleanName(body.guest_first_name || '');
    let lastName = cleanName(body.guest_last_name || '');
    let guestName = body.guest_name || '';

    if (guestName && !firstName && !lastName) {
      const nameParts = guestName.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    const fullName = `${firstName} ${lastName}`.trim();

    // Start with core required fields
    const bookingData = {
  business_id: body.business_id,
  guest_name: fullName || guestName,
  guest_email: body.guest_email ? body.guest_email.toLowerCase().trim() : null,
  check_in_date: body.check_in_date || new Date().toISOString().split('T')[0],
  nights: body.nights || 1,
  status: body.status || 'checked_in',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

    // Add optional fields
    if (firstName) bookingData.guest_first_name = firstName;
    if (lastName) bookingData.guest_last_name = lastName;
    if (body.guest_phone) bookingData.guest_phone = body.guest_phone;
    if (body.guest_id_number) bookingData.guest_id_number = body.guest_id_number;
    if (body.guest_id_photo) bookingData.guest_id_photo = body.guest_id_photo;
    if (body.guest_signature) bookingData.guest_signature = body.guest_signature;
    if (body.check_out_date) bookingData.check_out_date = body.check_out_date;
    if (body.adults) bookingData.adults = body.adults;
    if (body.children) bookingData.children = body.children;
    if (body.total_amount) bookingData.total_amount = body.total_amount;
    if (body.guest_province) bookingData.guest_province = body.guest_province;
    if (body.guest_city) bookingData.guest_city = body.guest_city;
    if (body.guest_country) bookingData.guest_country = body.guest_country;
    if (body.booking_source) bookingData.booking_source = body.booking_source;
    if (body.referral_source) bookingData.referral_source = body.referral_source;
    if (body.marketing_consent !== undefined) bookingData.marketing_consent = body.marketing_consent;
    // ✅ NEW FIELDS for travel pattern analytics
    if (body.arriving_from) bookingData.arriving_from = body.arriving_from;
    if (body.next_destination) bookingData.next_destination = body.next_destination;

    console.log('💾 Inserting booking via REST...');
    console.log('📦 Fields being saved:', Object.keys(bookingData));

    // REST API call
    const response = await fetch(`${supabaseUrl}/rest/v1/bookings`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify([bookingData])
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Insert error:', response.status, errorText);
      
      // Check for duplicate violation
      if (errorText.includes('23505')) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            duplicate: true,
            message: 'Duplicate booking detected',
            booking: null
          })
        };
      }
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`
        })
      };
    }

    const result = await response.json();
    const savedBooking = result && result[0];
    
    console.log('✅ Booking saved:', savedBooking?.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        duplicate: false,
        booking: savedBooking,
        message: 'Booking created successfully'
      })
    };

  } catch (err) {
    console.error('❌ Fatal error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: err.message || 'Internal Server Error'
      })
    };
  }
};
