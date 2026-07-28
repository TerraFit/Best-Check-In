// netlify/functions/get-business-bookings.js
// ✅ MINIMAL TEST - Only returns a simple response

console.log('🟢🟢🟢 MINIMAL TEST FUNCTION LOADED 🟢🟢🟢');

exports.handler = async (event) => {
  console.log('🔵🔵🔵 HANDLER EXECUTED 🔵🔵🔵');
  console.log('📡 Method:', event.httpMethod);
  console.log('📡 Query:', event.queryStringParameters);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      success: true,
      message: 'Function works!',
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      query: event.queryStringParameters
    })
  };
};
