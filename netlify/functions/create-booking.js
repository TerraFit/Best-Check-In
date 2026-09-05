// netlify/functions/create-booking.js
// Public guest booking creation. The endpoint remains intentionally anonymous,
// but the target business must be an approved, active establishment.
// Stay dates are authoritative: check-in + nights always derives checkout.

import stayDates from './lib/stayDates.cjs';

const { calculateCheckOutDate, normalizeNights } = stayDates;

export async function handler(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    if (!body.business_id) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Missing business_id' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };
    }

    // Public check-in is allowed only for an explicitly approved, non-paused
    // establishment. This prevents arbitrary business_id injection from
    // creating bookings in another tenant's register.
    const businessResponse = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(body.business_id)}&select=id,status,service_paused`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Accept': 'application/json' } }
    );

    if (!businessResponse.ok) {
      console.error('Business validation failed:', businessResponse.status);
      return { statusCode: 502, headers, body: JSON.stringify({ success: false, error: 'Unable to validate establishment' }) };
    }

    const businesses = await businessResponse.json();
    const business = businesses?.[0];
    if (!business || business.id !== String(body.business_id) || business.status !== 'approved' || business.service_paused === true) {
      return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Check-in is not available for this establishment' }) };
    }

    const cleanName = (name) => {
      if (!name) return '';
      const titlePattern = /^(Mr\.?|Mrs\.?|Ms\.?|Miss\.?|Dr\.?|Prof\.?|Rev\.?)\s+/i;
      return name.replace(titlePattern, '').trim();
    };

    let firstName = cleanName(body.guest_first_name || '');
    let lastName = cleanName(body.guest_last_name || '');
    const guestName = body.guest_name || '';

    if (guestName && !firstName && !lastName) {
      const nameParts = guestName.trim().split(/\s+/);
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const checkInDate = body.check_in_date || new Date().toISOString().split('T')[0];
    const nights = normalizeNights(body.nights);
    const checkOutDate = calculateCheckOutDate(checkInDate, nights);

    if (!checkOutDate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'A valid check-in date and number of nights (minimum 1) are required. Checkout date is calculated automatically from these values.'
        })
      };
    }

    if (body.check_out_date && String(body.check_out_date).slice(0, 10) !== checkOutDate) {
      console.warn('Ignoring conflicting client checkout date; using server-derived value');
    }

    const bookingData = {
      business_id: body.business_id,
      guest_name: fullName || guestName,
      guest_email: body.guest_email ? body.guest_email.toLowerCase().trim() : null,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      nights,
      status: body.status || 'checked_in',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (firstName) bookingData.guest_first_name = firstName;
    if (lastName) bookingData.guest_last_name = lastName;
    if (body.guest_phone) bookingData.guest_phone = body.guest_phone;
    if (body.guest_id_number) bookingData.guest_id_number = body.guest_id_number;
    if (body.guest_id_photo) bookingData.guest_id_photo = body.guest_id_photo;
    if (body.guest_signature) bookingData.guest_signature = body.guest_signature;
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
      console.error('Booking insert failed:', response.status);
      if (errorText.includes('23505')) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ success: false, duplicate: true, code: 'DUPLICATE_BOOKING', error: 'A booking for this guest already exists' })
        };
      }
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: `Booking creation failed (HTTP ${response.status})` }) };
    }

    const result = await response.json();
    const savedBooking = result && result[0];

    if (savedBooking?.id && body.food_restrictions) {
      try {
        const restrictions = body.food_restrictions;
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

        const checkResponse = await fetch(`${supabaseUrl}/rest/v1/booking_food_restrictions?booking_id=eq.${savedBooking.id}&select=id`, {
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        const existingData = await checkResponse.json();
        const hasExisting = existingData && existingData.length > 0;
        let restrictionsResponse;

        if (hasExisting) {
          restrictionsResponse = await fetch(`${supabaseUrl}/rest/v1/booking_food_restrictions?booking_id=eq.${savedBooking.id}`, {
            method: 'PATCH',
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(restrictionsData)
          });
        } else {
          restrictionsResponse = await fetch(`${supabaseUrl}/rest/v1/booking_food_restrictions`, {
            method: 'POST',
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
            body: JSON.stringify([restrictionsData])
          });
        }

        if (!restrictionsResponse.ok) console.error('Failed to save food restrictions:', restrictionsResponse.status);
      } catch (err) {
        console.error('Error saving food restrictions:', err?.message || 'unknown error');
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, duplicate: false, booking: savedBooking, message: 'Booking created successfully' })
    };
  } catch (err) {
    console.error('Fatal booking error:', err?.message || 'unknown error');
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Internal Server Error' }) };
  }
}
