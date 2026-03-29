import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBusinessId, clearAuth, getAuth } from '../utils/auth';

interface Booking {
  id: string;
  guest_name: string;
  guest_email?: string;
  check_in_date: string;
  nights: number;
  total_amount: number;
  status: string;
  created_at?: string;
}

interface BusinessProfile {
  id: string;
  trading_name: string;
  registered_name: string;
  email: string;
  phone: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  welcome_message?: string;
}

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to get auth token
  const getAuthToken = (): string | null => {
    const auth = getAuth();
    return (auth as any)?.token || null;
  };

  // Authenticated fetch wrapper
  const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = getAuthToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      }
    });

    if (res.status === 401) {
      clearAuth();
      navigate('/business/login');
      throw new Error('Unauthorized - Please log in again');
    }

    return res;
  };

  // Load bookings from API
  const loadBookings = async (): Promise<void> => {
    try {
      const businessId = getBusinessId();
      if (!businessId) {
        console.warn('⚠️ No businessId found in localStorage');
        setLoading(false);
        return;
      }

      console.log('📡 Fetching bookings for business:', businessId);
      
      const res = await authenticatedFetch(
        `/.netlify/functions/get-business-bookings?businessId=${businessId}&limit=5000`
      );

      const data = await res.json();
      
      // Validate response
      if (!data.success) {
        throw new Error(data.error || 'Failed to load bookings');
      }
      
      const rawBookings: Booking[] = data?.bookings || [];
      console.log(`📦 Loaded ${rawBookings.length} bookings from API`);

      setBookings(rawBookings);
    } catch (err) {
      console.error('❌ loadBookings error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  // Load business profile
  const loadBusinessProfile = async (): Promise<void> => {
    try {
      const businessId = getBusinessId();
      if (!businessId) return;

      const res = await authenticatedFetch(`/.netlify/functions/get-business-branding?id=${businessId}`);
      
      if (res.ok) {
        const data = await res.json();
        setBusiness(data);
        console.log('✅ Business profile loaded:', data.trading_name);
      }
    } catch (err) {
      console.error('Failed to load business profile:', err);
    }
  };

  // Initial load
  useEffect(() => {
    const id = getBusinessId();
    if (!id) {
      console.log('No business ID found, redirecting to login');
      navigate('/business/login');
      return;
    }
    
    loadBusinessProfile();
    loadBookings();
  }, [navigate]);

  // Helper: Get today's date in South Africa timezone
  const getTodaySA = (): string => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });
  };

  // Calculate dashboard metrics
  const calculateMetrics = () => {
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const todayBookings = bookings.filter(b => b.check_in_date === getTodaySA()).length;
    const avgStay = totalBookings > 0 
      ? (bookings.reduce((sum, b) => sum + (b.nights || 1), 0) / totalBookings).toFixed(1)
      : '0';
    
    return { totalBookings, totalRevenue, todayBookings, avgStay };
  };

  // Get status badge color
  const getStatusBadge = (status: string): string => {
    switch (status) {
      case 'checked_in':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-600 mb-4">⚠️ {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { totalBookings, totalRevenue, todayBookings, avgStay } = calculateMetrics();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {business?.trading_name || 'Business Dashboard'}
          </h1>
          {business?.welcome_message && (
            <p className="text-gray-500 mt-1">{business.welcome_message}</p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Total Bookings</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{totalBookings}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              R {totalRevenue.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Average Stay</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{avgStay} nights</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Check-ins Today</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{todayBookings}</p>
          </div>
        </div>

        {/* Recent Check-ins Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Check-ins</h2>
          </div>
          
          <div className="overflow-x-auto">
            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No bookings found</p>
                <p className="text-sm text-gray-400 mt-1">
                  When guests check in, they'll appear here
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guest Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check-in Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nights
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.slice(0, 20).map((booking, index) => (
                    <tr key={booking.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {booking.guest_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {booking.check_in_date || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {booking.nights || 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        R {(booking.total_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(booking.status)}`}>
                          {booking.status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          {bookings.length > 20 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">
                Showing 20 of {bookings.length} bookings
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
