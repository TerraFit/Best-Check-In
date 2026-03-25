import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAnalytics } from '../../hooks/useAnalytics';
import { getBusinessId } from '../../utils/auth';

interface BusinessProfile {
  id: string;
  trading_name: string;
  registered_name: string;
  email: string;
  phone: string;
  total_rooms?: number;
  avg_price?: number;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  welcome_message?: string;
}

export default function BusinessAnalytics() {
  const navigate = useNavigate();
  const { businessId: urlBusinessId } = useParams<{ businessId: string }>();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  
  // Get business ID from URL or auth
  const businessId = urlBusinessId || getBusinessId();
  
  // Fetch business details
  useEffect(() => {
    if (!businessId) {
      navigate('/business/login');
      return;
    }
    
    const fetchBusiness = async () => {
      try {
        const response = await fetch(`/.netlify/functions/get-business-profile?businessId=${businessId}`);
        const data = await response.json();
        if (data.id) {
          setBusiness(data);
        } else {
          navigate('/business/login');
        }
      } catch (error) {
        console.error('Error fetching business:', error);
        navigate('/business/login');
      } finally {
        setLoadingBusiness(false);
      }
    };
    
    fetchBusiness();
  }, [businessId, navigate]);
  
  // Use the analytics hook
  const {
    analytics,
    loading: analyticsLoading,
    error: analyticsError,
    filters,
    setFilters,
    refresh: refreshAnalytics
  } = useAnalytics(business?.total_rooms || 1);
  
  if (loadingBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }
  
  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Business not found</p>
          <button 
            onClick={() => navigate('/business/login')}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }
  
  const primaryColor = business.primary_color || '#f59e0b';
  const secondaryColor = business.secondary_color || '#1e1e1e';
  
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-stone-900 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.trading_name} className="h-10 w-auto" />
              ) : (
                <span className="font-bold text-amber-500">{business.trading_name}</span>
              )}
              <span className="text-stone-400 text-sm">Analytics Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/business/dashboard')}
                className="text-stone-400 hover:text-white text-sm"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => navigate('/business/login')}
                className="text-stone-400 hover:text-white text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-stone-900">Performance Analytics</h1>
          <p className="text-stone-500 mt-2">Track your business performance and guest insights</p>
        </div>
        
        {/* Refresh Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => refreshAnalytics()}
            disabled={analyticsLoading}
            className={`px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 text-sm shadow-md font-medium ${
              analyticsLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {analyticsLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Loading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </>
            )}
          </button>
        </div>
        
        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h3 className="text-lg font-semibold text-stone-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-stone-500 mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Country</label>
              <select
                value={filters.country || ''}
                onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg"
              >
                <option value="">All Countries</option>
                {analytics?.guestOrigins?.countries && Object.keys(analytics.guestOrigins.countries).map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({})}
                className="px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
        
        {analyticsError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-8">
            ⚠️ {analyticsError}
          </div>
        )}
        
        {analyticsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : analytics ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h4 className="text-sm uppercase tracking-widest text-stone-400">Total Bookings</h4>
                <p className="text-4xl font-serif font-bold text-stone-900 mt-2">{analytics.totalBookings}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h4 className="text-sm uppercase tracking-widest text-stone-400">Total Revenue</h4>
                <p className="text-4xl font-serif font-bold text-stone-900 mt-2">R {analytics.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h4 className="text-sm uppercase tracking-widest text-stone-400">Avg. Daily Rate (ADR)</h4>
                <p className="text-4xl font-serif font-bold text-stone-900 mt-2">R {Math.round(analytics.averageDailyRate).toLocaleString()}</p>
                <p className="text-xs text-stone-400 mt-1">Revenue per occupied room</p>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h4 className="text-sm uppercase tracking-widest text-stone-400">RevPAR</h4>
                <p className="text-4xl font-serif font-bold text-stone-900 mt-2">R {Math.round(analytics.revenuePerAvailableRoom).toLocaleString()}</p>
                <p className="text-xs text-stone-400 mt-1">Revenue per available room</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h4 className="text-sm uppercase tracking-widest text-stone-400">Occupancy Rate</h4>
                <p className="text-4xl font-serif font-bold text-stone-900 mt-2">{analytics.occupancyRate}%</p>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h4 className="text-sm uppercase tracking-widest text-stone-400">Average Stay</h4>
                <p className="text-4xl font-serif font-bold text-stone-900 mt-2">{analytics.averageStay.toFixed(1)} nights</p>
              </div>
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h4 className="text-sm uppercase tracking-widest text-stone-400">Check-ins Today</h4>
                <p className="text-4xl font-serif font-bold text-stone-900 mt-2">{analytics.todayBookings}</p>
              </div>
            </div>
            
            {/* Monthly Trend */}
            {analytics.monthlyTrend.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                <h3 className="text-lg font-semibold text-stone-900 mb-4">Monthly Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stone-200">
                        <th className="text-left py-2 text-sm text-stone-500">Month</th>
                        <th className="text-right py-2 text-sm text-stone-500">Bookings</th>
                        <th className="text-right py-2 text-sm text-stone-500">Revenue</th>
                        <th className="text-right py-2 text-sm text-stone-500">Nights</th>
                        <th className="text-right py-2 text-sm text-stone-500">Occupancy</th>
                       </tr>
                    </thead>
                    <tbody>
                      {analytics.monthlyTrend.map((month, idx) => (
                        <tr key={idx} className="border-b border-stone-100">
                          <td className="py-2 text-sm font-medium">{month.month} {month.year}</td>
                          <td className="py-2 text-sm text-right">{month.bookings}</td>
                          <td className="py-2 text-sm text-right">R {month.revenue.toLocaleString()}</td>
                          <td className="py-2 text-sm text-right">{month.nights}</td>
                          <td className="py-2 text-sm text-right">{month.occupancyRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Guest Origins */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-lg font-semibold text-stone-900 mb-4">Guest Origins by Country</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(analytics.guestOrigins.countries).map(([country, count]) => (
                    <div key={country} className="flex justify-between py-1">
                      <span className="text-sm text-stone-600">{country}</span>
                      <span className="text-sm font-medium text-stone-900">{count}</span>
                    </div>
                  ))}
                  {Object.keys(analytics.guestOrigins.countries).length === 0 && (
                    <p className="text-sm text-stone-400">No data available</p>
                  )}
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-lg font-semibold text-stone-900 mb-4">Top Cities</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(analytics.guestOrigins.cities)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([city, count]) => (
                      <div key={city} className="flex justify-between py-1">
                        <span className="text-sm text-stone-600">{city}</span>
                        <span className="text-sm font-medium text-stone-900">{count}</span>
                      </div>
                    ))}
                  {Object.keys(analytics.guestOrigins.cities).length === 0 && (
                    <p className="text-sm text-stone-400">No data available</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Recent Check-ins */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <h3 className="text-lg font-semibold text-stone-900 mb-4">Recent Check-ins</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-left py-2 text-sm text-stone-500">Guest Name</th>
                      <th className="text-left py-2 text-sm text-stone-500">Check-in Date</th>
                      <th className="text-right py-2 text-sm text-stone-500">Nights</th>
                      <th className="text-right py-2 text-sm text-stone-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recentCheckins.map((guest, idx) => (
                      <tr key={idx} className="border-b border-stone-100">
                        <td className="py-2 text-sm">{guest.guest_name}</td>
                        <td className="py-2 text-sm">{new Date(guest.check_in_date).toLocaleDateString()}</td>
                        <td className="py-2 text-sm text-right">{guest.nights || 1}</td>
                        <td className="py-2 text-sm text-right">R {(guest.total_amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {analytics.recentCheckins.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-stone-400">
                          No check-ins yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Top Room Types */}
            {analytics.topPerformingRoomTypes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-lg font-semibold text-stone-900 mb-4">Top Performing Room Types</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analytics.topPerformingRoomTypes.map((room, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-stone-50 rounded-lg">
                      <span className="font-medium text-stone-700">{room.roomType}</span>
                      <div className="text-right">
                        <span className="text-sm text-stone-600">{room.bookings} bookings</span>
                        <span className="ml-3 text-sm font-medium text-stone-900">R {room.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <p className="text-stone-500">No analytics data available yet.</p>
            <button
              onClick={() => refreshAnalytics()}
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Load Analytics
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
