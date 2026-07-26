// netlify/functions/get-housekeeping-tasks.js
// ✅ Fetches housekeeping tasks for a business
// ✅ test if it trigger built

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { businessId, scheduledDate, status, limit = 100 } = event.queryStringParameters || {};

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID required' })
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

    // Build query
    let query = `${supabaseUrl}/rest/v1/housekeeping_tasks?business_id=eq.${businessId}&order=scheduled_date.asc&limit=${limit}`;

    if (scheduledDate) {
      query += `&scheduled_date=eq.${scheduledDate}`;
    }

    if (status) {
      query += `&status=eq.${status}`;
    }

    const response = await fetch(query, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch tasks' })
      };
    }

    const data = await response.json();

    // Get employee names for assigned staff
    const employeeIds = data
      .map(task => task.assigned_staff_id)
      .filter(id => id);

    let employeeMap = {};
    if (employeeIds.length > 0) {
      const empResponse = await fetch(
        `${supabaseUrl}/rest/v1/employees?id=in.(${employeeIds.join(',')})&select=id,full_name`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        }
      );

      if (empResponse.ok) {
        const employees = await empResponse.json();
        employeeMap = employees.reduce((acc, emp) => {
          acc[emp.id] = emp.full_name;
          return acc;
        }, {});
      }
    }

    // Add assigned staff names
    const enrichedData = data.map(task => ({
      ...task,
      assigned_staff_name: task.assigned_staff_id ? employeeMap[task.assigned_staff_id] : null
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: enrichedData,
        total: enrichedData.length
      })
    };

  } catch (error) {
    console.error('Error fetching tasks:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to fetch tasks'
      })
    };
  }
};
