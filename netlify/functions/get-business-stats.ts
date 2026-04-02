import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const businessId = event.queryStringParameters?.businessId;
    
    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Business ID required' })
      };
    }

    console.log('📊 Fetching stats for business:', businessId);

    // Get all bookings for this business
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('business_id', businessId)
      .order('check_in_date', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    // Calculate referral sources from booking_source field
    const referralCounts: Record<string, number> = {};
    bookings?.forEach(booking => {
      const source = booking.booking_source || booking.referral_source;
      if (source && source !== 'NULL' && source !== 'null') {
        referralCounts[source] = (referralCounts[source] || 0) + 1;
      }
    });

    const referralData = Object.entries(referralCounts).map(([name, count]) => ({
      name,
      count
    }));

    // Calculate other stats
    const totalBookings = bookings?.length || 0;
    const totalRevenue = bookings?.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0) || 0;
    const averageStay = totalBookings > 0 
      ? bookings?.reduce((sum, b) => sum + (b.nights || 0), 0) / totalBookings 
      : 0;

    // Get today's check-ins
    const today = new Date().toISOString().split('T')[0];
    const todayCheckIns = bookings?.filter(b => b.check_in_date === today).length || 0;

    // Get guest origins
    const countryCounts: Record<string, number> = {};
    bookings?.forEach(booking => {
      const country = booking.guest_country;
      if (country) {
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      }
    });

    const guestOrigins = Object.entries(countryCounts).map(([country, count]) => ({
      country,
      count
    }));

    const stats = {
      totalBookings,
      totalRevenue,
      averageStay,
      todayCheckIns,
      occupancyRate: totalBookings > 0 ? (todayCheckIns / totalBookings) * 100 : 0,
      referralData,
      referralSources: referralCounts,
      guestOrigins,
      bookings: bookings || []
    };

    console.log('✅ Stats generated:', {
      totalBookings,
      referralSources: Object.keys(referralCounts).length
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(stats)
    };

  } catch (error) {
    console.error('Stats function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
