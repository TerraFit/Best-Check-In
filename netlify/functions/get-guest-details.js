// netlify/functions/get-guest-details.js
// ✅ PRODUCTION VERSION - Real Supabase data

console.log('📦📦📦 PRODUCTION VERSION - REAL SUPABASE DATA 📦📦📦');

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  console.log('🔵 PRODUCTION HANDLER - Real Supabase data');
  console.log('📡 Query:', event.queryStringParameters);
  
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(204, {});
  }
  
  if (event.httpMethod !== 'GET') {
    return createResponse(405, { success: false, error: 'Method Not Allowed' });
  }
  
  try {
    const { bookingId } = event.queryStringParameters || {};
    
    if (!bookingId) {
      return createResponse(400, { success: false, error: 'Booking ID required' });
    }
    
    console.log('🔑 Booking ID:', bookingId);
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return createResponse(500, { success: false, error: 'Server configuration error' });
    }
    
    const url = `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=*,rooms:room_id(room_number,room_name,room_type)`;
    
    console.log('🔗 Supabase URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Supabase error:', errorText);
      return createResponse(response.status, {
        success: false,
        error: 'Supabase query failed',
        details: errorText
      });
    }
    
    const bookings = await response.json();
    
    if (!bookings || bookings.length === 0) {
      return createResponse(404, { success: false, error: 'Guest not found' });
    }
    
    const booking = bookings[0];
    const roomInfo = booking.rooms || {};
    
    const guestDetails = {
      id: booking.id,
      guest_name: booking.guest_name,
      guest_first_name: booking.guest_first_name,
      guest_last_name: booking.guest_last_name,
      guest_email: booking.guest_email,
      guest_phone: booking.guest_phone,
      guest_country: booking.guest_country,
      guest_province: booking.guest_province,
      guest_city: booking.guest_city,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      nights: booking.nights,
      adults: booking.adults,
      children: booking.children,
      status: booking.status,
      room_id: booking.room_id,
      room_number: roomInfo.room_number || null,
      room_name: roomInfo.room_name || null,
      room_type: roomInfo.room_type || null,
      arriving_from: booking.arriving_from,
      next_destination: booking.next_destination,
      marketing_consent: booking.marketing_consent,
      booking_source: booking.booking_source,
      created_at: booking.created_at
    };
    
    return createResponse(200, {
      success: true,
      guest: guestDetails
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    return createResponse(500, { success: false, error: err.message });
  }
};
