import { createClient } from '@supabase/supabase-js';

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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { businessId, startDate, endDate, limit = 100 } = event.queryStringParameters || {};

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID required' })
      };
    }

    // Build query
    let query = supabase
      .from('bookings')
      .select('*')
      .eq('business_id', businessId)
      .order('check_in_date', { ascending: false })
      .limit(parseInt(limit));

    // Add date filters if provided
    if (startDate) {
      query = query.gte('check_in_date', startDate);
    }
    if (endDate) {
      query = query.lte('check_in_date', endDate);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('❌ Error fetching bookings:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch bookings' })
      };
    }

    // Calculate summary statistics
    const summary = {
      total_bookings: bookings.length,
      total_revenue: bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
      average_stay: calculateAverageStay(bookings),
      bookings_by_status: groupByStatus(bookings),
      bookings_by_month: groupByMonth(bookings),
      guest_origins: {
        provinces: groupByProvince(bookings),
        cities: groupByCity(bookings),
        countries: groupByCountry(bookings)
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        bookings,
        summary,
        period: {
          start_date: startDate || 'all',
          end_date: endDate || 'all'
        }
      })
    };

  } catch (error) {
    console.error('🔥 Unhandled error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// Helper functions
function calculateAverageStay(bookings) {
  const stays = bookings.filter(b => b.check_in_date && b.check_out_date);
  if (stays.length === 0) return 0;
  
  const totalNights = stays.reduce((sum, b) => {
    const nights = Math.ceil(
      (new Date(b.check_out_date) - new Date(b.check_in_date)) / (1000 * 60 * 60 * 24)
    );
    return sum + nights;
  }, 0);
  
  return (totalNights / stays.length).toFixed(1);
}

function groupByStatus(bookings) {
  return bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});
}

function groupByMonth(bookings) {
  return bookings.reduce((acc, b) => {
    const month = new Date(b.check_in_date).toLocaleString('default', { month: 'short', year: 'numeric' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});
}

function groupByProvince(bookings) {
  return bookings.reduce((acc, b) => {
    if (b.guest_province) {
      acc[b.guest_province] = (acc[b.guest_province] || 0) + 1;
    }
    return acc;
  }, {});
}

function groupByCity(bookings) {
  return bookings.reduce((acc, b) => {
    if (b.guest_city) {
      acc[b.guest_city] = (acc[b.guest_city] || 0) + 1;
    }
    return acc;
  }, {});
}

function groupByCountry(bookings) {
  return bookings.reduce((acc, b) => {
    if (b.guest_country) {
      acc[b.guest_country] = (acc[b.guest_country] || 0) + 1;
    }
    return acc;
  }, {});
}
