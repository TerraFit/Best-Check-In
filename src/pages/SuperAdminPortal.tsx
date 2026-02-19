import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BusinessOverview from '../components/BusinessOverview'; // You'll need to create this component

interface Business {
  id: string;
  registered_name: string;
  trading_name: string;
  phone: string;
  email: string;
  physical_address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  subscription_tier: 'monthly' | 'annual';
  payment_status: 'paid' | 'overdue' | 'critical';
  last_payment_date?: string;
  payment_due_date?: string;
  days_overdue?: number;
  created_at: string;
  directors: any[];
  status: string;
}

type FilterType = {
  province: string;
  city: string;
  search: string;
};

export default function SuperAdminPortal() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  
  // Business Overview state
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [showOverview, setShowOverview] = useState(false);
  
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    businessId: string;
    businessName: string;
    isOpen: boolean;
    understandChecked: boolean;
  } | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState<FilterType>({
    province: '',
    city: '',
    search: ''
  });
  
  // Unique values for filter dropdowns
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [businesses, filters]);

  const fetchBusinesses = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-approved-businesses');
      const data = await response.json();
      
      // Calculate overdue days and payment status
      const businessesWithStatus = data.map((b: any) => {
        const daysOverdue = calculateOverdueDays(b);
        return {
          ...b,
          days_overdue: daysOverdue,
          payment_status: getPaymentStatus(daysOverdue)
        };
      });
      
      // Sort alphabetically by trading name
      const sorted = businessesWithStatus.sort((a, b) => 
        a.trading_name.localeCompare(b.trading_name)
      );
      
      setBusinesses(sorted);
      
      // Extract unique provinces and cities for filters
      const uniqueProvinces = [...new Set(sorted.map(b => b.physical_address?.province).filter(Boolean))];
      const uniqueCities = [...new Set(sorted.map(b => b.physical_address?.city).filter(Boolean))];
      
      setProvinces(uniqueProvinces);
      setCities(uniqueCities);
      
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateOverdueDays = (business: Business): number => {
    if (!business.payment_due_date) return 0;
    const dueDate = new Date(business.payment_due_date);
    const today = new Date();
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getPaymentStatus = (daysOverdue: number): 'paid' | 'overdue' | 'critical' => {
    if (daysOverdue === 0) return 'paid';
    if (daysOverdue >= 10) return 'critical';
    if (daysOverdue >= 5) return 'overdue';
    return 'paid'; // 1-4 days still considered paid but will show orange soon
  };

  const getStatusColor = (status: string, daysOverdue: number = 0) => {
    if (status !== 'approved') return 'bg-gray-100 text-gray-800';
    
    if (daysOverdue >= 10) return 'bg-red-100 text-red-800 border-l-4 border-red-600';
    if (daysOverdue >= 5) return 'bg-orange-100 text-orange-800 border-l-4 border-orange-500';
    if (daysOverdue > 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (business: Business) => {
    if (business.status !== 'approved') return business.status;
    
    if (business.days_overdue >= 10) 
      return `⚠️ CRITICAL: ${business.days_overdue} days overdue`;
    if (business.days_overdue >= 5) 
      return `⚠️ Overdue: ${business.days_overdue} days`;
    if (business.days_overdue > 0) 
      return `⚠️ Payment due: ${business.days_overdue} days`;
    return '✓ Active';
  };

  const applyFilters = () => {
    let filtered = [...businesses];

    if (filters.province) {
      filtered = filtered.filter(b => b.physical_address?.province === filters.province);
    }

    if (filters.city) {
      filtered = filtered.filter(b => b.physical_address?.city === filters.city);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(b => 
        b.trading_name.toLowerCase().includes(searchLower) ||
        b.registered_name.toLowerCase().includes(searchLower) ||
        b.email.toLowerCase().includes(searchLower)
      );
    }

    setFilteredBusinesses(filtered);
  };

  const handleSendReminder = async (businessId: string, daysOverdue: number) => {
    setSendingReminder(businessId);
    try {
      const response = await fetch('/.netlify/functions/send-payment-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, daysOverdue })
      });

      if (response.ok) {
        alert('Payment reminder sent successfully!');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Failed to send reminder');
    } finally {
      setSendingReminder(null);
    }
  };

  const handleDeleteBusiness = async () => {
    if (!deleteConfirm) return;
    
    try {
      const response = await fetch('/.netlify/functions/delete-business', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: deleteConfirm.businessId })
      });

      if (response.ok) {
        setBusinesses(businesses.filter(b => b.id !== deleteConfirm.businessId));
        setDeleteConfirm(null);
        alert('Business permanently deleted');
      }
    } catch (error) {
      console.error('Error deleting business:', error);
      alert('Failed to delete business');
    }
  };

  const handleArchiveBusiness = async (businessId: string) => {
    try {
      const response = await fetch('/.netlify/functions/archive-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId })
      });

      if (response.ok) {
        setBusinesses(businesses.filter(b => b.id !== businessId));
        alert('Business archived');
      }
    } catch (error) {
      console.error('Error archiving business:', error);
      alert('Failed to archive business');
    }
  };

  const openDeleteConfirm = (businessId: string, businessName: string) => {
    setDeleteConfirm({
      businessId,
      businessName,
      isOpen: true,
      understandChecked: false
    });
  };

  const openBusinessOverview = (businessId: string) => {
    setSelectedBusinessId(businessId);
    setShowOverview(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600">Loading businesses...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header with Navigation */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo and Navigation */}
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <span className="text-2xl font-bold text-orange-500">FastCheckin</span>
                <span className="ml-2 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">Admin</span>
              </div>
              
              {/* Navigation Links */}
              <nav className="flex space-x-4">
                <button
                  onClick={() => navigate('/')}
                  className="px-3 py-2 text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Home
                </button>
                <button
                  onClick={() => navigate('/business/login')}
                  className="px-3 py-2 text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Business Login
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-3 py-2 text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Register
                </button>
              </nav>
            </div>

            {/* Right side - Create Business Button */}
            <button
              onClick={() => navigate('/register')}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Business
            </button>
          </div>
        </div>
      </div>

      {/* Page Title */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage all businesses and subscriptions</p>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Business name or email..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
              <select
                value={filters.province}
                onChange={(e) => setFilters({ ...filters, province: e.target.value, city: '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Provinces</option>
                {provinces.map(province => (
                  <option key={province} value={province}>{province}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City/Town</label>
              <select
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Cities</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ province: '', city: '', search: '' })}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Showing {filteredBusinesses.length} of {businesses.length} businesses
          </p>
        </div>
      </div>

      {/* Businesses List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="space-y-4">
          {filteredBusinesses.map((business) => (
            <div key={business.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {business.trading_name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(business.status, business.days_overdue)}`}>
                        {getStatusText(business)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{business.registered_name}</p>
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Contact</p>
                        <p className="text-sm">{business.phone}</p>
                        <p className="text-sm">{business.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Location</p>
                        <p className="text-sm">{business.physical_address?.city}</p>
                        <p className="text-sm">{business.physical_address?.province}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Subscription</p>
                        <p className="text-sm capitalize">{business.subscription_tier}</p>
                        {business.last_payment_date && (
                          <p className="text-xs text-gray-500">
                            Last payment: {new Date(business.last_payment_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {/* Business Overview Button - NEW */}
                    <button
                      onClick={() => openBusinessOverview(business.id)}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm flex items-center gap-1"
                      title="View Business Overview Dashboard"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Overview
                    </button>

                    {/* Payment Reminder Button - Only show for overdue */}
                    {(business.days_overdue || 0) > 0 && (
                      <button
                        onClick={() => handleSendReminder(business.id, business.days_overdue || 0)}
                        disabled={sendingReminder === business.id}
                        className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
                      >
                        {sendingReminder === business.id ? 'Sending...' : 'Send Reminder'}
                      </button>
                    )}

                    {/* Archive Button */}
                    <button
                      onClick={() => handleArchiveBusiness(business.id)}
                      className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
                    >
                      Archive
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => openDeleteConfirm(business.id, business.trading_name)}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Warning for critical overdue */}
                {business.days_overdue >= 10 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      ⚠️ Payment {business.days_overdue} days overdue. Service will be suspended in {14 - business.days_overdue} days.
                    </p>
                  </div>
                )}

                {/* Warning for overdue */}
                {business.days_overdue >= 5 && business.days_overdue < 10 && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      ⚠️ Payment {business.days_overdue} days overdue. Please send reminder.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredBusinesses.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500 text-lg">No businesses found</p>
              <p className="text-gray-400 mt-2">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm?.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                Permanently Delete Business?
              </h3>
              
              <p className="text-sm text-gray-500 text-center mb-4">
                You are about to delete <span className="font-semibold text-gray-700">{deleteConfirm.businessName}</span>
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800 font-medium mb-2">
                  ⚠️ This action is permanent and cannot be undone
                </p>
                <p className="text-xs text-red-700">
                  All business data, including registrations, guest history, and settings will be permanently removed from the database.
                </p>
              </div>
              
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteConfirm.understandChecked}
                  onChange={(e) => setDeleteConfirm({
                    ...deleteConfirm,
                    understandChecked: e.target.checked
                  })}
                  className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">
                  I understand that this action is permanent and cannot be undone
                </span>
              </label>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteBusiness}
                  disabled={!deleteConfirm.understandChecked}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
                >
                  Permanently Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Business Overview Modal */}
      {showOverview && selectedBusinessId && (
        <BusinessOverview 
          businessId={selectedBusinessId} 
          onClose={() => setShowOverview(false)} 
        />
      )}
    </div>
  );
}
