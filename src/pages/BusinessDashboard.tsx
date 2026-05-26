// src/pages/BusinessDashboard.tsx
// FULL PRODUCTION REWRITE — CLEANED, STABLE, SCALABLE

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

import QRCodeModal from '../components/QRCodeModal';
import AppealModal from '../components/AppealModal';
import ImportGoogleForms from '../components/ImportGoogleForms';
import LoadingButton from '../components/LoadingButton';

import { clearAuth, getBusinessId } from '../utils/auth';

// ============================================================
// TYPES
// ============================================================

interface Booking {
  id: string;
  guest_name: string;
  guest_first_name?: string;
  guest_last_name?: string;
  guest_email?: string;
  guest_phone?: string;
  guest_id_number?: string;
  check_in_date: string;
  check_out_date?: string;
  nights: number;
  total_amount: number;
  status: string;
  guest_country?: string;
  guest_province?: string;
  guest_city?: string;
  referral_source?: string;
  booking_source?: string;
  marketing_consent?: boolean;
}

interface BusinessProfile {
  id: string;
  trading_name: string;
  registered_name?: string;
  email: string;
  phone: string;
  logo_url?: string;
  slogan?: string;
  hero_image_url?: string;
  welcome_message?: string;
  total_rooms?: number;
  avg_price?: number;
  subscription_status?: string;
  trial_end?: string;
}

interface Filters {
  dateRange: 'all' | '7days' | '30days' | '90days' | '12months';
  startDate: string;
  endDate: string;
  searchTerm: string;
  statusFilter: string;
  provinceFilter: string;
  cityFilter: string;
  countryFilter: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

const COLORS = [
  '#f59e0b',
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
  '#84cc16',
  '#ec489a',
];

const DEFAULT_FILTERS: Filters = {
  dateRange: 'all',
  startDate: '',
  endDate: '',
  searchTerm: '',
  statusFilter: '',
  provinceFilter: '',
  cityFilter: '',
  countryFilter: '',
};

// ============================================================
// HELPERS
// ============================================================

const escapeCSV = (value: unknown): string => {
  const str = String(value ?? '');
  return `"${str.replace(/"/g, '""')}"`;
};

const getStatusBadge = (status: string): string => {
  const styles: Record<string, string> = {
    checked_in: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return styles[status] || 'bg-gray-100 text-gray-800';
};

// ============================================================
// COMPONENT
// ============================================================

export default function BusinessDashboard() {
  const navigate = useNavigate();

  // ============================================================
  // REFS
  // ============================================================

  const abortRef = useRef<AbortController | null>(null);

  // ============================================================
  // DATA STATE
  // ============================================================

  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // ============================================================
  // UI STATE
  // ============================================================

  const [activeTab, setActiveTab] = useState<
    'overview' | 'checkins' | 'reports' | 'settings'
  >('overview');

  const [showQRModal, setShowQRModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);

  // ============================================================
  // LOADING STATE
  // ============================================================

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshingBookings, setRefreshingBookings] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // ============================================================
  // PAGINATION
  // ============================================================

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBookingsCount, setTotalBookingsCount] = useState(0);

  // ============================================================
  // FILTERS
  // ============================================================

  const [filters, setFilters] = useState({
    overview: DEFAULT_FILTERS,
    checkins: DEFAULT_FILTERS,
    reports: {
      ...DEFAULT_FILTERS,
      dateRange: '30days' as const,
    },
  });

  const currentFilters =
    filters[activeTab as keyof typeof filters] || filters.overview;

  // ============================================================
  // AUTH HELPERS
  // ============================================================

  const getAuthHeaders = useCallback(() => {
    let token: string | null = null;

    try {
      const auth = localStorage.getItem('fastcheckin_auth');
      if (auth) {
        token = JSON.parse(auth).token;
      }
    } catch (error) {
      console.error(error);
    }

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...getAuthHeaders(),
          ...options.headers,
        },
      });

      if (response.status === 401) {
        clearAuth();
        navigate('/business/login');
        throw new Error('Unauthorized');
      }

      return response;
    },
    [getAuthHeaders, navigate]
  );

  // ============================================================
  // FILTER ACTIONS
  // ============================================================

  const updateFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      setCurrentPage(1);

      setFilters((prev) => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab as keyof typeof prev],
          [key]: value,
        },
      }));
    },
    [activeTab]
  );

  const clearCurrentFilters = useCallback(() => {
    setCurrentPage(1);

    setFilters((prev) => ({
      ...prev,
      [activeTab]: {
        ...DEFAULT_FILTERS,
        dateRange: activeTab === 'reports' ? '30days' : 'all',
      },
    }));
  }, [activeTab]);

  // ============================================================
  // LOAD BUSINESS PROFILE
  // ============================================================

  const loadBusinessProfile = useCallback(async () => {
    const businessId = getBusinessId();

    if (!businessId) return;

    try {
      const response = await fetchWithAuth(
        `/.netlify/functions/get-business-profile?businessId=${businessId}`
      );

      const result = await response.json();

      setBusiness(result.data || result.business || result);
    } catch (error) {
      console.error('Failed to load business profile', error);
    }
  }, [fetchWithAuth]);

  // ============================================================
  // LOAD BOOKINGS
  // ============================================================

  const loadBookings = useCallback(async () => {
    const businessId = getBusinessId();

    if (!businessId) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setRefreshingBookings(true);

    try {
      const params = new URLSearchParams({
        businessId,
        page: String(currentPage),
        limit: String(pageSize),
        search: currentFilters.searchTerm,
        status: currentFilters.statusFilter,
        province: currentFilters.provinceFilter,
        city: currentFilters.cityFilter,
        country: currentFilters.countryFilter,
      });

      if (currentFilters.startDate) {
        params.append('startDate', currentFilters.startDate);
      }

      if (currentFilters.endDate) {
        params.append('endDate', currentFilters.endDate);
      }

      const response = await fetchWithAuth(
        `/.netlify/functions/get-business-bookings?${params.toString()}`,
        {
          signal: controller.signal,
        }
      );

      const result = await response.json();

      const rows = result.bookings || result.data || [];

      setBookings(rows);
      setTotalBookingsCount(result.total || rows.length);
      setTotalPages(result.totalPages || 1);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to load bookings', error);
      }
    } finally {
      setRefreshingBookings(false);
    }
  }, [
    fetchWithAuth,
    currentPage,
    pageSize,
    currentFilters.searchTerm,
    currentFilters.statusFilter,
    currentFilters.provinceFilter,
    currentFilters.cityFilter,
    currentFilters.countryFilter,
    currentFilters.startDate,
    currentFilters.endDate,
  ]);

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    const init = async () => {
      setInitialLoading(true);
      await loadBusinessProfile();
      setInitialLoading(false);
    };

    init();
  }, [loadBusinessProfile]);

  // ============================================================
  // BOOKING EFFECT
  // ============================================================

  useEffect(() => {
    if (!initialLoading) {
      loadBookings();
    }
  }, [loadBookings, initialLoading]);

  // ============================================================
  // CLEANUP
  // ============================================================

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  // ============================================================
  // MEMOIZED ANALYTICS
  // ============================================================

  const guestOriginData = useMemo(() => {
    const counts: Record<string, number> = {};

    bookings.forEach((booking) => {
      if (!booking.guest_country) return;

      counts[booking.guest_country] =
        (counts[booking.guest_country] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bookings]);

  const referralData = useMemo(() => {
    const counts: Record<string, number> = {};

    bookings.forEach((booking) => {
      const source = booking.booking_source || booking.referral_source;

      if (!source) return;

      const clean = source.replace(/\.$/, '').trim();

      counts[clean] = (counts[clean] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bookings]);

  const metrics = useMemo(() => {
    return {
      totalBookings: bookings.length,
      totalRevenue: bookings.reduce(
        (sum, booking) => sum + (booking.total_amount || 0),
        0
      ),
      averageStay:
        bookings.length > 0
          ? (
              bookings.reduce(
                (sum, booking) => sum + (booking.nights || 1),
                0
              ) / bookings.length
            ).toFixed(1)
          : '0',
    };
  }, [bookings]);

  // ============================================================
  // CSV EXPORT
  // ============================================================

  const exportCSV = useCallback(() => {
    const headers = [
      'Guest Name',
      'Email',
      'Phone',
      'Country',
      'Province',
      'City',
      'Check-in',
      'Nights',
      'Amount',
      'Status',
    ];

    const rows = bookings.map((booking) => [
      escapeCSV(booking.guest_name),
      escapeCSV(booking.guest_email),
      escapeCSV(booking.guest_phone),
      escapeCSV(booking.guest_country),
      escapeCSV(booking.guest_province),
      escapeCSV(booking.guest_city),
      escapeCSV(booking.check_in_date),
      booking.nights,
      booking.total_amount,
      escapeCSV(booking.status),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `bookings-${Date.now()}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }, [bookings]);

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {
    clearAuth();
    navigate('/business/login');
  };

  // ============================================================
  // LOADING SCREEN
  // ============================================================

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {business?.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.trading_name}
                className="h-10 w-auto rounded-lg"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <span className="text-orange-600 font-bold">
                  {business?.trading_name?.charAt(0) || 'B'}
                </span>
              </div>
            )}

            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {business?.trading_name || 'Business Dashboard'}
              </h1>

              {business?.slogan && (
                <p className="text-xs text-gray-500 italic">
                  {business.slogan}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadBookings}
              disabled={refreshingBookings}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              Refresh
            </button>

            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              Export CSV
            </button>

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-500">Total Bookings</p>
            <p className="text-3xl font-bold mt-2">
              {metrics.totalBookings}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-500">Revenue</p>
            <p className="text-3xl font-bold mt-2">
              R {metrics.totalRevenue.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm text-gray-500">Average Stay</p>
            <p className="text-3xl font-bold mt-2">
              {metrics.averageStay} nights
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-6 h-96">
            <h3 className="font-semibold mb-4">Guest Origins</h3>

            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={guestOriginData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={120}
                >
                  {guestOriginData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow p-6 h-96">
            <h3 className="font-semibold mb-4">Referral Sources</h3>

            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={referralData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-3 flex-wrap">
              <input
                type="text"
                placeholder="Search guests..."
                value={currentFilters.searchTerm}
                onChange={(e) =>
                  updateFilter('searchTerm', e.target.value)
                }
                className="px-3 py-2 border rounded-lg"
              />

              <select
                value={currentFilters.statusFilter}
                onChange={(e) =>
                  updateFilter('statusFilter', e.target.value)
                }
                className="px-3 py-2 border rounded-lg"
              >
                <option value="">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <button
                onClick={clearCurrentFilters}
                className="px-3 py-2 text-orange-600"
              >
                Clear Filters
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Show:</span>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border rounded-lg"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Guest
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Country
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Check-In
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      {booking.guest_name}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-500">
                      <div>{booking.guest_email || 'N/A'}</div>
                      <div className="text-xs">
                        {booking.guest_phone || 'N/A'}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-500">
                      {booking.guest_country || 'N/A'}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-500">
                      {booking.check_in_date}
                    </td>

                    <td className="px-4 py-4 text-sm text-right text-gray-500">
                      R {(booking.total_amount || 0).toLocaleString()}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Total: {totalBookingsCount} bookings
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.max(1, p - 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Previous
                </button>

                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {showQRModal && business && (
        <QRCodeModal
          businessId={business.id}
          businessName={business.trading_name}
          businessLogo={business.logo_url}
          businessPhone={business.phone}
          onClose={() => setShowQRModal(false)}
        />
      )}

      {showImportModal && business && (
        <ImportGoogleForms
          businessId={business.id}
          onImportComplete={loadBookings}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {showAppealModal && (
        <AppealModal
          isOpen={showAppealModal}
          onClose={() => setShowAppealModal(false)}
          request={null as any}
          business={
            business
              ? {
                  id: business.id,
                  trading_name: business.trading_name,
                  email: business.email,
                }
              : null
          }
          onSubmit={() => setShowAppealModal(false)}
        />
      )}
    </div>
  );
}
