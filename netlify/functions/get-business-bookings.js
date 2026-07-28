// netlify/functions/get-business-bookings.js
// ✅ ABSOLUTE MINIMAL - Just returns a simple response

console.log('🔥 MINIMAL FUNCTION LOADED 🔥');

exports.handler = async (event) => {
  console.log('🔵 HANDLER EXECUTED');
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      success: true,
      message: 'Minimal function works!',
      timestamp: new Date().toISOString()
    })
  };
};
