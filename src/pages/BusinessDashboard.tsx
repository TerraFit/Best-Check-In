// src/pages/BusinessDashboard.tsx - COMPLETE PRODUCTION READY WITH JWT AUTH

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBusinessId, getAuthToken, clearAuth } from '../utils/auth';
import QRCodeModal from '../components/QRCodeModal';
import AppealModal from '../components/AppealModal';
import ImportGoogleForms from '../components/ImportGoogleForms';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';

// Types
interface Booking {
  id: string;
  guest_name: string;
  guest_first_name?: string;
  guest_last_name?: string;
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
  booking_source?: string;
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
  slogan?: string;
  hero_image_url?: string;
  welcome_message?: string;
  total_rooms?: number;
  avg_price?: number;
  physical_address?: {
    city: string;
    province: string;
    country: string;
  };
  trial_end?: string;
  subscription_status?: string;
  newsletter_enabled?: boolean;
  newsletter_title?: string;
  newsletter_prize?: string;
  newsletter_cta?: string;
  newsletter_terms?: string;
  newsletter_draw_date?: string;
  newsletter_share_text?: string;
  establishment_type?: string;
  tgsa_grading?: string;
}

interface Subscriber {
  id: string;
  email: string;
  guest_name: string;
  created_at: string;
  source: string;
}

interface ChangeRequest {
  id: string;
  business_id: string;
  field_name: string;
  current_value: string;
  requested_value: string;
  reason: string;
  status: string;
  rejection_reason?: string;
  reviewed_at?: string;
  created_at: string;
}

// Constants
const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

// Chart colors
const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#ec489a'];

export default function BusinessDashboard() {
  const navigate = useNavigate();
  
  // Business data states
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [todayStayovers, setTodayStayovers] = useState<Booking[]>([]);
  const [todayCheckouts, setTodayCheckouts] = useState<Booking[]>([]);
  const [todayArrivals, setTodayArrivals] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalBookingsCount, setTotalBookingsCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // UI states
  const [activeTab, setActiveTab] = useState('overview');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Chart type states
  const [guestChartType, setGuestChartType] = useState<'donut' | 'bar'>('donut');
  const [referralChartType, setReferralChartType] = useState<'donut' | 'bar'>('donut');
  
  // Tab-specific filters - each tab maintains its own filter state
  const [filters, setFilters] = useState({
    overview: {
      dateRange: 'all' as '7days' | '30days' | '90days' | '12months' | 'all',
      startDate: '',
      endDate: '',
      searchTerm: '',
      statusFilter: '',
      provinceFilter: '',
      cityFilter: '',
      countryFilter: ''
    },
    checkins: {
      dateRange: 'all' as '7days' | '30days' | '90days' | '12months' | 'all',
      startDate: '',
      endDate: '',
      searchTerm: '',
      statusFilter: '',
      provinceFilter: '',
      cityFilter: '',
      countryFilter: ''
    },
    reports: {
      dateRange: '30days' as '7days' | '30days' | '90days' | '12months' | 'all',
      startDate: '',
      endDate: '',
      searchTerm: '',
      statusFilter: '',
      provinceFilter: '',
      cityFilter: '',
      countryFilter: ''
    }
  });
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    total_rooms: '',
    avg_price: '',
    logo_url: '',
    hero_image_url: '',
    slogan: '',
    welcome_message: ''
  });

  // Email/Phone inline editing states
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [updatingPhone, setUpdatingPhone] = useState(false);

  // Trial state
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('');

  // Newsletter settings state
  const [newsletterEnabled, setNewsletterEnabled] = useState(false);
  const [newsletterTitle, setNewsletterTitle] = useState('Win Your Next Stay With Us');
  const [newsletterPrize, setNewsletterPrize] = useState('TWO nights for TWO (B&B) + welcome bottle of champagne');
  const [newsletterCta, setNewsletterCta] = useState('Subscribe now (takes 10 seconds)');
  const [newsletterTerms, setNewsletterTerms] = useState('*T&C\'s apply. Winner announced monthly.');
  const [newsletterDrawDate, setNewsletterDrawDate] = useState('');
  const [newsletterShareText, setNewsletterShareText] = useState('Want better odds? Share this with friends and family!');
  const [savingNewsletter, setSavingNewsletter] = useState(false);

  // Subscribers state
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [showSubscribers, setShowSubscribers] = useState(false);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);

  // Unique filter values
  const [uniqueProvinces, setUniqueProvinces] = useState<string[]>([]);
  const [uniqueCities, setUniqueCities] = useState<string[]>([]);
  const [uniqueCountries, setUniqueCountries] = useState<string[]>([]);

  // Request Change Modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestField, setRequestField] = useState('');
  const [requestCurrentValue, setRequestCurrentValue] = useState('');
  const [requestNewValue, setRequestNewValue] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  // Appeal Modal state
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [rejectedRequest, setRejectedRequest] = useState<ChangeRequest | null>(null);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);

  // Abort Controller ref
  const abortControllerRef = useRef<AbortController | null>(null);

  // Tab configuration
  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'checkins', name: 'Check-ins' },
    { id: 'reports', name: 'Reports' },
    { id: 'settings', name: 'Settings' },
  ];

  // Get current tab's filters
   const currentFilters = filters[activeTab as keyof typeof filters] || {
    dateRange: activeTab === 'reports' ? '30days' : 'all',
    startDate: '',
    endDate: '',
    searchTerm: '',
    statusFilter: '',
    provinceFilter: '',
    cityFilter: '',
    countryFilter: ''
  };

  // ============================================================
  // AUTH HELPERS
  // ============================================================
  
  const getAuthHeaders = () => {
    let token = null;
    
    try {
      const authStr = localStorage.getItem('fastcheckin_auth');
      if (authStr) {
        const auth = JSON.parse(authStr);
        token = auth.token;
      }
    } catch (e) {}
    
    if (!token) {
      try {
        const businessAuthStr = localStorage.getItem('fastcheckin_business_auth');
        if (businessAuthStr) {
          const businessAuth = JSON.parse(businessAuthStr);
          token = businessAuth.token;
        }
      } catch (e) {}
    }
    
    if (token) {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
    }
    
    return { 'Content-Type': 'application/json' };
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const headers = getAuthHeaders();
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });
    return response;
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('fastcheckin_auth');
      localStorage.removeItem('fastcheckin_business_auth');
      localStorage.removeItem('business');
      navigate('/business/login');
    }
  };

   // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  const updateFilter = <K extends keyof typeof currentFilters>(key: K, value: typeof currentFilters[K]) => {
    console.log(`🔧 updateFilter: ${String(key)} = ${value}`);
    
    setFilters(prev => {
      // Start with the existing filters for this tab
      const existingTabFilters = prev[activeTab as keyof typeof prev] || {
        dateRange: 'all',
        startDate: '',
        endDate: '',
        searchTerm: '',
        statusFilter: '',
        provinceFilter: '',
        cityFilter: '',
        countryFilter: ''
      };
      
      // Build update object
      let updates: any = { [key]: value };
      
      // If changing dateRange preset, clear custom dates
      if (key === 'dateRange') {
        updates.startDate = '';
        updates.endDate = '';
        console.log('   📅 Preset changed - clearing custom dates');
      }
      
      // If setting custom startDate or endDate, set dateRange to 'all'
      if (key === 'startDate' && value) {
        updates.dateRange = 'all';
        console.log('   📅 Custom start date set - switching to "all"');
      }
      if (key === 'endDate' && value) {
        updates.dateRange = 'all';
        console.log('   📅 Custom end date set - switching to "all"');
      }
      
      const newFilters = {
        ...prev,
        [activeTab]: {
          ...existingTabFilters,
          ...updates
        }
      };
      
      console.log('📝 New filters for tab:', newFilters[activeTab as keyof typeof newFilters]);
      return newFilters;
    });
  };

  const clearCurrentFilters = () => {
    console.log('🧹 Clearing filters for tab:', activeTab);
    setFilters(prev => ({
      ...prev,
      [activeTab]: {
        dateRange: activeTab === 'reports' ? '30days' : 'all',
        startDate: '',
        endDate: '',
        searchTerm: '',
        statusFilter: '',
        provinceFilter: '',
        cityFilter: '',
        countryFilter: ''
      }
    }));
    setCurrentPage(1);
    // Immediately reload bookings
    loadBookings();
  };

  const isFilterActive = () => {
    if (!currentFilters) return false;
    const f = currentFilters;
    const defaultRange = activeTab === 'reports' ? '30days' : 'all';
    return f.dateRange !== defaultRange || !!f.startDate || !!f.endDate || !!f.searchTerm || !!f.statusFilter || !!f.provinceFilter || !!f.cityFilter || !!f.countryFilter;
  };

   // ============================================================
  // FETCH FUNCTIONS
  // ============================================================

  const loadBusinessProfile = async () => {
    const businessId = getBusinessId();
    if (!businessId) {
      console.error('❌ No business ID found');
      setLoading(false);
      setInitialLoading(false);
      return;
    }

    try {
      console.log('📡 Loading business profile for ID:', businessId);
      const res = await fetchWithAuth(`/.netlify/functions/get-business-branding?id=${businessId}`);
      
      if (!res.ok) {
        console.error('❌ Failed to load business profile:', res.status);
        setLoading(false);
        setInitialLoading(false);
        return;
      }
      
      const data = await res.json();
      
      let businessData;
      if (data.success && data.data) {
        businessData = data.data;
      } else if (data.id) {
        businessData = data;
      } else {
        businessData = data;
      }
      
      setBusiness(businessData);
      
      setProfileForm({
        total_rooms: businessData?.total_rooms?.toString() || '',
        avg_price: businessData?.avg_price?.toString() || '',
        logo_url: businessData?.logo_url || '',
        hero_image_url: businessData?.hero_image_url || '',
        slogan: businessData?.slogan || '',
        welcome_message: businessData?.welcome_message || ''
      });
      
      setNewsletterEnabled(businessData?.newsletter_enabled || false);
      setNewsletterTitle(businessData?.newsletter_title || 'Win Your Next Stay With Us');
      setNewsletterPrize(businessData?.newsletter_prize || 'TWO nights for TWO (B&B) + welcome bottle of champagne');
      setNewsletterCta(businessData?.newsletter_cta || 'Subscribe now (takes 10 seconds)');
      setNewsletterTerms(businessData?.newsletter_terms || '*T&C\'s apply. Winner announced monthly.');
      setNewsletterDrawDate(businessData?.newsletter_draw_date || '');
      setNewsletterShareText(businessData?.newsletter_share_text || 'Want better odds? Share this with friends and family!');
      
      if (businessData?.trial_end) {
        const trialEnd = new Date(businessData.trial_end);
        const today = new Date();
        const daysLeft = Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        setTrialDaysLeft(daysLeft);
        setSubscriptionStatus(businessData.subscription_status || 'trial');
      }
      
      console.log('✅ Business profile loaded:', businessData?.trading_name);
    } catch (err) {
      console.error('❌ Failed to load business profile:', err);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const fetchChangeRequests = async () => {
    const businessId = getBusinessId();
    if (!businessId) return;
    
    try {
      const response = await fetchWithAuth(`/.netlify/functions/get-change-requests?businessId=${businessId}`);
      const result = await response.json();
      
      let data = [];
      if (result.success && Array.isArray(result.data)) {
        data = result.data;
      } else if (Array.isArray(result)) {
        data = result;
      }
      
      setChangeRequests(data);
      
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      if (Array.isArray(data)) {
        const newlyRejected = data.filter((req: ChangeRequest) => 
          req.status === 'rejected' && 
          req.reviewed_at && 
          new Date(req.reviewed_at) > oneDayAgo &&
          !localStorage.getItem(`rejection_notified_${req.id}`)
        );
        
        for (const request of newlyRejected) {
          const userChoice = confirm(
            `❌ Change Request Rejected\n\n` +
            `Field: ${request.field_name}\n` +
            `Requested: ${request.requested_value}\n\n` +
            `Reason: ${request.rejection_reason || 'No specific reason provided'}\n\n` +
            `Would you like to appeal this decision?`
          );
          
          if (userChoice) {
            setRejectedRequest(request);
            setShowAppealModal(true);
          }
          localStorage.setItem(`rejection_notified_${request.id}`, 'true');
        }
        
        const newlyApproved = data.filter((req: ChangeRequest) => 
          req.status === 'approved' && 
          req.reviewed_at && 
          new Date(req.reviewed_at) > oneDayAgo &&
          !localStorage.getItem(`approval_notified_${req.id}`)
        );
        
        for (const request of newlyApproved) {
          alert(`✅ Change Request Approved!\n\nYour request to change "${request.field_name}" to "${request.requested_value}" has been approved.`);
          localStorage.setItem(`approval_notified_${request.id}`, 'true');
          loadBusinessProfile();
        }
      }
    } catch (error) {
      console.error('Error fetching change requests:', error);
    }
  };

  const loadBookings = async () => {
    // Prevent concurrent requests
    if (refreshing) {
      console.log('⏭️ Skipping duplicate loadBookings call - already in progress');
      return;
    }

    const businessId = getBusinessId();
    if (!businessId) {
      console.warn('⚠️ No businessId found');
      return;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setRefreshing(true);

    try {
      console.log('📡 Fetching bookings for business:', businessId);
      console.log('📅 Current activeTab:', activeTab);
      console.log(`📄 Page: ${currentPage}, Page Size: ${pageSize}`);
      console.log('📅 Current filters dateRange:', currentFilters?.dateRange);
      console.log('📅 Current filters startDate:', currentFilters?.startDate);
      console.log('📅 Current filters endDate:', currentFilters?.endDate);
      
      // Build base URL
      let url = `/.netlify/functions/get-business-bookings?businessId=${businessId}&limit=${pageSize}&page=${currentPage}`;
      
      // Apply date filters for Reports tab AND Check-ins tab
      if (activeTab === 'reports' || activeTab === 'checkins') {
        // Custom date range (From - To) - takes priority
        if (currentFilters?.startDate && currentFilters?.endDate) {
          url += `&startDate=${currentFilters.startDate}&endDate=${currentFilters.endDate}`;
          console.log('📅 Using custom date range:', currentFilters.startDate, 'to', currentFilters.endDate);
        } 
        // Preset date ranges
        else if (currentFilters?.dateRange && currentFilters.dateRange !== 'all') {
          const days: Record<string, number> = { 
            '7days': 7, 
            '30days': 30, 
            '90days': 90, 
            '12months': 365 
          };
          if (days[currentFilters.dateRange]) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days[currentFilters.dateRange]);
            const startDateParam = cutoffDate.toISOString().split('T')[0];
            url += `&startDate=${startDateParam}`;
            console.log(`📅 Using preset range: ${currentFilters.dateRange}, from ${startDateParam}`);
          }
        } else {
          console.log('📅 No date filter - showing all bookings');
        }
      }
      
      console.log('🔗 Fetching URL:', url);
      
      const res = await fetchWithAuth(url, { signal: controller.signal });
      const result = await res.json();
      
      let rawBookings = [];
      if (result.bookings && Array.isArray(result.bookings)) {
        rawBookings = result.bookings;
      } else if (result.success && Array.isArray(result.data)) {
        rawBookings = result.data;
      } else if (Array.isArray(result)) {
        rawBookings = result;
      }
      
      const validBookings = rawBookings.filter(b => b.business_id === businessId);
      console.log(`📦 Loaded ${validBookings.length} bookings from API`);
      
      setBookings(validBookings);
      setTotalBookingsCount(result.total_count || validBookings.length);
      const calculatedTotalPages = result.total_pages || Math.ceil((result.total_count || validBookings.length) / pageSize);
      setTotalPages(calculatedTotalPages);
      
      // Extract unique filter values - CLEAN country names (remove trailing periods)
      const provinces = [...new Set(validBookings.map(b => b.guest_province).filter(Boolean))];
      const cities = [...new Set(validBookings.map(b => b.guest_city).filter(Boolean))];
      const countries = [...new Set(validBookings.map(b => b.guest_country?.replace(/\.$/, '').trim()).filter(Boolean))];
      
      setUniqueProvinces(provinces.sort());
      setUniqueCities(cities.sort());
      setUniqueCountries(countries.sort());
      
      // Calculate today's activity
      const todayStr = new Date().toISOString().split('T')[0];
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      
      const arrivals = validBookings.filter(b => b.check_in_date === todayStr);
      const checkouts = validBookings.filter(b => b.check_out_date === todayStr);
      
      const stayovers = validBookings.filter(b => {
        if (!b.check_in_date) return false;
        const checkInDate = new Date(b.check_in_date);
        checkInDate.setHours(0, 0, 0, 0);
        if (checkInDate.getTime() === todayDate.getTime()) return false;
        if (checkInDate > todayDate) return false;
        if (!b.check_out_date) return true;
        const checkOutDate = new Date(b.check_out_date);
        checkOutDate.setHours(0, 0, 0, 0);
        return checkOutDate >= todayDate;
      });
      
      setTodayArrivals(arrivals);
      setTodayStayovers(stayovers);
      setTodayCheckouts(checkouts);
      
      console.log(`📊 Today's Activity: ${arrivals.length} arrivals, ${stayovers.length} stayovers, ${checkouts.length} checkouts`);
      
    } catch (err: any) {
      // Don't log AbortError as it's expected when cancelling requests
      if (err.name !== 'AbortError') {
        console.error('❌ Error loading bookings:', err);
      }
    } finally {
      setRefreshing(false);
      abortControllerRef.current = null;
    }
  };

  const loadSubscribers = async () => {
    const businessId = getBusinessId();
    if (!businessId) return;
    
    setLoadingSubscribers(true);
    try {
      const response = await fetchWithAuth(`/.netlify/functions/get-newsletter-subscribers?businessId=${businessId}`);
      const result = await response.json();
      
      let subscribers = [];
      if (result.success && Array.isArray(result.subscribers)) {
        subscribers = result.subscribers;
      } else if (Array.isArray(result)) {
        subscribers = result;
      }
      
      setSubscribers(subscribers);
      setShowSubscribers(true);
    } catch (err) {
      console.error('Error loading subscribers:', err);
      alert('Failed to load subscribers');
    } finally {
      setLoadingSubscribers(false);
    }
  };

  // ============================================================
  // FILTERS AND METRICS
  // ============================================================

  // THIS IS THE ONLY DECLARATION OF filteredBookings
  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];
    
    if (currentFilters.searchTerm) {
      const term = currentFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(b => 
        b.guest_name?.toLowerCase().includes(term) ||
        b.guest_email?.toLowerCase().includes(term) ||
        b.guest_phone?.includes(term)
      );
    }
    
    if (currentFilters.statusFilter) {
      filtered = filtered.filter(b => b.status === currentFilters.statusFilter);
    }
    
    if (currentFilters.provinceFilter) {
      filtered = filtered.filter(b => b.guest_province === currentFilters.provinceFilter);
    }
    if (currentFilters.cityFilter) {
      filtered = filtered.filter(b => b.guest_city === currentFilters.cityFilter);
    }
    if (currentFilters.countryFilter) {
      filtered = filtered.filter(b => b.guest_country === currentFilters.countryFilter);
    }
    
    return filtered;
  }, [bookings, currentFilters.searchTerm, currentFilters.statusFilter, 
      currentFilters.provinceFilter, currentFilters.cityFilter, currentFilters.countryFilter]);

  const guestOriginData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredBookings.forEach(b => {
      if (b.guest_country) counts[b.guest_country] = (counts[b.guest_country] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredBookings]);

  const referralData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredBookings.forEach(b => {
      const source = b.booking_source || b.referral_source;
      if (source && source !== 'NULL' && source !== 'null' && source.trim()) {
        const cleanSource = source.replace(/\.$/, '').trim();
        counts[cleanSource] = (counts[cleanSource] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredBookings]);

  const reportSummary = useMemo(() => ({
    totalBookings: filteredBookings.length,
    totalRevenue: filteredBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
    averageStay: filteredBookings.length > 0 
      ? (filteredBookings.reduce((sum, b) => sum + (b.nights || 1), 0) / filteredBookings.length).toFixed(1)
      : '0'
  }), [filteredBookings]);

  const getStatusBadge = useCallback((status: string) => {
    const styles: Record<string, string> = {
      checked_in: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  }, []);

  // ============================================================
  // UPDATE FUNCTIONS
  // ============================================================

  const updateEmail = async () => {
    const businessId = getBusinessId();
    if (!businessId) return;
    
    setUpdatingEmail(true);
    try {
      const response = await fetchWithAuth('/.netlify/functions/update-business-profile', {
        method: 'POST',
        body: JSON.stringify({
          businessId,
          email: newEmail
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        alert('✅ Email updated successfully');
        setEditingEmail(false);
        loadBusinessProfile();
      } else {
        alert('❌ Failed to update email: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating email:', error);
      alert('An error occurred');
    } finally {
      setUpdatingEmail(false);
    }
  };

  const updatePhone = async () => {
    const businessId = getBusinessId();
    if (!businessId) return;
    
    setUpdatingPhone(true);
    try {
      const response = await fetchWithAuth('/.netlify/functions/update-business-profile', {
        method: 'POST',
        body: JSON.stringify({
          businessId,
          phone: newPhone
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        alert('✅ Phone updated successfully');
        setEditingPhone(false);
        loadBusinessProfile();
      } else {
        alert('❌ Failed to update phone: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating phone:', error);
      alert('An error occurred');
    } finally {
      setUpdatingPhone(false);
    }
  };

  const saveNewsletterSettings = async () => {
    const businessId = getBusinessId();
    if (!businessId) return;
    
    setSavingNewsletter(true);
    try {
      const response = await fetchWithAuth('/.netlify/functions/update-business-profile', {
        method: 'POST',
        body: JSON.stringify({
          businessId,
          newsletter_enabled: newsletterEnabled,
          newsletter_title: newsletterTitle,
          newsletter_prize: newsletterPrize,
          newsletter_cta: newsletterCta,
          newsletter_terms: newsletterTerms,
          newsletter_draw_date: newsletterDrawDate || null,
          newsletter_share_text: newsletterShareText
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        alert('✅ Newsletter settings saved successfully!');
        loadBusinessProfile();
      } else {
        alert('❌ Failed to save newsletter settings: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving newsletter settings:', error);
      alert('Error saving newsletter settings');
    } finally {
      setSavingNewsletter(false);
    }
  };

  const saveBusinessProfile = async () => {
    const businessId = getBusinessId();
    if (!businessId) return;

    setSavingProfile(true);
    let hasError = false;

    try {
      const textRes = await fetchWithAuth('/.netlify/functions/update-business-profile', {
        method: 'POST',
        body: JSON.stringify({
          businessId,
          total_rooms: parseInt(profileForm.total_rooms) || 0,
          avg_price: parseInt(profileForm.avg_price) || 0,
          slogan: profileForm.slogan,
          welcome_message: profileForm.welcome_message
        })
      });

      const textResult = await textRes.json();

      if (!textRes.ok || !textResult.success) {
        throw new Error(textResult.error || 'Failed to update text fields');
      }

      if (profileForm.logo_url && profileForm.logo_url !== business?.logo_url) {
        const logoRes = await fetchWithAuth('/.netlify/functions/upload-business-logo', {
          method: 'POST',
          body: JSON.stringify({
            businessId,
            logo_url: profileForm.logo_url
          })
        });
        const logoResult = await logoRes.json();
        if (!logoRes.ok || !logoResult.success) {
          console.error('Logo upload failed:', logoResult.error);
          hasError = true;
        }
      }

      if (profileForm.hero_image_url && profileForm.hero_image_url !== business?.hero_image_url) {
        const heroRes = await fetchWithAuth('/.netlify/functions/upload-business-hero', {
          method: 'POST',
          body: JSON.stringify({
            businessId,
            hero_image_url: profileForm.hero_image_url
          })
        });
        const heroResult = await heroRes.json();
        if (!heroRes.ok || !heroResult.success) {
          console.error('Hero image upload failed:', heroResult.error);
          hasError = true;
        }
      }

      if (hasError) {
        alert('Profile updated with some errors. Please check your images.');
      } else {
        alert('Profile updated successfully!');
      }
      
      setEditingProfile(false);
      await loadBusinessProfile();
      
    } catch (err) {
      console.error('Error saving profile:', err);
      alert(err.message || 'Error saving profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const submitChangeRequest = async () => {
    const businessId = getBusinessId();
    if (!businessId) return;
    
    setSendingRequest(true);
    try {
      const response = await fetchWithAuth('/.netlify/functions/submit-change-request', {
        method: 'POST',
        body: JSON.stringify({
          businessId,
          businessName: business?.trading_name,
          fieldName: requestField,
          currentValue: requestCurrentValue,
          requestedValue: requestNewValue,
          reason: requestReason
        })
      });
      
      const data = await response.json();
      
      if (response.ok && (data.success || data.data)) {
        alert('✅ Change request submitted successfully. The admin will review it.');
        setShowRequestModal(false);
        setRequestField('');
        setRequestCurrentValue('');
        setRequestNewValue('');
        setRequestReason('');
        fetchChangeRequests();
      } else {
        alert(data.error || '❌ Failed to submit request. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setSendingRequest(false);
    }
  };

  const openRequestModal = (field: string, currentValue: string) => {
    setRequestField(field);
    setRequestCurrentValue(currentValue);
    setRequestNewValue('');
    setRequestReason('');
    setShowRequestModal(true);
  };

  const refreshData = () => {
    setRefreshing(true);
    loadBookings();
    fetchChangeRequests();
  };

  // ============================================================
  // EXPORT FUNCTIONS
  // ============================================================

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
      `"${(b.booking_source || b.referral_source || '').replace(/\.$/, '').trim()}"`
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

      // ============================================================
  // EFFECTS
  // ============================================================

  // Initial load
  useEffect(() => {
    const init = async () => {
      setInitialLoading(true);
      await loadBusinessProfile();
      setInitialLoading(false);
    };
    init();
  }, []);

  // Single consolidated effect for bookings
  useEffect(() => {
    if (!initialLoading) {
      console.log('🔄 Effect triggered - reloading bookings');
      console.log('   📅 dateRange:', currentFilters?.dateRange);
      console.log('   📅 startDate:', currentFilters?.startDate);
      console.log('   📅 endDate:', currentFilters?.endDate);
      loadBookings();
    }
  }, [
    currentPage, 
    pageSize, 
    activeTab, 
    currentFilters?.dateRange,
    currentFilters?.startDate,
    currentFilters?.endDate,
    initialLoading
  ]);

  // Cleanup on unmount - cancel any in-flight requests
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log('🛑 Aborted pending request on unmount');
      }
    };
  }, []);

  // ============================================================
  // LOADING STATE
  // ============================================================

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

  // ============================================================
  // RENDER
  // ============================================================

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
                {business?.slogan && (
                  <p className="text-xs text-gray-500 italic">{business.slogan}</p>
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
                onClick={() => window.print()}
                className="p-2 text-gray-500 hover:text-orange-500 rounded-lg hover:bg-gray-100 transition-colors"
                title="Print"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </button>
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
      </header>

      {/* Trial Banner */}
      {subscriptionStatus === 'trial' && trialDaysLeft !== null && trialDaysLeft <= 7 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className={`rounded-lg p-4 ${trialDaysLeft <= 3 ? 'bg-red-50 border-l-4 border-red-500' : 'bg-amber-50 border-l-4 border-amber-500'}`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <svg className={`w-6 h-6 ${trialDaysLeft <= 3 ? 'text-red-500' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className={`font-semibold ${trialDaysLeft <= 3 ? 'text-red-800' : 'text-amber-800'}`}>
                    {trialDaysLeft <= 3 ? '⚠️ Your free trial ends soon!' : `Your free trial ends in ${trialDaysLeft} days`}
                  </p>
                  <p className={`text-sm ${trialDaysLeft <= 3 ? 'text-red-700' : 'text-amber-700'}`}>
                    Upgrade now to continue using FastCheckin without interruption.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/business/billing')}
                className={`px-4 py-2 text-white rounded-lg text-sm font-medium ${trialDaysLeft <= 3 ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
              >
                Upgrade Now →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
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
        
        {/* ============================================================ */}
        {/* OVERVIEW TAB */}
        {/* ============================================================ */}
        {activeTab === 'overview' && business && (
          <div className="space-y-6">
            {/* Business Information Card */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-white border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Trading Name</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{business.trading_name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                    <p className="text-sm text-gray-700 mt-1">{business.email || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
                    <p className="text-sm text-gray-700 mt-1">{business.phone || 'Not set'}</p>
                  </div>
                  {business.total_rooms && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Total Rooms</p>
                      <p className="text-sm text-gray-700 mt-1">{business.total_rooms}</p>
                    </div>
                  )}
                  {business.avg_price && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Average Room Price</p>
                      <p className="text-sm text-gray-700 mt-1">R {business.avg_price.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Today's Activity Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow overflow-hidden border-l-4 border-green-500">
                <div className="px-6 py-4 bg-green-50">
                  <h3 className="font-semibold text-green-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Today's Arrivals
                  </h3>
                </div>
                <div className="p-4">
                  {todayArrivals.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No arrivals today</p>
                  ) : (
                    <div className="space-y-2">
                      {todayArrivals.map(guest => (
                        <div key={guest.id} className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{guest.guest_name}</p>
                            <p className="text-xs text-gray-500">{guest.guest_phone}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden border-l-4 border-blue-500">
                <div className="px-6 py-4 bg-blue-50">
                  <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    Current Stayovers
                  </h3>
                </div>
                <div className="p-4">
                  {todayStayovers.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No current stayovers</p>
                  ) : (
                    <div className="space-y-2">
                      {todayStayovers.map(guest => (
                        <div key={guest.id} className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{guest.guest_name}</p>
                            <p className="text-xs text-gray-500">{guest.guest_phone}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden border-l-4 border-orange-500">
                <div className="px-6 py-4 bg-orange-50">
                  <h3 className="font-semibold text-orange-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Today's Check-outs
                  </h3>
                </div>
                <div className="p-4">
                  {todayCheckouts.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No check-outs today</p>
                  ) : (
                    <div className="space-y-2">
                      {todayCheckouts.map(guest => (
                        <div key={guest.id} className="flex justify-between items-center p-2 bg-orange-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{guest.guest_name}</p>
                            <p className="text-xs text-gray-500">{guest.guest_phone}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => window.location.href = `/checkin/${business.id || getBusinessId()}`}
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
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all hover:border-green-200 text-left"
                >
                  <div className="bg-green-500 p-3 rounded-full">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Import Data</p>
                    <p className="text-xs text-gray-500">Upload Excel/CSV files</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* CHECK-INS TAB */}
        {/* ============================================================ */}
        {activeTab === 'checkins' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <select
                    value={currentFilters.dateRange}
                    onChange={(e) => {
                      updateFilter('dateRange', e.target.value as any);
                      updateFilter('startDate', '');
                      updateFilter('endDate', '');
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
                    value={currentFilters.startDate}
                    onChange={(e) => {
                      updateFilter('startDate', e.target.value);
                      updateFilter('dateRange', 'all');
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">To:</span>
                  <input
                    type="date"
                    value={currentFilters.endDate}
                    onChange={(e) => {
                      updateFilter('endDate', e.target.value);
                      updateFilter('dateRange', 'all');
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
                      value={currentFilters.searchTerm}
                      onChange={(e) => updateFilter('searchTerm', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 items-center mt-4 pt-4 border-t border-gray-200">
                <select
                  value={currentFilters.statusFilter}
                  onChange={(e) => updateFilter('statusFilter', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">All Statuses</option>
                  <option value="checked_in">Checked In</option>
                  <option value="completed">Completed</option>
                  <option value="confirmed">Confirmed</option>
                </select>
                
                <select
                  value={currentFilters.provinceFilter}
                  onChange={(e) => updateFilter('provinceFilter', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">All Provinces</option>
                  {uniqueProvinces.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                
                <select
                  value={currentFilters.cityFilter}
                  onChange={(e) => updateFilter('cityFilter', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">All Cities</option>
                  {uniqueCities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                
                <select
                  value={currentFilters.countryFilter}
                  onChange={(e) => updateFilter('countryFilter', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">All Countries</option>
                  {uniqueCountries.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                
                {isFilterActive() && (
                  <button
                    onClick={clearCurrentFilters}
                    className="text-sm text-orange-600 hover:text-orange-700"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>

            {/* Page Size Selector */}
            <div className="flex justify-end items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                >
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <option key={size} value={size}>{size} per page</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Check-ins Table - NO DOUBLE PAGINATION */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">All Check-ins</h3>
                <p className="text-sm text-gray-500">Total: {totalBookingsCount} bookings</p>
              </div>
              <div className="overflow-x-auto">
                {filteredBookings.length === 0 && bookings.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400">Loading bookings...</p>
                  </div>
                ) : filteredBookings.length === 0 && bookings.length > 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400">No check-ins match your filters</p>
                    <button
                      onClick={clearCurrentFilters}
                      className="mt-2 text-sm text-orange-600 hover:text-orange-700"
                    >
                      Clear all filters
                    </button>
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
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredBookings.map((booking, index) => (
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
                              <span className="cursor-help">
                                {booking.guest_id_number.substring(0, 8)}...
                              </span>
                            ) : 'N/A'}
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
                            {(booking.booking_source || booking.referral_source || 'N/A').replace(/\.$/, '').trim()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
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
                    Showing {filteredBookings.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, totalBookingsCount)} of {totalBookingsCount} bookings
                  </p>
                  <div className="flex space-x-2 items-center">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
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

                {/* ============================================================ */}
        {/* REPORTS TAB */}
        {/* ============================================================ */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Date Range Filter */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Report Period:</span>
                  <select
                    value={currentFilters.dateRange}
                    onChange={(e) => {
                      updateFilter('dateRange', e.target.value as any);
                      updateFilter('startDate', '');
                      updateFilter('endDate', '');
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
                    value={currentFilters.startDate}
                    onChange={(e) => {
                      updateFilter('startDate', e.target.value);
                      updateFilter('dateRange', 'all');
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                    placeholder="From"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={currentFilters.endDate}
                    onChange={(e) => {
                      updateFilter('endDate', e.target.value);
                      updateFilter('dateRange', 'all');
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                    placeholder="To"
                  />
                </div>
                
                {isFilterActive() && (
                  <button
                    onClick={clearCurrentFilters}
                    className="text-sm text-orange-600 hover:text-orange-700"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Report Summary - USING bookings (API-filtered data) */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">R {bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0).toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Average Stay</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {bookings.length > 0 
                      ? (bookings.reduce((sum, b) => sum + (b.nights || 1), 0) / bookings.length).toFixed(1)
                      : '0'} nights
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Export Data</p>
                  <button
                    onClick={exportToCSV}
                    className="mt-2 px-3 py-1 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
                  >
                    Download CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Charts - USING bookings (API-filtered data) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Guest Origins Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Guest Origins by Country</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setGuestChartType('donut')}
                      className={`p-2 rounded-lg transition-colors ${guestChartType === 'donut' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      title="Donut Chart"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setGuestChartType('bar')}
                      className={`p-2 rounded-lg transition-colors ${guestChartType === 'bar' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      title="Bar Chart"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                {bookings.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    No data available for selected period
                  </div>
                ) : (() => {
                  const guestData = Object.entries(bookings.reduce((acc, b) => {
                    if (b.guest_country) {
                      const cleanCountry = b.guest_country.replace(/\.$/, '').trim();
                      acc[cleanCountry] = (acc[cleanCountry] || 0) + 1;
                    }
                    return acc;
                  }, {} as Record<string, number>)).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
                  
                  return guestChartType === 'donut' ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={guestData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => percent > 0.03 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
                          labelLine={false}
                        >
                          {guestData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${value} bookings`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart
                        data={guestData}
                        layout="vertical"
                        margin={{ left: 80, right: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value) => [`${value} bookings`, 'Count']} />
                        <Bar dataKey="value" fill="#f59e0b" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>

              {/* Referral Sources Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">How Guests Found You</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReferralChartType('donut')}
                      className={`p-2 rounded-lg transition-colors ${referralChartType === 'donut' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      title="Donut Chart"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setReferralChartType('bar')}
                      className={`p-2 rounded-lg transition-colors ${referralChartType === 'bar' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      title="Bar Chart"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                {bookings.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    No data available for selected period
                  </div>
                ) : (() => {
                  const referralData = Object.entries(bookings.reduce((acc, b) => {
                    const source = b.booking_source || b.referral_source;
                    if (source && source !== 'NULL' && source !== 'null' && source.trim() !== '') {
                      const cleanSource = source.replace(/\.$/, '').trim();
                      acc[cleanSource] = (acc[cleanSource] || 0) + 1;
                    }
                    return acc;
                  }, {} as Record<string, number>)).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
                  
                  return referralChartType === 'donut' ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={referralData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => percent > 0.03 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
                          labelLine={false}
                        >
                          {referralData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${value} bookings`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart
                        data={referralData}
                        layout="vertical"
                        margin={{ left: 120, right: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value) => [`${value} bookings`, 'Count']} />
                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SETTINGS TAB */}
        {/* ============================================================ */}
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
                      {business?.slogan && <div><span className="text-gray-500">Slogan:</span> <span className="italic">{business.slogan}</span></div>}
                      <div><span className="text-gray-500">Email:</span> {business?.email}</div>
                      <div><span className="text-gray-500">Phone:</span> {business?.phone}</div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Property Details</p>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-500">Total Rooms:</span> {business?.total_rooms || 'Not set'}</div>
                      <div><span className="text-gray-500">Average Room Price:</span> {business?.avg_price ? `R ${business.avg_price.toLocaleString()}` : 'Not set'}</div>
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
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Average Room Price (ZAR)</label>
                    <input
                      type="number"
                      value={profileForm.avg_price}
                      onChange={(e) => setProfileForm({ ...profileForm, avg_price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slogan</label>
                    <input
                      type="text"
                      value={profileForm.slogan}
                      onChange={(e) => setProfileForm({ ...profileForm, slogan: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Message</label>
                    <input
                      type="text"
                      value={profileForm.welcome_message}
                      onChange={(e) => setProfileForm({ ...profileForm, welcome_message: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Logo</label>
                    <div className="flex items-center gap-4">
                      {profileForm.logo_url ? (
                        <img src={profileForm.logo_url} alt="Logo Preview" className="h-16 w-16 object-contain border rounded-lg p-1 bg-white" />
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
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (!file.type.startsWith('image/')) {
                              alert('Please upload an image file (PNG, JPG, etc.)');
                              return;
                            }
                            if (file.size > 2 * 1024 * 1024) {
                              alert('File must be less than 2MB');
                              return;
                            }
                            setUploadingLogo(true);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setProfileForm(prev => ({ ...prev, logo_url: reader.result as string }));
                              setUploadingLogo(false);
                            };
                            reader.onerror = () => {
                              setUploadingLogo(false);
                              alert('Error reading file');
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="hidden"
                          disabled={uploadingLogo}
                        />
                        <button
                          onClick={() => document.getElementById('logo-upload')?.click()}
                          disabled={uploadingLogo}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
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
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={saveBusinessProfile}
                    disabled={savingProfile}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingProfile ? 'Saving...' : 'Save Changes'}
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

      {/* Modals */}
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
          onImportComplete={() => { loadBookings(); setShowImportModal(false); }}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {showAppealModal && rejectedRequest && business && (
        <AppealModal
          isOpen={showAppealModal}
          onClose={() => { setShowAppealModal(false); setRejectedRequest(null); }}
          request={rejectedRequest}
          business={{ id: business.id, trading_name: business.trading_name, email: business.email }}
          onSubmit={() => fetchChangeRequests()}
        />
      )}
    </div>
  );
}
