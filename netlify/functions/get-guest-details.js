// netlify/functions/get-guest-details.js
// ✅ FIXED: Handles both string IDs and UUIDs

console.log('📦📦📦 get-guest-details LOADED (with string ID support) 📦📦📦');

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

// ✅ Mock data for test bookings
const MOCK_GUESTS = {
  '1': {
    id: '1',
    guest_name: 'Test Guest 1',
    guest_first_name: 'Test',
    guest_last_name: 'Guest',
    guest_email: 'test1@example.com',
    guest_phone: '+27123456789',
    guest_country: 'South Africa',
    guest_province: 'Western Cape',
    guest_city: 'Cape Town',
    check_in_date: '2026-07-28',
    check_out_date: '2026-07-30',
    nights: 2,
    adults: 1,
    children: 0,
    status: 'checked_in',
    room_id: 'room-1',
    room_number: '1',
    room_name: 'Stone',
    room_type: 'Standard',
    arriving_from: 'Cape Town',
    next_destination: 'Gqeberha',
    marketing_consent: true,
    booking_source: 'Booking.com',
    created_at: new Date().toISOString()
  },
  '2': {
    id: '2',
    guest_name: 'Test Guest 2',
    guest_first_name: 'Test',
    guest_last_name: 'Guest 2',
    guest_email: 'test2@example.com',
    guest_phone: '+27123456789',
    guest_country: 'South Africa',
    guest_province: 'Gauteng',
    guest_city: 'Johannesburg',
    check_in_date: '2026-07-27',
    check_out_date: '2026-07-29',
    nights: 2,
    adults: 1,
    children: 0,
    status: 'stayover',
    room_id: 'room-2',
    room_number: '2',
    room_name: 'Earth',
    room_type: 'Standard',
    arriving_from: 'Johannesburg',
    next_destination: 'Durban',
    marketing_consent: true,
    booking_source: 'Airbnb',
    created_at: new Date().toISOString()
  },
  '3': {
    id: '3',
    guest_name: 'Test Guest 3',
    guest_first_name: 'Test',
    guest_last_name: 'Guest 3',
    guest_email: 'test3@example.com',
    guest_phone: '+27123456789',
    guest_country: 'South Africa',
    guest_province: 'Eastern Cape',
    guest_city: 'Gqeberha',
    check_in_date: '2026-07-28',
    check_out_date: '2026-07-31',
    nights: 3,
    adults: 2,
    children: 0,
    status: 'checked_in',
    room_id: 'room-3',
    room_number: '3',
    room_name: 'Leopard',
    room_type: 'Deluxe',
    arriving_from: 'Port Elizabeth',
    next_destination: 'Knysna',
    marketing_consent: false,
    booking_source: 'Google',
    created_at: new Date().toISOString()
  }
};

exports.handler = async (event) => {
  console.log('🔵 get-guest-details handler');
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
    
    // ✅ Check if it's a test ID (string like "1", "2", "3")
    const isTestId = /^[0-9]+$/.test(bookingId);
    
    if (isTestId) {
      console.log('📦 Using mock data for test ID:', bookingId);
      const mockGuest = MOCK_GUESTS[bookingId];
      
      if (!mockGuest) {
        return createResponse(404, { success: false, error: 'Guest not found' });
      }
      
      return createResponse(200, {
        success: true,
        guest: mockGuest
      });
    }
    
    // ✅ For real UUIDs, query Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return createResponse(500, { success: false, error: 'Server configuration error' });
    }
    
    // ✅ Include room data in the query
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
