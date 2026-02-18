import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
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

  const handleDeleteBusiness = async (businessId: string) => {
    try {
      const response = await fetch('/.netlify/functions/delete-business', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId })
      });

      if (response.ok) {
        setBusinesses(businesses.filter(b => b.id !== businessId));
        setShowDeleteConfirm(null);
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
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Super Admin Portal</h1>
              <p className="text-gray-600 mt-1">Manage all businesses and subscriptions</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              Create New Business
            </button>
          </div>
        </div>
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
                    {showDeleteConfirm === business.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteBusiness(business.id)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowDeleteConfirm(business.id)}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                      >
                        Delete
                      </button>
                    )}
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
    </div>
  );
}
