import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BusinessOverview from '../components/BusinessOverview';
import QRCodeModal from '../components/QRCodeModal';
import { getAuth, clearAuth } from '../utils/auth';

interface Director {
  name: string;
  idNumber: string;
  idPhoto?: string;
}

interface Business {
  id: string;
  registered_name: string;
  trading_name: string;
  legal_name?: string;
  registration_number?: string;
  business_number?: string;
  vat_number?: string;
  establishment_type?: string;
  tgsa_grading?: string;
  phone: string;
  email: string;
  physical_address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country?: string;
  };
  physical_address_locked?: any;
  postal_address?: any;
  subscription_tier: 'monthly' | 'annual';
  payment_status: 'paid' | 'overdue' | 'critical';
  last_payment_date?: string;
  payment_due_date?: string;
  days_overdue?: number;
  created_at: string;
  directors: Director[];
  status: string;
  total_rooms?: number;
  avg_price?: number;
  slogan?: string;
  hero_image_url?: string;
  logo_url?: string;
  service_paused?: boolean;  // ADDED
}

interface ChangeRequest {
  id: string;
  business_id: string;
  business_name: string;
  field_name: string;
  current_value: string;
  requested_value: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

type FilterType = {
  province: string;
  city: string;
  search: string;
  establishmentType: string;
  tgsaGrading: string;
  subscriptionTier: string;
  paymentStatus: string;
};

const ESTABLISHMENT_TYPES = [
  'Hotel',
  'Bed & Breakfast (B&B)',
  'Guest House',
  'Large Campsite',
  'Resort',
  'Lodge',
  'Self-Catering'
];

const TGSA_GRADINGS = ['NA', '1★', '2★', '3★', '4★', '5★'];

export default function SuperAdminPortal() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [togglingPause, setTogglingPause] = useState<string | null>(null); // ADDED
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [showChangeRequests, setShowChangeRequests] = useState(false);
  
  // Business Overview state
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [showOverview, setShowOverview] = useState(false);
  
  // QR Code Modal state
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedQRBusiness, setSelectedQRBusiness] = useState<{id: string, name: string} | null>(null);
  
  // Edit Business Modal state (for locked fields)
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editFormData, setEditFormData] = useState({
    legal_name: '',
    registration_number: '',
    trading_name: '',
    physical_address: {
      street: '',
      city: '',
      province: '',
      postalCode: '',
      country: ''
    },
    establishment_type: '',
    tgsa_grading: ''
  });
  const [editReason, setEditReason] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Change Request Modal state
  const [selectedChangeRequest, setSelectedChangeRequest] = useState<ChangeRequest | null>(null);
  const [changeRequestAction, setChangeRequestAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
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
    search: '',
    establishmentType: '',
    tgsaGrading: '',
    subscriptionTier: '',
    paymentStatus: ''
  });
  
  // Unique values for filter dropdowns
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  // FIXED: Use unified auth system
  useEffect(() => {
    const auth = getAuth();
    console.log('🔍 SuperAdminPortal - auth:', auth);
    
    if (!auth || auth.type !== 'super_admin') {
      navigate('/super-admin-login');
      return;
    }
    fetchBusinesses();
    fetchPendingCount();
    fetchChangeRequests();
  }, [navigate]);

  useEffect(() => {
    applyFilters();
  }, [businesses, filters]);

  // FIXED: Use unified clearAuth
  const handleLogout = () => {
    clearAuth();
    navigate('/super-admin-login');
  };

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
          payment_status: getPaymentStatus(daysOverdue),
          service_paused: b.service_paused || false  // ADDED
        };
      });
      
      // Sort alphabetically by trading name
      const sorted = businessesWithStatus.sort((a, b) => 
        (a.trading_name || '').localeCompare(b.trading_name || '')
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

  const fetchPendingCount = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-pending-businesses');
      const data = await response.json();
      setPendingCount(data.length || 0);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  const fetchChangeRequests = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-change-requests');
      if (response.ok) {
        const data = await response.json();
        setChangeRequests(data);
      }
    } catch (error) {
      console.error('Error fetching change requests:', error);
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
    return 'paid';
  };

  const getStatusColor = (status: string, daysOverdue: number = 0, servicePaused: boolean = false) => {
    if (servicePaused) return 'bg-gray-400 text-white';
    if (status !== 'approved') return 'bg-gray-100 text-gray-800';
    
    if (daysOverdue >= 10) return 'bg-red-100 text-red-800 border-l-4 border-red-600';
    if (daysOverdue >= 5) return 'bg-orange-100 text-orange-800 border-l-4 border-orange-500';
    if (daysOverdue > 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (business: Business) => {
    if (business.service_paused) return '⏸ Paused';
    if (business.status !== 'approved') return business.status;
    
    if (business.days_overdue && business.days_overdue >= 10) 
      return `⚠️ CRITICAL: ${business.days_overdue} days overdue`;
    if (business.days_overdue && business.days_overdue >= 5) 
      return `⚠️ Overdue: ${business.days_overdue} days`;
    if (business.days_overdue && business.days_overdue > 0) 
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
        (b.trading_name || '').toLowerCase().includes(searchLower) ||
        (b.registered_name || '').toLowerCase().includes(searchLower) ||
        (b.email || '').toLowerCase().includes(searchLower) ||
        (b.legal_name || '').toLowerCase().includes(searchLower)
      );
    }

    if (filters.establishmentType) {
      filtered = filtered.filter(b => b.establishment_type === filters.establishmentType);
    }

    if (filters.tgsaGrading) {
      filtered = filtered.filter(b => b.tgsa_grading === filters.tgsaGrading);
    }

    if (filters.subscriptionTier) {
      filtered = filtered.filter(b => b.subscription_tier === filters.subscriptionTier);
    }

    if (filters.paymentStatus) {
      filtered = filtered.filter(b => b.payment_status === filters.paymentStatus);
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

  // ADDED: Toggle Service Pause/Resume
  const toggleServicePause = async (businessId: string, currentStatus: boolean) => {
    setTogglingPause(businessId);
    try {
      const response = await fetch('/.netlify/functions/update-business-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          service_paused: !currentStatus
        })
      });

      if (response.ok) {
        // Update local state
        setBusinesses(prev => prev.map(b => 
          b.id === businessId 
            ? { ...b, service_paused: !currentStatus }
            : b
        ));
        alert(!currentStatus ? '✅ Service paused. QR code will show "Temporarily Unavailable".' : '✅ Service resumed.');
      } else {
        alert('Failed to update service status');
      }
    } catch (error) {
      console.error('Error toggling service pause:', error);
      alert('An error occurred');
    } finally {
      setTogglingPause(null);
    }
  };

  // Open edit modal for locked fields
  const openEditBusiness = (business: Business) => {
    setEditingBusiness(business);
    setEditFormData({
      legal_name: business.legal_name || business.registered_name || '',
      registration_number: business.registration_number || business.business_number || '',
      trading_name: business.trading_name || '',
      physical_address: {
        street: business.physical_address?.street || '',
        city: business.physical_address?.city || '',
        province: business.physical_address?.province || '',
        postalCode: business.physical_address?.postalCode || '',
        country: business.physical_address?.country || 'South Africa'
      },
      establishment_type: business.establishment_type || '',
      tgsa_grading: business.tgsa_grading || 'NA'
    });
    setEditReason('');
    setShowEditModal(true);
  };

  // Save edited locked fields
  const saveBusinessEdit = async () => {
    if (!editingBusiness) return;
    if (!editReason.trim()) {
      alert('Please provide a reason for this change');
      return;
    }

    try {
      const response = await fetch('/.netlify/functions/update-business-locked-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: editingBusiness.id,
          updates: editFormData,
          reason: editReason,
          adminEmail: getAuth()?.user?.email
        })
      });

      if (response.ok) {
        alert('Business information updated successfully');
        setShowEditModal(false);
        fetchBusinesses();
        
        // Send notification to business owner
        await fetch('/.netlify/functions/notify-business-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: editingBusiness.id,
            businessName: editingBusiness.trading_name,
            changes: editFormData,
            reason: editReason
          })
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update business');
      }
    } catch (error) {
      console.error('Error updating business:', error);
      alert('An error occurred');
    }
  };

  // Approve change request
  const approveChangeRequest = async () => {
    if (!selectedChangeRequest) return;

    try {
      const response = await fetch('/.netlify/functions/approve-change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedChangeRequest.id,
          action: 'approve'
        })
      });

      if (response.ok) {
        alert('Change request approved');
        fetchChangeRequests();
        fetchBusinesses();
        setSelectedChangeRequest(null);
        setChangeRequestAction(null);
      }
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request');
    }
  };

  // Reject change request
  const rejectChangeRequest = async () => {
    if (!selectedChangeRequest) return;
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      const response = await fetch('/.netlify/functions/approve-change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedChangeRequest.id,
          action: 'reject',
          reason: rejectionReason
        })
      });

      if (response.ok) {
        alert('Change request rejected');
        fetchChangeRequests();
        setSelectedChangeRequest(null);
        setChangeRequestAction(null);
        setRejectionReason('');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
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
        fetchPendingCount();
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

  const openQRModal = (businessId: string, businessName: string) => {
    setSelectedQRBusiness({ id: businessId, name: businessName });
    setShowQRModal(true);
  };

  const pendingChangeRequests = changeRequests.filter(cr => cr.status === 'pending');

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
                <img 
                  src="/fastcheckin-logo.png" 
                  alt="FastCheckin" 
                  className="h-10 w-auto object-contain"
                />
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

            {/* Right side - Pending Approvals, Change Requests, and Logout */}
            <div className="flex items-center gap-4">
              {/* Change Requests Button */}
              <button
                onClick={() => setShowChangeRequests(!showChangeRequests)}
                className="relative px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 group"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Change Requests</span>
                
                {pendingChangeRequests.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white">
                    {pendingChangeRequests.length > 99 ? '99+' : pendingChangeRequests.length}
                  </span>
                )}
              </button>

              {/* Pending Approvals Button */}
              <button
                onClick={() => navigate('/super-admin/approve')}
                className="relative px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 group"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Pending Approvals</span>
                
                {pendingCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white group-hover:bg-red-600 transition-colors">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Change Requests Panel */}
      {showChangeRequests && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-purple-50 border-b border-purple-200">
              <h2 className="text-lg font-semibold text-purple-800 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Pending Change Requests ({pendingChangeRequests.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {pendingChangeRequests.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No pending change requests
                </div>
              ) : (
                pendingChangeRequests.map(request => (
                  <div key={request.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{request.business_name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Field:</span> {request.field_name.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Current:</span> {request.current_value || '(empty)'}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Requested:</span> {request.requested_value}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          <span className="font-medium">Reason:</span> {request.reason}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedChangeRequest(request);
                            setChangeRequestAction('approve');
                          }}
                          className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedChangeRequest(request);
                            setChangeRequestAction('reject');
                          }}
                          className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page Title */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage all businesses and subscriptions</p>
      </div>

      {/* Independent Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Establishment Type</label>
              <select
                value={filters.establishmentType}
                onChange={(e) => setFilters({ ...filters, establishmentType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Types</option>
                {ESTABLISHMENT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TGSA Grading</label>
              <select
                value={filters.tgsaGrading}
                onChange={(e) => setFilters({ ...filters, tgsaGrading: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Grades</option>
                {TGSA_GRADINGS.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subscription</label>
              <select
                value={filters.subscriptionTier}
                onChange={(e) => setFilters({ ...filters, subscriptionTier: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All</option>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ 
                  province: '', 
                  city: '', 
                  search: '', 
                  establishmentType: '', 
                  tgsaGrading: '', 
                  subscriptionTier: '', 
                  paymentStatus: '' 
                })}
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
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {business.trading_name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(business.status, business.days_overdue, business.service_paused)}`}>
                        {getStatusText(business)}
                      </span>
                      {business.establishment_type && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {business.establishment_type}
                        </span>
                      )}
                      {business.tgsa_grading && business.tgsa_grading !== 'NA' && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                          {business.tgsa_grading}
                        </span>
                      )}
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

                    {/* Directors / Owners Section */}
                    {business.directors && business.directors.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 font-medium">Directors / Owners</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {business.directors.map((director, idx) => (
                            <span 
                              key={idx} 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {director.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {/* PAUSE/RESUME BUTTON - ADDED */}
                    <button
                      onClick={() => toggleServicePause(business.id, business.service_paused || false)}
                      disabled={togglingPause === business.id}
                      className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                        business.service_paused 
                          ? 'bg-green-500 hover:bg-green-600 text-white' 
                          : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      } disabled:opacity-50`}
                      title={business.service_paused ? 'Resume Service' : 'Pause Service'}
                    >
                      {togglingPause === business.id ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : business.service_paused ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Resume
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Pause
                        </>
                      )}
                    </button>

                    {/* Edit Business Button (for locked fields) */}
                    <button
                      onClick={() => openEditBusiness(business)}
                      className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm flex items-center gap-1"
                      title="Edit Locked Fields"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit
                    </button>

                    <button
                      onClick={() => openQRModal(business.id, business.trading_name)}
                      className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm flex items-center gap-1"
                      title="View and Download QR Code"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      QR Code
                    </button>

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

                    {(business.days_overdue || 0) > 0 && (
                      <button
                        onClick={() => handleSendReminder(business.id, business.days_overdue || 0)}
                        disabled={sendingReminder === business.id}
                        className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
                      >
                        {sendingReminder === business.id ? 'Sending...' : 'Send Reminder'}
                      </button>
                    )}

                    <button
                      onClick={() => handleArchiveBusiness(business.id)}
                      className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
                    >
                      Archive
                    </button>

                    <button
                      onClick={() => openDeleteConfirm(business.id, business.trading_name)}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {business.days_overdue && business.days_overdue >= 10 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      ⚠️ Payment {business.days_overdue} days overdue. Service will be suspended in {14 - business.days_overdue} days.
                    </p>
                  </div>
                )}

                {business.days_overdue && business.days_overdue >= 5 && business.days_overdue < 10 && (
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

      {/* Edit Business Modal (Locked Fields) */}
      {showEditModal && editingBusiness && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Edit Locked Fields - {editingBusiness.trading_name}
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> These fields are locked and can only be edited by Super Admin.
                    Changes will be applied immediately and the business owner will be notified.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Legal Name / Registered Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.legal_name}
                    onChange={(e) => setEditFormData({ ...editFormData, legal_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Number *
                  </label>
                  <input
                    type="text"
                    value={editFormData.registration_number}
                    onChange={(e) => setEditFormData({ ...editFormData, registration_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trading Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.trading_name}
                    onChange={(e) => setEditFormData({ ...editFormData, trading_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Establishment Type
                  </label>
                  <select
                    value={editFormData.establishment_type}
                    onChange={(e) => setEditFormData({ ...editFormData, establishment_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Select Type</option>
                    {ESTABLISHMENT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TGSA Grading
                  </label>
                  <select
                    value={editFormData.tgsa_grading}
                    onChange={(e) => setEditFormData({ ...editFormData, tgsa_grading: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                  >
                    {TGSA_GRADINGS.map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Physical Address</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Street Address"
                      value={editFormData.physical_address.street}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        physical_address: { ...editFormData.physical_address, street: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="City"
                        value={editFormData.physical_address.city}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          physical_address: { ...editFormData.physical_address, city: e.target.value }
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Province"
                        value={editFormData.physical_address.province}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          physical_address: { ...editFormData.physical_address, province: e.target.value }
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Postal Code"
                        value={editFormData.physical_address.postalCode}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          physical_address: { ...editFormData.physical_address, postalCode: e.target.value }
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Country"
                        value={editFormData.physical_address.country}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          physical_address: { ...editFormData.physical_address, country: e.target.value }
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Change *
                  </label>
                  <textarea
                    rows={3}
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="Please provide a reason for these changes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBusinessEdit}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve/Reject Change Request Modal */}
      {changeRequestAction && selectedChangeRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                changeRequestAction === 'approve' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {changeRequestAction === 'approve' ? (
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 text-center mb-4">
                {changeRequestAction === 'approve' ? 'Approve Change Request' : 'Reject Change Request'}
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Business:</strong> {selectedChangeRequest.business_name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Field:</strong> {selectedChangeRequest.field_name.replace(/_/g, ' ').toUpperCase()}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Current:</strong> {selectedChangeRequest.current_value || '(empty)'}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Requested:</strong> {selectedChangeRequest.requested_value}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Reason:</strong> {selectedChangeRequest.reason}
                </p>
              </div>
              
              {changeRequestAction === 'reject' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rejection Reason *
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please explain why this request is being rejected..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setChangeRequestAction(null);
                    setSelectedChangeRequest(null);
                    setRejectionReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={changeRequestAction === 'approve' ? approveChangeRequest : rejectChangeRequest}
                  className={`flex-1 px-4 py-2 rounded-lg text-white ${
                    changeRequestAction === 'approve' 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {changeRequestAction === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* QR Code Modal */}
      {showQRModal && selectedQRBusiness && (
        <QRCodeModal
          businessId={selectedQRBusiness.id}
          businessName={selectedQRBusiness.name}
          onClose={() => {
            setShowQRModal(false);
            setSelectedQRBusiness(null);
          }}
        />
      )}
    </div>
  );
}
