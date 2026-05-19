import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
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
    const businessId = event.queryStringParameters?.businessId;
    
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
      console.error('Missing Supabase credentials');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // ⚠️ IMPORTANT: Change this to YOUR actual bookings table name
    const BOOKINGS_TABLE = 'ONLINE CHECKING J-BAY ZEBRA LODGE';
    
    // Fetch all bookings for this business via REST
    const response = await fetch(
      `${supabaseUrl}/rest/v1/${encodeURIComponent(BOOKINGS_TABLE)}?business_id=eq.${businessId}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const bookings = await response.json();

    // Calculate referral sources
    const referralCounts: Record<string, number> = {};
    bookings?.forEach((booking: any) => {
      const source = booking.booking_source || booking.referral_source;
      if (source && source !== 'NULL' && source !== 'null') {
        referralCounts[source] = (referralCounts[source] || 0) + 1;
      }
    });

    const referralData = Object.entries(referralCounts).map(([name, count]) => ({
      name,
      count
    }));

    // Calculate basic stats
    const totalBookings = bookings?.length || 0;
    const totalRevenue = bookings?.reduce((sum: number, b: any) => sum + (parseFloat(b.total_amount) || 0), 0) || 0;
    const averageStay = totalBookings > 0 
      ? bookings?.reduce((sum: number, b: any) => sum + (b.nights || 0), 0) / totalBookings 
      : 0;

    // Get today's check-ins
    const today = new Date().toISOString().split('T')[0];
    const todayCheckIns = bookings?.filter((b: any) => b.check_in_date === today).length || 0;

    // Get guest origins by country
    const countryCounts: Record<string, number> = {};
    bookings?.forEach((booking: any) => {
      const country = booking.guest_country;
      if (country) {
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      }
    });

    const guestOrigins = Object.entries(countryCounts).map(([country, count]) => ({
      country,
      count
    }));

    // Build stats object
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
      totalRevenue,
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
