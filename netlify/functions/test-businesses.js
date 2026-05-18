export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Return mock data to test frontend
  const mockBusinesses = [
    {
      id: "test-1",
      trading_name: "Test Business 1",
      registered_name: "Test Business 1 Pty Ltd",
      email: "test1@example.com",
      phone: "+27 82 123 4567",
      status: "approved",
      created_at: new Date().toISOString(),
      physical_address: { city: "Cape Town", province: "Western Cape" },
      subscription_tier: "monthly"
    },
    {
      id: "test-2",
      trading_name: "Test Business 2",
      registered_name: "Test Business 2 Pty Ltd",
      email: "test2@example.com",
      phone: "+27 82 765 4321",
      status: "approved",
      created_at: new Date().toISOString(),
      physical_address: { city: "Johannesburg", province: "Gauteng" },
      subscription_tier: "annual"
    }
  ];

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(mockBusinesses)
  };
};
