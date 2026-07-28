// netlify/functions/get-business-bookings.js
// ✅ TEST VERSION - Returns hardcoded bookings

console.log('📦📦📦 TEST VERSION - HARDCODED BOOKINGS 📦📦📦');

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
  console.log('🔵 TEST HANDLER - Hardcoded bookings');
  console.log('📡 Method:', event.httpMethod);
  console.log('📡 Query:', event.queryStringParameters);
  
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(204, {});
  }
  
  // ✅ Hardcoded bookings
  const mockBookings = [
    { id: '1', guest_name: 'Test Guest 1', status: 'checked_in', check_in_date: '2026-07-28' },
    { id: '2', guest_name: 'Test Guest 2', status: 'stayover', check_in_date: '2026-07-27' },
    { id: '3', guest_name: 'Test Guest 3', status: 'checked_in', check_in_date: '2026-07-28' }
  ];
  
  return createResponse(200, {
    success: true,
    bookings: mockBookings,
    total_count: mockBookings.length,
    page: 1,
    limit: 25,
    total_pages: 1
  });
};
