// src/components/BusinessOverview.tsx
import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer 
} from 'recharts';

interface BusinessOverviewProps {
  businessId: string;
  onClose: () => void;
}

export default function BusinessOverview({ businessId, onClose }: BusinessOverviewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30days');

  useEffect(() => {
    fetchAnalytics();
  }, [businessId, dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/.netlify/functions/get-business-analytics?businessId=${businessId}&dateRange=${dateRange}`
      );
      
      // Check if response is OK
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Check if result has the expected structure
      if (!result || (!result.business && !result.error)) {
        throw new Error('Invalid data structure received from server');
      }
      
      // Check for API error
      if (result.error) {
        throw new Error(result.error);
      }
      
      setData(result);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(error instanceof Error ? error.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto p-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full p-8">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Business Data</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <p className="text-sm text-gray-400 mb-6">The analytics service may be temporarily unavailable.</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={fetchAnalytics}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!data || !data.business) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full p-8">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-500 mb-6">No analytics data is available for this business yet.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Safe data access with fallbacks
  const business = data.business || {};
  const analytics = data.analytics || {};
  const comparisons = data.comparisons || {};
  const rankings = comparisons.rankings || {};
  const provinceAverage = comparisons.province_average || {};

  // Safe arrays for charts
  const monthlyData = analytics.monthly_breakdown 
    ? Object.entries(analytics.monthly_breakdown).map(([month, count]) => ({ month, count }))
    : [];
  
  const provinceData = analytics.guest_origins?.provinces
    ? Object.entries(analytics.guest_origins.provinces).map(([name, value]) => ({ name, value }))
    : [];
  
  const cityData = analytics.guest_origins?.cities
    ? Object.entries(analytics.guest_origins.cities)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 5)
        .map(([city, count]) => ({ city, count }))
    : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {business.trading_name || 'Business'} - Overview
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Business Details Section */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Business Name</p>
                <p className="font-medium">{business.trading_name || 'N/A'}</p>
                <p className="text-sm text-gray-600">{business.registered_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="font-medium">{business.phone || 'N/A'}</p>
                <p className="text-sm text-gray-600">{business.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{business.physical_address?.city || 'N/A'}</p>
                <p className="text-sm text-gray-600">{business.physical_address?.province || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Registration Date</p>
                <p className="font-medium">{business.created_at ? new Date(business.created_at).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Subscription</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    business.subscription_tier === 'annual' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {business.subscription_tier === 'annual' ? 'Annual Plan' : 'Monthly Plan'}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    business.subscription_status === 'active' 
                      ? 'bg-green-100 text-green-800'
                      : business.subscription_status === 'expiring'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {business.subscription_status || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 items-center">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="12months">Last 12 Months</option>
            </select>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.total_bookings || 0}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500">Occupancy Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.occupancy_rate || 0}%</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">R {(analytics.total_revenue || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500">Overall Rank</p>
              <p className="text-2xl font-bold text-gray-900">#{rankings.rank_overall || 'N/A'}</p>
              <p className="text-xs text-gray-500">Top {rankings.percentile_overall || 0}%</p>
            </div>
          </div>

          {/* Charts Grid - Only show if data exists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Monthly Booking Trend</h4>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  No monthly data available
                </div>
              )}
            </div>

            {/* Guest Origins - Province */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Guest Origins by Province</h4>
              {provinceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={provinceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {provinceData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  No province data available
                </div>
              )}
            </div>

            {/* City Breakdown */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Top Cities</h4>
              {cityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={cityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="city" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  No city data available
                </div>
              )}
            </div>

            {/* Comparative Performance */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Comparative Performance</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>vs Province Average</span>
                    <span className="font-medium">
                      {analytics.occupancy_rate && provinceAverage.avg_occupancy
                        ? ((analytics.occupancy_rate / provinceAverage.avg_occupancy) * 100 - 100).toFixed(1)
                        : 'N/A'}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 rounded-full h-2" 
                      style={{ 
                        width: `${Math.min(100, (analytics.occupancy_rate / (provinceAverage.avg_occupancy || 1)) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Overall Percentile</span>
                    <span className="font-medium">{rankings.percentile_overall || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 rounded-full h-2" 
                      style={{ width: `${rankings.percentile_overall || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
