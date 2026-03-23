import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function BusinessAnalytics() {
  const navigate = useNavigate();
  const { businessId } = useParams();
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState('');
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [occupancyRate, setOccupancyRate] = useState(0);
  const [recentCheckins, setRecentCheckins] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, [businessId]);

  const fetchAnalytics = async () => {
    try {
      // Get business info from localStorage first
      const storedBusiness = localStorage.getItem('business');
      if (storedBusiness) {
        const business = JSON.parse(storedBusiness);
        setBusinessName(business.trading_name);
      }

      // Fetch analytics from API
      const response = await fetch(`/.netlify/functions/get-business-analytics?businessId=${businessId}`);
      const data = await response.json();
      
      if (data && data.analytics) {
        setTotalBookings(data.analytics.total_bookings || 0);
        setTotalRevenue(data.analytics.total_revenue || 0);
        setOccupancyRate(data.analytics.occupancy_rate || 0);
        setRecentCheckins(data.analytics.recent_checkins || []);
      }
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
      {/* Header */}
      <div className="bg-stone-900 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <img 
                src="/fastcheckin-logo.png" 
                alt="FastCheckin" 
                className="h-10 w-auto"
              />
              <p className="text-stone-400 text-sm">{businessName}</p>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate(`/business/dashboard`)}
                className="text-stone-400 hover:text-white text-sm"
              >
                Dashboard
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <h4 className="text-xs uppercase tracking-widest text-stone-400">Total Bookings</h4>
            <p className="text-3xl font-serif font-bold text-stone-900 mt-2">{totalBookings}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h4 className="text-xs uppercase tracking-widest text-stone-400">Total Revenue</h4>
            <p className="text-3xl font-serif font-bold text-stone-900 mt-2">R {totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h4 className="text-xs uppercase tracking-widest text-stone-400">Occupancy Rate</h4>
            <p className="text-3xl font-serif font-bold text-stone-900 mt-2">{occupancyRate}%</p>
          </div>
        </div>

        {/* Recent Check-ins */}
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
                {recentCheckins.length > 0 ? (
                  recentCheckins.map((guest: any, idx) => (
                    <tr key={idx} className="border-b border-stone-100">
                      <td className="py-2 text-sm">{guest.guest_name}</td>
                      <td className="py-2 text-sm">{new Date(guest.check_in_date).toLocaleDateString()}</td>
                      <td className="py-2 text-sm text-right">{guest.nights}</td>
                      <td className="py-2 text-sm text-right">R {guest.total_amount?.toLocaleString() || 0}</td>
                    </tr>
                  ))
                ) : (
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

        {/* Back Button */}
        <div className="mt-6">
          <button
            onClick={() => navigate('/business/dashboard')}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
