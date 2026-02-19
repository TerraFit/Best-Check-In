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
  const [dateRange, setDateRange] = useState('30days');
  const [filterProvince, setFilterProvince] = useState('');
  const [filterCity, setFilterCity] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [businessId, dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/.netlify/functions/get-business-analytics?businessId=${businessId}&dateRange=${dateRange}`
      );
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {data?.business.trading_name} - Overview
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
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
                <p className="font-medium">{data?.business.trading_name}</p>
                <p className="text-sm text-gray-600">{data?.business.registered_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="font-medium">{data?.business.phone}</p>
                <p className="text-sm text-gray-600">{data?.business.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{data?.business.physical_address?.city}</p>
                <p className="text-sm text-gray-600">{data?.business.physical_address?.province}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Registration Date</p>
                <p className="font-medium">{new Date(data?.business.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Subscription</p>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    data?.business.subscription_tier === 'annual' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {data?.business.subscription_tier === 'annual' ? 'Annual Plan' : 'Monthly Plan'}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    data?.business.subscription_status === 'active' 
                      ? 'bg-green-100 text-green-800'
                      : data?.business.subscription_status === 'expiring'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {data?.business.subscription_status}
                  </span>
                </div>
                {data?.business.subscription_renewal_date && (
                  <p className="text-xs text-gray-500 mt-1">
                    Renews: {new Date(data.business.subscription_renewal_date).toLocaleDateString()}
                  </p>
                )}
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
              <p className="text-2xl font-bold text-gray-900">{data?.analytics.total_bookings}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500">Occupancy Rate</p>
              <p className="text-2xl font-bold text-gray-900">{data?.analytics.occupancy_rate}%</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">R {data?.analytics.total_revenue?.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500">Overall Rank</p>
              <p className="text-2xl font-bold text-gray-900">#{data?.comparisons.rankings.rank_overall}</p>
              <p className="text-xs text-gray-500">Top {data?.comparisons.rankings.percentile_overall}%</p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Monthly Booking Trend</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={Object.entries(data?.analytics.monthly_breakdown || {}).map(([month, count]) => ({ month, count }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Guest Origins - Province */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Guest Origins by Province</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(data?.analytics.guest_origins.provinces || {}).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(data?.analytics.guest_origins.provinces || {}).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* City Breakdown */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Top Cities</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={Object.entries(data?.analytics.guest_origins.cities || {})
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([city, count]) => ({ city, count }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="city" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Comparative Performance */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Comparative Performance</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>vs Province Average</span>
                    <span className="font-medium">
                      {((data?.analytics.occupancy_rate / (data?.comparisons.province_average.avg_occupancy || 1)) * 100 - 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 rounded-full h-2" 
                      style={{ width: `${Math.min(100, (data?.analytics.occupancy_rate / (data?.comparisons.province_average.avg_occupancy || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Overall Percentile</span>
                    <span className="font-medium">{data?.comparisons.rankings.percentile_overall}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 rounded-full h-2" 
                      style={{ width: `${data?.comparisons.rankings.percentile_overall || 0}%` }}
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
