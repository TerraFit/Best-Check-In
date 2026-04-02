import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBusinessId } from '../utils/auth';
import QRCodeModal from '../components/QRCodeModal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Types
interface Booking {
  id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guest_id_number?: string;
  guest_id_photo?: string;
  check_in_date: string;
  check_out_date?: string;
  nights: number;
  total_amount: number;
  status: string;
  guest_country?: string;
  guest_province?: string;
  guest_city?: string;
  referral_source?: string;
  booking_source?: string;  // ← ADDED
  business_id: string;
  marketing_consent?: boolean;
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
  avg_price?: number;
  physical_address?: {
    city: string;
    province: string;
    country: string;
  };
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

// Chart colors
const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#ec489a'];

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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [profileForm, setProfileForm] = useState({
    total_rooms: '',
    avg_price: '',
    logo_url: '',
    welcome_message: ''
  });

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'checkins', name: 'Check-ins' },
    { id: 'reports', name: 'Reports' },
    { id: 'settings', name: 'Settings' },
  ];

  // Simple fetch - no auth
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
        setProfileForm({
          total_rooms: data.total_rooms?.toString() || '',
          avg_price: data.avg_price?.toString() || '',
          logo_url: data.logo_url || '',
          welcome_message: data.welcome_message || ''
        });
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
      
      let rawBookings: Booking[] = [];
      if (data.bookings && Array.isArray(data.bookings)) {
        rawBookings = data.bookings;
      } else if (Array.isArray(data)) {
        rawBookings = data;
      }
      
      const validBookings = rawBookings.filter(b => b.business_id === businessId);
      console.log(`📦 Loaded ${validBookings.length} bookings`);
      
      // Debug: Log referral data
      console.log('📊 Sample referral data:', validBookings.slice(0, 3).map(b => ({
        name: b.guest_name,
        booking_source: b.booking_source,
        referral_source: b.referral_source
      })));
      
      setBookings(validBookings);
    } catch (err) {
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle logo file upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, GIF, etc.)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be less than 2MB');
      return;
    }

    setUploadingLogo(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Logo = reader.result as string;
      setProfileForm({ ...profileForm, logo_url: base64Logo });
      setUploadingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  // Save business profile
  const saveBusinessProfile = async () => {
    const businessId = getBusinessId();
    if (!businessId) return;

    try {
      const res = await fetch('/.netlify/functions/update-business-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          total_rooms: parseInt(profileForm.total_rooms) || 0,
          avg_price: parseInt(profileForm.avg_price) || 0,
          logo_url: profileForm.logo_url,
          welcome_message: profileForm.welcome_message
        })
      });

      if (res.ok) {
        const data = await res.json();
        setBusiness(data.business);
        setEditingProfile(false);
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Error saving profile');
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
    
    if (startDate) {
      filtered = filtered.filter(b => b.check_in_date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(b => b.check_in_date <= endDate);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(b => 
        b.guest_name?.toLowerCase().includes(term) ||
        b.guest_email?.toLowerCase().includes(term) ||
        b.guest_phone?.includes(term)
      );
    }
    
    if (statusFilter) {
      filtered = filtered.filter(b => b.status === statusFilter);
    }
    
    setFilteredBookings(filtered);
    setCurrentPage(1);
  }, [bookings, dateRange, startDate, endDate, searchTerm, statusFilter]);

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

  // Guest origin data for pie chart
  const guestOriginData = useMemo(() => {
    const countries: Record<string, number> = {};
    filteredBookings.forEach(b => {
      if (b.guest_country) {
        countries[b.guest_country] = (countries[b.guest_country] || 0) + 1;
      }
    });
    return Object.entries(countries).map(([name, value]) => ({ name, value }));
  }, [filteredBookings]);

  // Referral source data for pie chart - FIXED to use both fields
  const referralData = useMemo(() => {
    const sources: Record<string, number> = {};
    filteredBookings.forEach(b => {
      // Check both fields - booking_source has the data from our SQL updates
      const source = b.booking_source || b.referral_source;
      if (source && source !== 'NULL' && source !== 'null' && source.trim() !== '') {
        sources[source] = (sources[source] || 0) + 1;
      }
    });
    console.log('📊 Referral data for chart:', sources);
    return Object.entries(sources).map(([name, value]) => ({ name, value }));
  }, [filteredBookings]);

  // Pagination
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBookings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBookings, currentPage]);
  
  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const headers = ['Guest Name', 'Email', 'Phone', 'ID Number', 'Country', 'Province', 'City', 'Check-in Date', 'Check-out Date', 'Nights', 'Total Amount', 'Status', 'Referral Source'];
    const rows = filteredBookings.map(b => [
      `"${b.guest_name || ''}"`,
      `"${b.guest_email || ''}"`,
      `"${b.guest_phone || ''}"`,
      `"${b.guest_id_number || ''}"`,
      `"${b.guest_country || ''}"`,
      `"${b.guest_province || ''}"`,
      `"${b.guest_city || ''}"`,
      b.check_in_date || '',
      b.check_out_date || '',
      b.nights || 1,
      b.total_amount || 0,
      b.status || 'pending',
      `"${b.booking_source || b.referral_source || ''}"`
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

  const requestIDPhoto = (booking: Booking) => {
    if (confirm(`Request ID photo for ${booking.guest_name}? This will send a verification request.`)) {
      alert(`ID photo request sent to ${booking.guest_email}`);
    }
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
                <img src={business.logo_url} alt={business.trading_name} className="h-10 w-auto rounded-lg" />
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Business Information Card */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-white border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Business ID</p>
                    <p className="text-sm font-mono text-gray-700 mt-1">{business?.id || getBusinessId()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Trading Name</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{business?.trading_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Registered Name</p>
                    <p className="text-sm text-gray-700 mt-1">{business?.registered_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                    <p className="text-sm text-gray-700 mt-1">{business?.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
                    <p className="text-sm text-gray-700 mt-1">{business?.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Location</p>
                    <p className="text-sm text-gray-700 mt-1">{business?.physical_address?.city}, {business?.physical_address?.province}</p>
                  </div>
                  {business?.total_rooms && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Total Rooms</p>
                      <p className="text-sm text-gray-700 mt-1">{business.total_rooms}</p>
                    </div>
                  )}
                  {business?.avg_price && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Average Room Price</p>
                      <p className="text-sm text-gray-700 mt-1">R {business.avg_price.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.totalBookings}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">R {metrics.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm font-medium text-gray-500">Average Stay</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.avgStay} nights</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm font-medium text-gray-500">Check-ins Today</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.todayBookings}</p>
                <p className="text-xs text-gray-500 mt-1">{metrics.occupancyRate}% occupancy</p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Guest Origins by Country</h3>
                {guestOriginData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={guestOriginData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {guestOriginData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">How Guests Found You</h3>
                {referralData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    No data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={referralData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {referralData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
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
                      onClick={() => { setDateRange('30days'); setStartDate(''); setEndDate(''); setSearchTerm(''); setStatusFilter(''); }}
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referral</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedBookings.slice(0, 10).map((booking, index) => (
                        <tr key={booking.id || index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.guest_name || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.check_in_date || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.check_out_date || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{booking.nights || 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">R {(booking.total_amount || 0).toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.booking_source || booking.referral_source || 'N/A'}</td>
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
            </div>
          </div>
        )}

        {/* CHECK-INS TAB */}
        {activeTab === 'checkins' && (
          <div className="space-y-6">
            {/* Filters - Same as before */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <select
                    value={dateRange}
                    onChange={(e) => {
                      setDateRange(e.target.value as DateRange);
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="7days">Last 7 days</option>
                    <option value="30days">Last 30 days</option>
                    <option value="90days">Last 90 days</option>
                    <option value="12months">Last 12 months</option>
                    <option value="all">All time</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDateRange('all');
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDateRange('all');
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by name, email, or phone..."
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
                
                {(dateRange !== '30days' || startDate || endDate || searchTerm || statusFilter) && (
                  <button
                    onClick={() => {
                      setDateRange('30days');
                      setStartDate('');
                      setEndDate('');
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

            {/* Check-ins Table with Full Details */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">All Check-ins</h3>
                <p className="text-sm text-gray-500">Total: {filteredBookings.length} bookings</p>
              </div>
              <div className="overflow-x-auto">
                {filteredBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400">No check-ins found</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origin</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Number</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Nights</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referral</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedBookings.map((booking, index) => (
                        <tr key={booking.id || index} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {booking.guest_name || 'N/A'}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            <div>{booking.guest_email || 'N/A'}</div>
                            <div className="text-xs">{booking.guest_phone || 'N/A'}</div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            <div>{booking.guest_country || 'N/A'}</div>
                            <div className="text-xs">{booking.guest_province || ''} {booking.guest_city || ''}</div>
                          </td>
                          <td className="px-4 py-4 text-sm font-mono text-gray-500">
                            {booking.guest_id_number ? (
                              <span title="Click to request photo" className="cursor-help">
                                {booking.guest_id_number.substring(0, 8)}...
                              </span>
                            ) : 'N/A'}
                            {booking.guest_id_photo && (
                              <span className="ml-1 text-green-500" title="ID photo available">📷</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {booking.check_in_date || 'N/A'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            {booking.nights || 1}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            R {(booking.total_amount || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {booking.booking_source || booking.referral_source || 'N/A'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(booking.status)}`}>
                              {booking.status || 'pending'}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            {booking.guest_id_photo ? (
                              <button
                                onClick={() => alert('ID photo available in guest profile')}
                                className="text-blue-500 hover:text-blue-700 text-xs"
                                title="View ID photo"
                              >
                                View ID
                              </button>
                            ) : (
                              <button
                                onClick={() => requestIDPhoto(booking)}
                                className="text-orange-500 hover:text-orange-700 text-xs"
                                title="Request ID photo"
                              >
                                Request ID
                              </button>
                            )}
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

        {/* REPORTS TAB - Same structure with fixed referralData */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Report Period:</span>
                  <select
                    value={dateRange}
                    onChange={(e) => {
                      setDateRange(e.target.value as DateRange);
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="7days">Last 7 days</option>
                    <option value="30days">Last 30 days</option>
                    <option value="90days">Last 90 days</option>
                    <option value="12months">Last 12 months</option>
                    <option value="all">All time</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Custom:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDateRange('all');
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                    placeholder="From"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDateRange('all');
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                    placeholder="To"
                  />
                </div>
                
                {(dateRange !== '30days' || startDate || endDate) && (
                  <button
                    onClick={() => {
                      setDateRange('30days');
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="text-sm text-orange-600 hover:text-orange-700"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredBookings.length}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">R {filteredBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0).toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Average Stay</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {filteredBookings.length > 0 
                      ? (filteredBookings.reduce((sum, b) => sum + (b.nights || 1), 0) / filteredBookings.length).toFixed(1)
                      : '0'} nights
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Total Nights Booked</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {filteredBookings.reduce((sum, b) => sum + (b.nights || 1), 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Guest Origins</h3>
                {guestOriginData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    No data available for selected period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={guestOriginData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {guestOriginData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Referral Sources</h3>
                {referralData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    No data available for selected period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={referralData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {referralData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Report</h3>
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
            </div>
          </div>
        )}

        {/* SETTINGS TAB - Same as before */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Settings</h3>
            
            {!editingProfile ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Business Information</p>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-500">Business ID:</span> {getBusinessId()}</div>
                      <div><span className="text-gray-500">Trading Name:</span> {business?.trading_name}</div>
                      <div><span className="text-gray-500">Registered Name:</span> {business?.registered_name}</div>
                      <div><span className="text-gray-500">Email:</span> {business?.email}</div>
                      <div><span className="text-gray-500">Phone:</span> {business?.phone}</div>
                      {business?.physical_address?.city && (
                        <div><span className="text-gray-500">Location:</span> {business.physical_address.city}, {business.physical_address.province}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Property Details</p>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-500">Total Rooms:</span> {business?.total_rooms || 'Not set'}</div>
                      <div><span className="text-gray-500">Average Room Price:</span> {business?.avg_price ? `R ${business.avg_price.toLocaleString()}` : 'Not set'}</div>
                      <div><span className="text-gray-500">Welcome Message:</span> {business?.welcome_message || 'Not set'}</div>
                    </div>
                  </div>
                </div>
                
                {business?.logo_url && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Current Logo</p>
                    <img src={business.logo_url} alt="Business Logo" className="h-20 w-auto border rounded-lg p-2 bg-white" />
                  </div>
                )}
                
                <button
                  onClick={() => setEditingProfile(true)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Number of Rooms</label>
                    <input
                      type="number"
                      value={profileForm.total_rooms}
                      onChange={(e) => setProfileForm({ ...profileForm, total_rooms: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                      placeholder="e.g., 20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Average Room Price (ZAR)</label>
                    <input
                      type="number"
                      value={profileForm.avg_price}
                      onChange={(e) => setProfileForm({ ...profileForm, avg_price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                      placeholder="e.g., 1500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Logo</label>
                    <div className="flex items-center gap-4">
                      {profileForm.logo_url ? (
                        <img src={profileForm.logo_url} alt="Business Logo Preview" className="h-16 w-16 object-contain border rounded-lg p-1 bg-white" />
                      ) : (
                        <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          id="logo-upload"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          disabled={uploadingLogo}
                        />
                        <button
                          onClick={() => document.getElementById('logo-upload')?.click()}
                          disabled={uploadingLogo}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                          {uploadingLogo ? 'Uploading...' : 'Choose Image'}
                        </button>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 2MB</p>
                      </div>
                      {profileForm.logo_url && (
                        <button
                          onClick={() => setProfileForm({ ...profileForm, logo_url: '' })}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Message</label>
                    <textarea
                      value={profileForm.welcome_message}
                      onChange={(e) => setProfileForm({ ...profileForm, welcome_message: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Welcome to our establishment! We're glad to have you."
                    />
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={saveBusinessProfile}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditingProfile(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* QR Code Modal */}
      {showQRModal && business && (
        <QRCodeModal
          businessId={business.id}
          businessName={business.trading_name}
          businessLogo={business.logo_url}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </div>
  );
}
