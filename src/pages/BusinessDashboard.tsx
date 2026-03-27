import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, getBusinessId, clearAuth } from '../utils/auth';

interface BusinessProfile {
  id: string;
  trading_name: string;
  registered_name: string;
  email: string;
  phone: string;
  total_rooms?: number;
  avg_price?: number;
  setup_complete: boolean;
  created_at?: string;
  subscription_tier?: string;
  physical_address?: {
    city: string;
    province: string;
    country: string;
  };
}

interface AnalyticsData {
  total_bookings: number;
  total_revenue: number;
  total_nights: number;
  occupancy_rate: number;
  today_bookings: number;
  monthly_data: {
    month: string;
    year: number;
    bookings: number;
    revenue: number;
    nights: number;
    density: number;
    monthIndex: number;
  }[];
  guest_origins: {
    countries: Record<string, number>;
    provinces: Record<string, number>;
    cities: Record<string, number>;
  };
  recent_checkins: any[];
}

export default function BusinessDashboard() {
  const navigate = useNavigate();

  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [filters, setFilters] = useState({
    country: '',
    province: '',
    city: '',
  });

  const getAuthToken = () => {
    const auth = getAuth();
    return (auth as any)?.token || getBusinessId();
  };

  const authenticatedFetch = async (url: string) => {
    const token = getAuthToken();

    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (res.status === 401) {
      clearAuth();
      navigate('/business/login');
      throw new Error('Unauthorized');
    }

    return res;
  };

// ================= LOAD ANALYTICS =================
const loadAnalytics = async () => {
  const businessId = getBusinessId();
  console.log('🔍 loadAnalytics called!', { businessId, dateFrom, dateTo, filters });
  
  if (!businessId) {
    console.log('❌ No business ID found!');
    setError('No business ID found');
    return;
  }

  setAnalyticsLoading(true);
  setError(null);

  try {
    console.log('📡 Fetching bookings...');
    const res = await authenticatedFetch(
      `/.netlify/functions/get-business-bookings?businessId=${businessId}&limit=1000`
    );

    console.log('📡 Response status:', res.status);
    const data = await res.json();
    console.log('📊 API Response data:', data);
    
    let rawBookings = data?.bookings || [];
    console.log('📊 Raw bookings count:', rawBookings.length);
    console.log('📊 Raw bookings sample:', rawBookings.slice(0, 3));

    // ===== DATE FILTER =====
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;

    const filteredBookings = rawBookings.filter((b: any) => {
      const d = new Date(b.check_in_date);
      const matches = (
        (!from || d >= from) &&
        (!to || d <= to) &&
        (!filters.country || b.guest_country === filters.country) &&
        (!filters.province || b.guest_province === filters.province) &&
        (!filters.city || b.guest_city === filters.city)
      );
      return matches;
    });

    console.log('📊 Filtered bookings count:', filteredBookings.length);
    console.log('📊 First filtered booking:', filteredBookings[0]);
    
    setBookings(filteredBookings);

    // ===== CORE METRICS =====
    const totalBookings = filteredBookings.length;
    const totalRevenue = filteredBookings.reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
    const totalNights = filteredBookings.reduce((s: number, b: any) => s + (b.nights || 1), 0);

    const today = new Date().toLocaleDateString('en-CA');
    const todayBookings = filteredBookings.filter((b: any) => b.check_in_date === today).length;

    // ===== DATE RANGE =====
    let days = 365;
    if (from && to) {
      days = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24) + 1;
    }

    const totalRooms = business?.total_rooms || 1;
    const maxNights = totalRooms * days;
    const occupancyRate = maxNights ? Math.round((totalNights / maxNights) * 100) : 0;

    // ===== MONTHLY =====
    const monthlyMap: Record<string, any> = {};

    filteredBookings.forEach((b: any) => {
      const d = new Date(b.check_in_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;

      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          month: d.toLocaleString('default', { month: 'short' }),
          monthIndex: d.getMonth(),
          year: d.getFullYear(),
          bookings: 0,
          revenue: 0,
          nights: 0,
        };
      }

      monthlyMap[key].bookings++;
      monthlyMap[key].revenue += b.total_amount || 0;
      monthlyMap[key].nights += b.nights || 1;
    });

    const monthlyData = Object.values(monthlyMap)
      .map((m: any) => {
        const daysInMonth = new Date(m.year, m.monthIndex + 1, 0).getDate();
        const max = totalRooms * daysInMonth;
        return {
          ...m,
          density: max ? Math.round((m.nights / max) * 100) : 0,
        };
      })
      .sort((a: any, b: any) => a.year - b.year || a.monthIndex - b.monthIndex);

    // ===== GUEST ORIGINS =====
    const guestOrigins = {
      countries: {} as Record<string, number>,
      provinces: {} as Record<string, number>,
      cities: {} as Record<string, number>,
    };

    filteredBookings.forEach((b: any) => {
      if (b.guest_country)
        guestOrigins.countries[b.guest_country] = (guestOrigins.countries[b.guest_country] || 0) + 1;
      if (b.guest_province)
        guestOrigins.provinces[b.guest_province] = (guestOrigins.provinces[b.guest_province] || 0) + 1;
      if (b.guest_city)
        guestOrigins.cities[b.guest_city] = (guestOrigins.cities[b.guest_city] || 0) + 1;
    });

    // ===== RECENT CHECK-INS =====
    const recentCheckins = filteredBookings.slice(0, 10).map((b: any) => ({
      guest_name: b.guest_name,
      check_in_date: b.check_in_date,
      nights: b.nights || 1,
      total_amount: b.total_amount || 0,
    }));

    console.log('📊 Setting analytics with recent_checkins count:', recentCheckins.length);

    setAnalytics({
      total_bookings: totalBookings,
      total_revenue: totalRevenue,
      total_nights: totalNights,
      occupancy_rate: occupancyRate,
      today_bookings: todayBookings,
      monthly_data: monthlyData,
      guest_origins: guestOrigins,
      recent_checkins: recentCheckins,
    });
    
    console.log('✅ Analytics set successfully!');
  } catch (err) {
    console.error('❌ Error in loadAnalytics:', err);
    setError('Failed to load analytics');
  } finally {
    setAnalyticsLoading(false);
  }
};
  // ================= INIT =================
  useEffect(() => {
    const id = getBusinessId();
    if (!id) {
      navigate('/business/login');
      return;
    }

    fetch(`/.netlify/functions/get-business-profile?businessId=${id}`)
      .then((res) => res.json())
      .then(setBusiness)
      .catch(() => setError('Failed to load business data'))
      .finally(() => setLoading(false));
  }, []);

 // Auto-load when filters change or business loads
useEffect(() => {
  console.log('🔄 useEffect triggered - business:', business?.trading_name);
  if (business) {
    console.log('📡 Calling loadAnalytics from useEffect');
    loadAnalytics();
  } else {
    console.log('⚠️ business is null, waiting...');
  }
}, [dateFrom, dateTo, filters.country, filters.province, filters.city, business]);
  
  // ================= UI =================
  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!business) return <div className="p-10 text-center text-red-600">No business data found</div>;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold">{business.trading_name}</h1>

      {/* FILTERS */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="font-bold mb-4">Filters</h3>

        <div className="flex gap-4 flex-wrap items-end">
          <div>
            <label className="text-sm block">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm block">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>

          <button
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setFilters({ country: '', province: '', city: '' });
            }}
            className="bg-gray-200 px-4 py-2 rounded"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded shadow">
          ⚠️ {error}
        </div>
      )}

      {/* METRICS */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded shadow">
            <p className="text-gray-500 text-sm">Total Bookings</p>
            <h2 className="text-4xl font-bold">{analytics.total_bookings}</h2>
          </div>

          <div className="bg-white p-6 rounded shadow">
            <p className="text-gray-500 text-sm">Revenue</p>
            <h2 className="text-4xl font-bold">R {analytics.total_revenue.toLocaleString()}</h2>
          </div>

          <div className="bg-white p-6 rounded shadow">
            <p className="text-gray-500 text-sm">Occupancy Rate</p>
            <h2 className="text-4xl font-bold">{analytics.occupancy_rate}%</h2>
            <p className="text-xs text-gray-400">{analytics.total_nights} nights booked</p>
          </div>
        </div>
      )}

      {/* TODAY'S CHECK-INS */}
      {analytics && (
        <div className="bg-white p-6 rounded shadow">
          <h3 className="font-bold mb-2">Check-ins Today</h3>
          <p className="text-3xl font-bold">{analytics.today_bookings}</p>
        </div>
      )}

      {/* MONTHLY TREND */}
      {analytics?.monthly_data.length > 0 && (
        <div className="bg-white p-6 rounded shadow overflow-x-auto">
          <h3 className="font-bold mb-4">Monthly Booking Trend</h3>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Month</th>
                <th className="text-right py-2">Bookings</th>
                <th className="text-right py-2">Revenue</th>
                <th className="text-right py-2">Nights</th>
                <th className="text-right py-2">Occupancy</th>
              </tr>
            </thead>
            <tbody>
              {analytics.monthly_data.map((m, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">
                    {m.month} {m.year}
                  </td>
                  <td className="text-right">{m.bookings}</td>
                  <td className="text-right">R {m.revenue.toLocaleString()}</td>
                  <td className="text-right">{m.nights}</td>
                  <td className="text-right">{m.density}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* GUEST ORIGINS */}
      {analytics && Object.keys(analytics.guest_origins.countries).length > 0 && (
        <div className="bg-white p-6 rounded shadow">
          <h3 className="font-bold mb-4">Guest Origins</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Countries</h4>
              {Object.entries(analytics.guest_origins.countries).map(([country, count]) => (
                <div key={country} className="flex justify-between py-1">
                  <span>{country}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
            <div>
              <h4 className="font-semibold mb-2">Top Cities</h4>
              {Object.entries(analytics.guest_origins.cities)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([city, count]) => (
                  <div key={city} className="flex justify-between py-1">
                    <span>{city}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* RECENT CHECK-INS */}
      {analytics?.recent_checkins?.length > 0 && (
        <div className="bg-white p-6 rounded shadow overflow-x-auto">
          <h3 className="font-bold mb-4">Recent Check-ins</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Guest Name</th>
                <th className="text-left py-2">Check-in Date</th>
                <th className="text-right py-2">Nights</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {analytics.recent_checkins.map((guest, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{guest.guest_name}</td>
                  <td className="py-2">{guest.check_in_date}</td>
                  <td className="text-right">{guest.nights}</td>
                  <td className="text-right">R {guest.total_amount.toLocaleString()}</td>
                </tr>
              ))}
              {analytics.recent_checkins.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">
                    No check-ins found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* LOADING INDICATOR */}
      {analyticsLoading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading analytics...</p>
        </div>
      )}
    </div>
  );
}
