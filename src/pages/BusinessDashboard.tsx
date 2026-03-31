import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBusinessId, getAuth } from '../utils/auth';
import { 
  CalendarIcon, 
  CurrencyDollarIcon, 
  UsersIcon, 
  ChartBarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  QrCodeIcon,
  UserPlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import QRCodeModal from '../components/QRCodeModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'checkins', name: 'Check-ins', icon: UsersIcon },
    { id: 'reports', name: 'Reports', icon: DocumentTextIcon },
    { id: 'settings', name: 'Settings', icon: Cog6ToothIcon },
  ];

  // ✅ SECURITY: Proper token retrieval - NO fallback to business ID
  const getAuthToken = useCallback((): string | null => {
    const auth = getAuth();
    if (!auth?.token) {
      console.warn('No valid auth token found');
      return null;
    }
    return auth.token;
  }, []);

  // Authenticated fetch with proper error handling
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    
    if (!token) {
      console.error('No auth token available, redirecting to login');
      navigate('/business/login');
      throw new Error('No authentication token');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });

    if (response.status === 401) {
      console.error('Auth token invalid or expired');
      navigate('/business/login');
      throw new Error('Session expired');
    }

    return response;
  }, [navigate, getAuthToken]);

  // Load business profile
  const loadBusinessProfile = useCallback(async () => {
    const businessId = getBusinessId();
    if (!businessId) return;

    try {
      const res = await authenticatedFetch(`/.netlify/functions/get-business-branding?id=${businessId}`);
      if (res.ok) {
        const data = await res.json();
        setBusiness(data);
      }
    } catch (err) {
      console.error('Failed to load business profile:', err);
    }
  }, [authenticatedFetch]);

  // ✅ SCALABILITY: Prepare for pagination - fetch all but prepare for backend pagination
  const loadBookings = useCallback(async () => {
    const businessId = getBusinessId();
    if (!businessId) {
      navigate('/business/login');
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with paginated endpoint when ready
      const res = await authenticatedFetch(
        `/.netlify/functions/get-business-bookings?businessId=${businessId}&limit=5000`
      );

      const data = await res.json();
      
      let rawBookings: Booking[] = [];
      if (data.bookings && Array.isArray(data.bookings)) {
        rawBookings = data.bookings;
      } else if (Array.isArray(data)) {
        rawBookings = data;
      }
      
      // Security filter: ensure bookings belong to this business
      const validBookings = rawBookings.filter(b => b.business_id === businessId);
      setBookings(validBookings);
    } catch (err) {
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authenticatedFetch, navigate]);

  // Apply filters to bookings
  const applyFilters = useCallback(() => {
    let filtered = [...bookings];
    
    // Date range filter
    const days = DATE_RANGES[dateRange];
    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filtered = filtered.filter(b => new Date(b.check_in_date) >= cutoffDate);
    }
    
    // Search filter (guest name or email)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(b => 
        b.guest_name?.toLowerCase().includes(term) ||
        b.guest_email?.toLowerCase().includes(term)
      );
    }
    
    // Status filter
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
  }, [loadBusinessProfile, loadBookings]);

  // Apply filters when dependencies change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Calculate metrics from filtered bookings
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

  // ✅ NEW: PDF Export
  const exportToPDF = useCallback(() => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text(`${business?.trading_name || 'Bookings'} Report`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Date Range: ${dateRange}`, 14, 36);
    
    // Table
    const tableData = filteredBookings.map(b => [
      b.guest_name || 'N/A',
      b.check_in_date || 'N/A',
      b.check_out_date || 'N/A',
      b.nights?.toString() || '1',
      `R ${(b.total_amount || 0).toLocaleString()}`,
      b.status || 'pending'
    ]);
    
    autoTable(doc, {
      head: [['Guest Name', 'Check-in', 'Check-out', 'Nights', 'Amount', 'Status']],
      body: tableData,
      startY: 45,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [245, 158, 11] }
    });
    
    doc.save(`${business?.trading_name || 'bookings'}_report_${new Date().toISOString().split('T')[0]}.pdf`);
  }, [filteredBookings, business, dateRange]);

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

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      checked_in: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  // Loading state
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
                <QrCodeIcon className="h-4 w-4" />
                QR Code
              </button>
              <button
                onClick={() => { setRefreshing(true); loadBookings(); }}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-orange-500 rounded-lg hover:bg-gray-100 transition-colors"
                title="Refresh data"
              >
                <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={exportToCSV}
                className="p-2 text-gray-500 hover:text-orange-500 rounded-lg hover:bg-gray-100 transition-colors"
                title="Export CSV"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>
              <button
                onClick={exportToPDF}
                className="p-2 text-gray-500 hover:text-orange-500 rounded-lg hover:bg-gray-100 transition-colors"
                title="Export PDF"
              >
                <DocumentTextIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => window.print()}
                className="p-2 text-gray-500 hover:text-orange-500 rounded-lg hover:bg-gray-100 transition-colors"
                title="Print"
              >
                <PrinterIcon className="h-5 w-5" />
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
                  flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.totalBookings}</p>
                  </div>
                  <div className="bg-blue-500 p-3 rounded-full">
                    <UsersIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">R {metrics.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="bg-green-500 p-3 rounded-full">
                    <CurrencyDollarIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Check-ins Today</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.todayBookings}</p>
                    <p className="text-xs text-gray-500 mt-1">{metrics.occupancyRate}% occupancy</p>
                  </div>
                  <div className="bg-orange-500 p-3 rounded-full">
                    <CalendarIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Average Stay</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.avgStay} nights</p>
                  </div>
                  <div className="bg-purple-500 p-3 rounded-full">
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
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
                    <UserPlusIcon className="h-5 w-5 text-white" />
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
                    <QrCodeIcon className="h-5 w-5 text-white" />
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
                  <FunnelIcon className="h-5 w-5 text-gray-400" />
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
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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

        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reports & Analytics</h3>
            <p className="text-gray-500 mb-4">Export your data for deeper analysis:</p>
            <div className="flex gap-4">
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Export to CSV
              </button>
              <button
                onClick={exportToPDF}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <DocumentTextIcon className="h-4 w-4" />
                Export to PDF
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <PrinterIcon className="h-4 w-4" />
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
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Profile Settings</p>
                <p className="text-sm text-gray-500">Profile customization features coming soon.</p>
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
