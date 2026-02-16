export async function handler(event) {
  console.log("🚀 TEST FUNCTION STARTED");
  console.log("Method:", event.httpMethod);
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Handle POST
  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body);
      console.log("✅ Received data:", { email: data.email });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: "Test function working!",
          yourEmail: data.email
        })
      };
    } catch (error) {
      console.error("❌ Parse error:", error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid JSON" })
      };
    }
  }

  // Handle other methods
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: "Method not allowed" })
  };
}
