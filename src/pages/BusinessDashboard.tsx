import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBusinessId } from '../utils/auth';
import QRCodeModal from '../components/QRCodeModal';

// Types
interface Booking {
  id: string;
  guest_name: string;
  guest_email?: string;
  check_in_date: string;
  check_out_date?: string;
  nights: number;
  total_amount: number;
  status: string;
  guest_country?: string;
  guest_province?: string;
  guest_city?: string;
  business_id: string;
}

interface BusinessProfile {
  id: string;
  trading_name: string;
  registered_name: string;
  email: string;
  phone: string;
  logo_url?: string;
  welcome_message?: string;
  total_rooms?: number;
}

// Constants
const ITEMS_PER_PAGE = 10;
const DATE_RANGES = {
  '7days': 7,
  '30days': 30,
  '90days': 90,
  '12months': 365,
  'all': null
} as const;

type DateRange = keyof typeof DATE_RANGES;

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'checkins', name: 'Check-ins' },
    { id: 'reports', name: 'Reports' },
    { id: 'settings', name: 'Settings' },
  ];

  // ✅ SIMPLE FETCH - NO AUTH TOKEN LOGIC
  const fetchData = async (url: string) => {
    const response = await fetch(url);
    return response;
  };

  // Load business profile
  const loadBusinessProfile = async () => {
    const businessId = getBusinessId();
    if (!businessId) return;

    try {
      const res = await fetchData(`/.netlify/functions/get-business-branding?id=${businessId}`);
      if (res.ok) {
        const data = await res.json();
        setBusiness(data);
        console.log('✅ Business profile loaded:', data.trading_name);
      }
    } catch (err) {
      console.error('Failed to load business profile:', err);
    }
  };

  // Load bookings
  const loadBookings = async () => {
    const businessId = getBusinessId();
    if (!businessId) {
      console.warn('⚠️ No businessId found');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('📡 Fetching bookings for business:', businessId);
      
      const res = await fetchData(
        `/.netlify/functions/get-business-bookings?businessId=${businessId}&limit=5000`
      );

      const data = await res.json();
      console.log('📦 API Response:', data);
      
      let rawBookings: Booking[] = [];
      if (data.bookings && Array.isArray(data.bookings)) {
        rawBookings = data.bookings;
      } else if (Array.isArray(data)) {
        rawBookings = data;
      }
      
      const validBookings = rawBookings.filter(b => b.business_id === businessId);
      console.log(`📦 Loaded ${validBookings.length} bookings`);
      setBookings(validBookings);
    } catch (err) {
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Apply filters to bookings
  const applyFilters = useCallback(() => {
    let filtered = [...bookings];
    
    const days = DATE_RANGES[dateRange];
    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filtered = filtered.filter(b => new Date(b.check_in_date) >= cutoffDate);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(b => 
        b.guest_name?.toLowerCase().includes(term) ||
        b.guest_email?.toLowerCase().includes(term)
      );
    }
    
    if (statusFilter) {
      filtered = filtered.filter(b => b.status === statusFilter);
    }
    
    setFilteredBookings(filtered);
    setCurrentPage(1);
  }, [bookings, dateRange, searchTerm, statusFilter]);

  // Initial load
  useEffect(() => {
    loadBusinessProfile();
    loadBookings();
  }, []);

  // Apply filters when dependencies change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalBookings = filteredBookings.length;
    const totalRevenue = filteredBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const avgStay = totalBookings > 0 
      ? (filteredBookings.reduce((sum, b) => sum + (b.nights || 1), 0) / totalBookings).toFixed(1)
      : '0';
    
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });
    const todayBookings = filteredBookings.filter(b => b.check_in_date === today).length;
    
    const occupancyRate = business?.total_rooms && business.total_rooms > 0
      ? Math.min(100, Math.round((todayBookings / business.total_rooms) * 100))
      : 0;
    
    return { totalBookings, totalRevenue, avgStay, todayBookings, occupancyRate };
  }, [filteredBookings, business]);

  // Pagination
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBookings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBookings, currentPage]);
  
  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const headers = ['Guest Name', 'Email', 'Check-in Date', 'Check-out Date', 'Nights', 'Total Amount', 'Status'];
    const rows = filteredBookings.map(b => [
      `"${b.guest_name || ''}"`,
      `"${b.guest_email || ''}"`,
      b.check_in_date || '',
      b.check_out_date || '',
      b.nights || 1,
      b.total_amount || 0,
      b.status || 'pending'
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${business?.trading_name || 'bookings'}_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredBookings, business]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      checked_in: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const refreshData = () => {
    setRefreshing(true);
    loadBookings();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              {business?.logo_url ? (
                <img src={business.logo_url} alt={business.trading_name} className="h-10 w-auto" />
              ) : (
                <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-lg">
                    {business?.trading_name?.charAt(0) || 'B'}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{business?.trading_name || 'Business Dashboard'}</h1>
                {business?.welcome_message && (
                  <p className="text-xs text-gray-500">{business.welcome_message}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowQRModal(true)}
                className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                QR Code
              </button>
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-orange-500 rounded-lg hover:bg-gray-100 transition-colors"
                title="Refresh data"
              >
                <svg className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={exportToCSV}
                className="p-2 text-gray-500 hover:text-orange-500 rounded-lg hover:bg-gray-100 transition-colors"
                title="Export CSV"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button
                onClick={() => window.print()}
                className="p-2 text-gray-500 hover:text-orange-500 rounded-lg hover:bg-gray-100 transition-colors"
                title="Print"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content - Overview Tab */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.totalBookings}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">R {metrics.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm font-medium text-gray-500">Average Stay</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.avgStay} nights</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm font-medium text-gray-500">Check-ins Today</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.todayBookings}</p>
                <p className="text-xs text-gray-500 mt-1">{metrics.occupancyRate}% occupancy</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => window.location.href = '/checkin'}
                  className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all hover:border-orange-200 text-left"
                >
                  <div className="bg-orange-500 p-3 rounded-full">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">New Check-in</p>
                    <p className="text-xs text-gray-500">Quick check-in for arriving guests</p>
                  </div>
                </button>
                <button
                  onClick={() => setShowQRModal(true)}
                  className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all hover:border-orange-200 text-left"
                >
                  <div className="bg-blue-500 p-3 rounded-full">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">QR Code</p>
                    <p className="text-xs text-gray-500">Display check-in QR code</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as DateRange)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="7days">Last 7 days</option>
                    <option value="30days">Last 30 days</option>
                    <option value="90days">Last 90 days</option>
                    <option value="12months">Last 12 months</option>
                    <option value="all">All time</option>
                  </select>
                </div>
                
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by guest name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">All Statuses</option>
                  <option value="checked_in">Checked In</option>
                  <option value="completed">Completed</option>
                  <option value="confirmed">Confirmed</option>
                </select>
                
                {(dateRange !== '30days' || searchTerm || statusFilter) && (
                  <button
                    onClick={() => {
                      setDateRange('30days');
                      setSearchTerm('');
                      setStatusFilter('');
                    }}
                    className="text-sm text-orange-600 hover:text-orange-700"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Recent Check-ins Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Recent Check-ins</h3>
                <p className="text-sm text-gray-500">Showing {filteredBookings.length} of {bookings.length} bookings</p>
              </div>
              <div className="overflow-x-auto">
                {filteredBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400">No check-ins match your filters</p>
                    <button
                      onClick={() => { setDateRange('30days'); setSearchTerm(''); setStatusFilter(''); }}
                      className="mt-2 text-orange-500 hover:text-orange-600 text-sm"
                    >
                      Clear all filters
                    </button>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Nights</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                       </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedBookings.map((booking, index) => (
                        <tr key={booking.id || index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.guest_name || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.check_in_date || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.check_out_date || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{booking.nights || 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">R {(booking.total_amount || 0).toLocaleString()}</td>
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
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredBookings.length)} of {filteredBookings.length} bookings
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Check-ins Tab */}
        {activeTab === 'checkins' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">All Check-ins</h3>
              <p className="text-sm text-gray-500">Total: {filteredBookings.length} bookings</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Nights</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedBookings.map((booking, index) => (
                    <tr key={booking.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.guest_name || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.check_in_date || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.check_out_date || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{booking.nights || 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">R {(booking.total_amount || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(booking.status)}`}>
                          {booking.status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredBookings.length)} of {filteredBookings.length} bookings
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reports & Analytics</h3>
            <p className="text-gray-500 mb-4">Export your data for deeper analysis:</p>
            <div className="flex gap-4">
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export to CSV
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Report
              </button>
            </div>
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Summary Statistics</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Date range:</span> {dateRange}</div>
                <div><span className="text-gray-500">Total bookings:</span> {filteredBookings.length}</div>
                <div><span className="text-gray-500">Total revenue:</span> R {metrics.totalRevenue.toLocaleString()}</div>
                <div><span className="text-gray-500">Average stay:</span> {metrics.avgStay} nights</div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Settings</h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Business Information</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">Business ID:</span> {getBusinessId()}</div>
                  <div><span className="text-gray-500">Trading Name:</span> {business?.trading_name}</div>
                  <div><span className="text-gray-500">Registered Name:</span> {business?.registered_name}</div>
                  <div><span className="text-gray-500">Email:</span> {business?.email}</div>
                  <div><span className="text-gray-500">Phone:</span> {business?.phone}</div>
                  {business?.total_rooms && <div><span className="text-gray-500">Total Rooms:</span> {business.total_rooms}</div>}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* QR Code Modal */}
      {showQRModal && business && (
        <QRCodeModal
          businessId={business.id}
          businessName={business.trading_name}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </div>
  );
}
