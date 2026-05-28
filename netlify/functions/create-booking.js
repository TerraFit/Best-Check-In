export const handler = async (event) => {
  console.log(`📊 Request received at ${new Date().toISOString()}`);
  console.log(`🔑 Request ID: ${event.headers['x-request-id'] || 'unknown'}`);
  
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

    const BOOKINGS_TABLE = 'bookings';

    // Clean names - Remove titles
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
      guest_email: (body.guest_email || '').toLowerCase().trim(),
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

    // ============================================================
    // DUPLICATE DETECTION - Check if booking already exists
    // ============================================================
    
    const checkForDuplicate = async () => {
      // Strategy 1: Check by email + check_in_date (most reliable)
      if (bookingData.guest_email) {
        const checkUrl = `${supabaseUrl}/rest/v1/${BOOKINGS_TABLE}?business_id=eq.${bookingData.business_id}&check_in_date=eq.${bookingData.check_in_date}&guest_email=eq.${encodeURIComponent(bookingData.guest_email)}&select=id`;
        
        console.log(`🔍 Checking duplicate by email: ${bookingData.guest_email}`);
        const checkResponse = await fetch(checkUrl, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
        
        const existing = await checkResponse.json();
        if (existing && existing.length > 0) {
          console.log(`⚠️ Duplicate found by email: ${bookingData.guest_email} on ${bookingData.check_in_date}`);
          return true;
        }
      }
      
      // Strategy 2: Check by name + check_in_date (fallback for no email)
      if (bookingData.guest_name) {
        const encodedName = encodeURIComponent(bookingData.guest_name);
        const checkUrl = `${supabaseUrl}/rest/v1/${BOOKINGS_TABLE}?business_id=eq.${bookingData.business_id}&check_in_date=eq.${bookingData.check_in_date}&guest_name=eq.${encodedName}&select=id`;
        
        console.log(`🔍 Checking duplicate by name: ${bookingData.guest_name}`);
        const checkResponse = await fetch(checkUrl, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
        
        const existing = await checkResponse.json();
        if (existing && existing.length > 0) {
          console.log(`⚠️ Duplicate found by name: ${bookingData.guest_name} on ${bookingData.check_in_date}`);
          return true;
        }
      }
      
      // Strategy 3: Check by phone + check_in_date (if available)
      if (bookingData.guest_phone) {
        const checkUrl = `${supabaseUrl}/rest/v1/${BOOKINGS_TABLE}?business_id=eq.${bookingData.business_id}&check_in_date=eq.${bookingData.check_in_date}&guest_phone=eq.${encodeURIComponent(bookingData.guest_phone)}&select=id`;
        
        console.log(`🔍 Checking duplicate by phone: ${bookingData.guest_phone}`);
        const checkResponse = await fetch(checkUrl, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
        
        const existing = await checkResponse.json();
        if (existing && existing.length > 0) {
          console.log(`⚠️ Duplicate found by phone: ${bookingData.guest_phone} on ${bookingData.check_in_date}`);
          return true;
        }
      }
      
      console.log('✅ No duplicate found');
      return false;
    };

    // Check for duplicate before saving
    const isDuplicate = await checkForDuplicate();
    
    if (isDuplicate) {
      console.log('⏭️ Skipping duplicate booking:', {
        guest_email: bookingData.guest_email,
        guest_name: bookingData.guest_name,
        check_in_date: bookingData.check_in_date
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          duplicate: true,
          message: 'Duplicate booking skipped',
          booking: null
        })
      };
    }

    console.log('💾 Saving new booking to:', BOOKINGS_TABLE);
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
      console.error('❌ Supabase error:', errorText);
      
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

    console.log('✅ Booking saved successfully:', newBooking?.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        duplicate: false,
        booking: newBooking,
        message: 'Booking created successfully'
      })
    };

  } catch (err) {
    console.error('❌ create-booking error:', err);
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
