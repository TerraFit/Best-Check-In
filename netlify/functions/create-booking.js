// netlify/functions/create-booking.js
// ✅ COMPLETE REWRITE - CommonJS with food restrictions saving

exports.handler = async (event) => {
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

    // ============================================================
    // Clean and prepare booking data
    // ============================================================
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

    // Build booking data
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
    if (body.arriving_from) bookingData.arriving_from = body.arriving_from;
    if (body.next_destination) bookingData.next_destination = body.next_destination;

    console.log('💾 Inserting booking via REST...');
    console.log('📦 Fields being saved:', Object.keys(bookingData));

    // ============================================================
    // Save booking to bookings table
    // ============================================================
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

    // ============================================================
    // ✅ SAVE FOOD RESTRICTIONS to booking_food_restrictions table
    // ============================================================
    if (savedBooking?.id && body.food_restrictions) {
      try {
        const restrictions = body.food_restrictions;
        console.log('🍽️ Saving food restrictions for booking:', savedBooking.id);
        console.log('🍽️ Restrictions data:', JSON.stringify(restrictions, null, 2));
        
        // Build restrictions data
        const restrictionsData = {
          booking_id: savedBooking.id,
          vegetarian: restrictions.vegetarian || false,
          vegan: restrictions.vegan || false,
          pescatarian: restrictions.pescatarian || false,
          halal: restrictions.halal || false,
          kosher: restrictions.kosher || false,
          gluten_free: restrictions.gluten_free || false,
          lactose_free: restrictions.lactose_free || false,
          nut_allergy: restrictions.nut_allergy || false,
          seafood_allergy: restrictions.seafood_allergy || false,
          diabetic: restrictions.diabetic || false,
          no_pork: restrictions.no_pork || false,
          other: restrictions.other || false,
          other_text: restrictions.other_text || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Check if restrictions already exist
        const checkResponse = await fetch(
          `${supabaseUrl}/rest/v1/booking_food_restrictions?booking_id=eq.${savedBooking.id}&select=id`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          }
        );
        
        const existingData = await checkResponse.json();
        const hasExisting = existingData && existingData.length > 0;
        
        let restrictionsResponse;
        
        if (hasExisting) {
          // Update existing restrictions
          console.log('🔄 Updating existing food restrictions');
          restrictionsResponse = await fetch(
            `${supabaseUrl}/rest/v1/booking_food_restrictions?booking_id=eq.${savedBooking.id}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(restrictionsData)
            }
          );
        } else {
          // Insert new restrictions
          console.log('➕ Inserting new food restrictions');
          restrictionsResponse = await fetch(`${supabaseUrl}/rest/v1/booking_food_restrictions`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify([restrictionsData])
          });
        }

        if (restrictionsResponse.ok) {
          const restrictionsResult = await restrictionsResponse.json();
          console.log('✅ Food restrictions saved successfully');
        } else {
          const errorText = await restrictionsResponse.text();
          console.error('❌ Failed to save food restrictions:', errorText);
        }
      } catch (err) {
        console.error('❌ Error saving food restrictions:', err);
        // Don't fail the whole booking if restrictions fail
      }
    } else {
      console.log('ℹ️ No food restrictions to save');
    }

    // ============================================================
    // Return success response
    // ============================================================
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
