import { Handler } from '@netlify/functions';
import auth from './_auth.cjs';

const {
  authenticateRequest,
  requireBusinessPermission,
  requirePlatformPermission,
  resolveTenant,
  authFailure
} = auth;

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

  const authentication = authenticateRequest(event);
  if (!authentication.ok) return authFailure(authentication, headers);

  const principal = authentication.principal;
  const isPlatform = ['super_admin', 'platform'].includes(principal.actorType);

  if (isPlatform) {
    if (!requirePlatformPermission(principal, 'platform:analytics:read')) {
      return authFailure({ status: 403, error: 'Missing permission: platform:analytics:read' }, headers);
    }
  } else if (!requireBusinessPermission(principal, 'canViewDashboard')) {
    return authFailure({ status: 403, error: 'Missing permission: canViewDashboard' }, headers);
  }

  try {
    const requestedBusinessId = event.queryStringParameters?.businessId || null;
    const scope = resolveTenant(principal, requestedBusinessId);
    if (!scope.ok) return authFailure(scope, headers);
    const businessId = scope.businessId;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Stats configuration is incomplete');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    const BOOKINGS_TABLE = 'ONLINE CHECKING J-BAY ZEBRA LODGE';
    const params = new URLSearchParams();
    params.set('business_id', `eq.${businessId}`);
    params.set('select', '*');

    const response = await fetch(
      `${supabaseUrl}/rest/v1/${encodeURIComponent(BOOKINGS_TABLE)}?${params.toString()}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    if (!response.ok) {
      console.error('Stats booking query failed:', response.status);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch stats' })
      };
    }

    const bookings = await response.json();

    const referralCounts: Record<string, number> = {};
    bookings?.forEach((booking: any) => {
      const source = booking.booking_source || booking.referral_source;
      if (source && source !== 'NULL' && source !== 'null') {
        referralCounts[source] = (referralCounts[source] || 0) + 1;
      }
    });

    const referralData = Object.entries(referralCounts).map(([name, count]) => ({ name, count }));

    const totalBookings = bookings?.length || 0;
    const totalRevenue = bookings?.reduce((sum: number, b: any) => sum + (parseFloat(b.total_amount) || 0), 0) || 0;
    const averageStay = totalBookings > 0
      ? bookings?.reduce((sum: number, b: any) => sum + (b.nights || 0), 0) / totalBookings
      : 0;

    const today = new Date().toISOString().split('T')[0];
    const todayCheckIns = bookings?.filter((b: any) => b.check_in_date === today).length || 0;

    const countryCounts: Record<string, number> = {};
    bookings?.forEach((booking: any) => {
      const country = booking.guest_country;
      if (country) {
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      }
    });

    const guestOrigins = Object.entries(countryCounts).map(([country, count]) => ({ country, count }));

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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(stats)
    };

  } catch (error) {
    console.error('Stats function error:', error?.message || error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch stats' })
    };
  }
};
