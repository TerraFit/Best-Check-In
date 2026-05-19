export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const { businessId, dateRange, province, city } = event.queryStringParameters || {};
    
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
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Get date range filter
    let startDate = new Date();
    switch(dateRange) {
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '12months':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Fetch business details via REST
    const businessResponse = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );
    
    const businesses = await businessResponse.json();
    const business = businesses?.[0];

    if (!business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Business not found' })
      };
    }

    // Fetch bookings for the period
    const BOOKINGS_TABLE = 'ONLINE CHECKING J-BAY ZEBRA LODGE';
    const bookingsResponse = await fetch(
      `${supabaseUrl}/rest/v1/${encodeURIComponent(BOOKINGS_TABLE)}?business_id=eq.${businessId}&check_in_date=gte.${startDate.toISOString().split('T')[0]}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );
    
    const bookings = await bookingsResponse.json();
    const completedBookings = bookings.filter(b => b.status === 'completed');

    // Calculate occupancy rate (simplified)
    const totalRooms = business.total_rooms || 10;
    const possibleNights = totalRooms * 30;
    const bookedNights = completedBookings.length;
    const occupancyRate = (bookedNights / possibleNights) * 100;

    // Monthly breakdown
    const monthlyBreakdown = {};
    completedBookings.forEach(booking => {
      const month = new Date(booking.check_in_date).toLocaleString('default', { month: 'short' });
      monthlyBreakdown[month] = (monthlyBreakdown[month] || 0) + 1;
    });

    // Guest origin breakdown
    const guestOrigins = {
      provinces: {},
      cities: {},
      countries: {}
    };

    completedBookings.forEach(booking => {
      if (booking.guest_province) {
        guestOrigins.provinces[booking.guest_province] = (guestOrigins.provinces[booking.guest_province] || 0) + 1;
      }
      if (booking.guest_city) {
        guestOrigins.cities[booking.guest_city] = (guestOrigins.cities[booking.guest_city] || 0) + 1;
      }
      if (booking.guest_country) {
        guestOrigins.countries[booking.guest_country] = (guestOrigins.countries[booking.guest_country] || 0) + 1;
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        business: {
          id: business.id,
          trading_name: business.trading_name,
          registered_name: business.registered_name,
          email: business.email,
          phone: business.phone,
          physical_address: business.physical_address,
          status: business.status,
          subscription_tier: business.subscription_tier,
          subscription_status: business.subscription_status || 'active',
          created_at: business.created_at
        },
        analytics: {
          total_bookings: completedBookings.length,
          occupancy_rate: occupancyRate.toFixed(2),
          monthly_breakdown: monthlyBreakdown,
          guest_origins: guestOrigins,
          total_revenue: completedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)
        },
        comparisons: {
          rankings: {
            rank_overall: 0,
            rank_province: 0,
            rank_city: 0,
            percentile_overall: 0,
            percentile_province: 0,
            percentile_city: 0
          },
          province_average: { avg_occupancy: 0, avg_bookings: 0 }
        }
      })
    };

  } catch (error) {
    console.error('Analytics error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
