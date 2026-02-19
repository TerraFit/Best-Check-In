import { createClient } from '@supabase/supabase-js';

export const handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { businessId, dateRange, province, city } = event.queryStringParameters || {};
    
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
        startDate.setDate(startDate.getDate() - 30); // Default 30 days
    }

    // Fetch business details
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (businessError) throw businessError;

    // Fetch bookings for the period
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('business_id', businessId)
      .gte('check_in_date', startDate.toISOString())
      .eq('status', 'completed');

    if (bookingsError) throw bookingsError;

    // Calculate occupancy rate (simplified - assumes 30 days/month, 1 room)
    const totalRooms = business.total_rooms || 10; // Default if not set
    const possibleNights = totalRooms * 30; // Approximate
    const bookedNights = bookings.length;
    const occupancyRate = (bookedNights / possibleNights) * 100;

    // Monthly breakdown
    const monthlyBreakdown = {};
    bookings.forEach(booking => {
      const month = new Date(booking.check_in_date).toLocaleString('default', { month: 'short' });
      if (!monthlyBreakdown[month]) {
        monthlyBreakdown[month] = 0;
      }
      monthlyBreakdown[month]++;
    });

    // Guest origin breakdown
    const guestOrigins = {
      provinces: {},
      cities: {},
      countries: {}
    };

    bookings.forEach(booking => {
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

    // Get comparative rankings
    const { data: rankings, error: rankingsError } = await supabase
      .from('business_rankings')
      .select('*')
      .eq('business_id', businessId)
      .single();

    // Get province/city averages for comparison
    const { data: provinceStats, error: provinceError } = await supabase
      .from('business_stats')
      .select('avg(occupancy_rate) as avg_occupancy, avg(total_bookings) as avg_bookings')
      .eq('business_id', businessId) // This needs to be filtered by province
      .single();

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
          subscription_renewal_date: business.subscription_renewal_date,
          created_at: business.created_at
        },
        analytics: {
          total_bookings: bookings.length,
          occupancy_rate: occupancyRate.toFixed(2),
          monthly_breakdown: monthlyBreakdown,
          guest_origins: guestOrigins,
          total_revenue: bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)
        },
        comparisons: {
          rankings: rankings || {
            rank_overall: 0,
            rank_province: 0,
            rank_city: 0,
            percentile_overall: 0,
            percentile_province: 0,
            percentile_city: 0
          },
          province_average: provinceStats || { avg_occupancy: 0, avg_bookings: 0 }
        }
      })
    };

  } catch (error) {
    console.error('🔥 Analytics error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
