import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface BusinessAnalytics {
  id: string;
  trading_name: string;
  total_bookings: number;
  total_revenue: number;
  occupancy_rate: number;
  monthly_data: {
    month: string;
    bookings: number;
    revenue: number;
    occupancy: number;
  }[];
  recent_checkins: {
    id: string;
    guest_name: string;
    check_in_date: string;
    nights: number;
    total_amount: number;
  }[];
}

export default function BusinessAnalytics() {
  const navigate = useNavigate();
  const { businessId } = useParams();
  const [analytics, setAnalytics] = useState<BusinessAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analytics' | 'guests' | 'settings'>('analytics');

  useEffect(() => {
    fetchAnalytics();
  }, [businessId]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/.netlify/functions/get-business-analytics?businessId=${businessId}`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header with Navigation */}
      <div className="bg-stone-900 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <img 
                src="/fastcheckin-logo.png" 
                alt="FastCheckin" 
                className="h-10 w-auto"
              />
              <p className="text-stone-400 text-sm">{analytics?.trading_name}</p>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate(`/business/dashboard`)}
                className="text-stone-400 hover:text-white text-sm"
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'analytics' 
                    ? 'bg-amber-500 text-white' 
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('guests')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'guests' 
                    ? 'bg-amber-500 text-white' 
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Guest Registry
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'settings' 
                    ? 'bg-amber-500 text-white' 
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Settings
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('business');
                  navigate('/business/login');
                }}
                className="text-stone-400 hover:text-white text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow p-6">
                <h4 className="text-xs uppercase tracking-widest text-stone-400">Total Bookings</h4>
                <p className="text-3xl font-serif font-bold text-stone-900 mt-2">
                  {analytics?.total_bookings || 0}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <h4 className="text-xs uppercase tracking-widest text-stone-400">Total Revenue</h4>
                <p className="text-3xl font-serif font-bold text-stone-900 mt-2">
                  R {analytics?.total_revenue?.toLocaleString() || 0}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <h4 className="text-xs uppercase tracking-widest text-stone-400">Occupancy Rate</h4>
                <p className="text-3xl font-serif font-bold text-stone-900 mt-2">
                  {analytics?.occupancy_rate || 0}%
                </p>
              </div>
            </div>

            {/* Monthly Chart */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-left py-2 text-sm text-stone-500">Month</th>
                      <th className="text-right py-2 text-sm text-stone-500">Bookings</th>
                      <th className="text-right py-2 text-sm text-stone-500">Revenue</th>
                      <th className="text-right py-2 text-sm text-stone-500">Occupancy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics?.monthly_data?.map((month, idx) => (
                      <tr key={idx} className="border-b border-stone-100">
                        <td className="py-2 text-sm font-medium">{month.month}</td>
                        <td className="py-2 text-sm text-right">{month.bookings}</td>
                        <td className="py-2 text-sm text-right">R {month.revenue.toLocaleString()}</td>
                        <td className="py-2 text-sm text-right">{month.occupancy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'guests' && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Check-ins</h3>
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
                  {analytics?.recent_checkins?.map((guest, idx) => (
                    <tr key={idx} className="border-b border-stone-100">
                      <td className="py-2 text-sm">{guest.guest_name}</td>
                      <td className="py-2 text-sm">{new Date(guest.check_in_date).toLocaleDateString()}</td>
                      <td className="py-2 text-sm text-right">{guest.nights}</td>
                      <td className="py-2 text-sm text-right">R {guest.total_amount?.toLocaleString() || 0}</td>
                    </tr>
                  ))}
                  {(!analytics?.recent_checkins || analytics.recent_checkins.length === 0) && (
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
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">
              Business Settings
            </h2>
            <p className="text-stone-500 mb-8">
              Configure your business details and preferences.
            </p>

            <button
              onClick={() => navigate('/business/dashboard', { state: { openSettings: true } })}
              className="bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-700 transition-colors"
            >
              Go to Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
