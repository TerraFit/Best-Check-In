// src/pages/BusinessDashboard.tsx - COMPLETE PRODUCTION READY WITH JWT AUTH

import { TrialBanner } from './components/dashboard/TrialBanner'
import { Header } from '../components/dashboard/Header';
import { NavigationTabs } from './components/dashboard/NavigationTabs'
import { BusinessInfoCard } from './components/dashboard/BusinessInfoCard'
import { TodayActivityCards } from './components/dashboard/TodayActivityCards'
import { QuickActions } from './components/dashboard/QuickActions'
import { FiltersBar } from './components/dashboard/FiltersBar'
import { CheckinsTable } from './components/dashboard/CheckinsTable'
import { Pagination } from './components/dashboard/Pagination'
import { PageSizeSelector } from './components/dashboard/PageSizeSelector'
import { ReportFilters } from './components/dashboard/ReportFilters'
import { ReportSummary } from './components/dashboard/ReportSummary'
import { GuestOriginsChart } from './components/dashboard/GuestOriginsChart'
import { ReferralSourcesChart } from './components/dashboard/ReferralSourcesChart'
import { SettingsTab } from './components/dashboard/SettingsTab'
import { DashboardModals } from './components/dashboard/DashboardModals'
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
      let url = `/.netlify/functions/get-business-bookings?businessId=${businessId}`;
      
      // For Reports tab, fetch ALL bookings (no pagination)
      if (activeTab === 'reports') {
        url += `&limit=10000&page=1`;
        console.log('📊 REPORTS TAB: Fetching ALL bookings (limit=10000)');
      } else {
        // For Check-ins tab and Overview tab, use pagination
        url += `&limit=${pageSize}&page=${currentPage}`;
      }
      
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
      
      // Only update pagination for non-reports tabs
      if (activeTab !== 'reports') {
        setTotalBookingsCount(result.total_count || validBookings.length);
        const calculatedTotalPages = result.total_pages || Math.ceil((result.total_count || validBookings.length) / pageSize);
        setTotalPages(calculatedTotalPages);
      } else {
        // For Reports tab, total is all bookings
        setTotalBookingsCount(validBookings.length);
        setTotalPages(1);
      }
      
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
<Header
  business={business}
  refreshing={refreshing}
  onRefresh={refreshData}
  onLogout={handleLogout}
/>

      {/* Trial Banner */}
      <TrialBanner subscriptionStatus={subscriptionStatus} trialDaysLeft={trialDaysLeft} />

      <NavigationTabs 
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={(tabId) => {
    setActiveTab(tabId)
    setCurrentPage(1)
  }}
/>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
       {/* ============================================================ */}
{/* OVERVIEW TAB */}
{/* ============================================================ */}
{activeTab === 'overview' && business && (
  <div className="space-y-6">
    <BusinessInfoCard business={business} />
    
    <TodayActivityCards 
      arrivals={todayArrivals}
      stayovers={todayStayovers}
      checkouts={todayCheckouts}
    />
    
    <QuickActions 
      businessId={business.id || getBusinessId()}
      onShowQRModal={() => setShowQRModal(true)}
      onShowImportModal={() => setShowImportModal(true)}
    />
  </div>
)}

 {/* ============================================================ */}
{/* CHECK-INS TAB */}
{/* ============================================================ */}
{activeTab === 'checkins' && (
  <div className="space-y-6">
    <FiltersBar
      filters={currentFilters}
      updateFilter={updateFilter}
      clearCurrentFilters={clearCurrentFilters}
      isFilterActive={isFilterActive}
      uniqueProvinces={uniqueProvinces}
      uniqueCities={uniqueCities}
      uniqueCountries={uniqueCountries}
    />

    <div className="flex justify-end items-center gap-4">
      <PageSizeSelector
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setCurrentPage(1)
        }}
      />
    </div>

    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">All Check-ins</h3>
        <p className="text-sm text-gray-500">Total: {totalBookingsCount} bookings</p>
      </div>

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
        <CheckinsTable
          bookings={filteredBookings}
          loading={bookings.length === 0}
          getStatusBadge={getStatusBadge}
        />
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={totalBookingsCount}
        onPageChange={setCurrentPage}
      />
    </div>
  </div>
)}

        {/* ============================================================ */}
{/* REPORTS TAB */}
{/* ============================================================ */}
{activeTab === 'reports' && (
  <div className="space-y-6">
    <ReportFilters
      filters={currentFilters}
      updateFilter={updateFilter}
      clearCurrentFilters={clearCurrentFilters}
      isFilterActive={isFilterActive}
    />

    <ReportSummary 
      bookings={bookings}
      onExport={exportToCSV}
    />

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <GuestOriginsChart
        bookings={bookings}
        chartType={guestChartType}
        onChartTypeChange={setGuestChartType}
      />

      <ReferralSourcesChart
        bookings={bookings}
        chartType={referralChartType}
        onChartTypeChange={setReferralChartType}
      />
    </div>
  </div>
)}

 {/* ============================================================ */}
{/* SETTINGS TAB */}
{/* ============================================================ */}
{activeTab === 'settings' && (
  <SettingsTab
    business={business}
    editingProfile={editingProfile}
    profileForm={profileForm}
    savingProfile={savingProfile}
    businessId={getBusinessId()}
    onEdit={() => setEditingProfile(true)}
    onCancelEdit={() => setEditingProfile(false)}
    onSave={saveBusinessProfile}
  />
)}
