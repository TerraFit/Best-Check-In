// src/pages/BusinessDashboard.tsx - COMPLETE ACCURATE VERSION with Import Feature

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBusinessId } from '../utils/auth';
import QRCodeModal from '../components/QRCodeModal';
import AppealModal from '../components/AppealModal';
import ImportGoogleForms from '../components/ImportGoogleForms';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
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
  
  // Business data states
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [todayStayovers, setTodayStayovers] = useState<Booking[]>([]);
  const [todayCheckouts, setTodayCheckouts] = useState<Booking[]>([]);
  const [todayArrivals, setTodayArrivals] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // UI states
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  
  // Filter states
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  
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

  // Tab configuration
  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'checkins', name: 'Check-ins' },
    { id: 'reports', name: 'Reports' },
    { id: 'settings', name: 'Settings' },
  ];

  // ============================================================
  // FETCH FUNCTIONS
  // ============================================================

  const fetchData = async (url: string) => {
    const response = await fetch(url);
    return response;
  };

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
          hero_image_url: data.hero_image_url || '',
          slogan: data.slogan || '',
          welcome_message: data.welcome_message || ''
        });
        
        setNewsletterEnabled(data.newsletter_enabled || false);
        setNewsletterTitle(data.newsletter_title || 'Win Your Next Stay With Us');
        setNewsletterPrize(data.newsletter_prize || 'TWO nights for TWO (B&B) + welcome bottle of champagne');
        setNewsletterCta(data.newsletter_cta || 'Subscribe now (takes 10 seconds)');
        setNewsletterTerms(data.newsletter_terms || '*T&C\'s apply. Winner announced monthly.');
        setNewsletterDrawDate(data.newsletter_draw_date || '');
        setNewsletterShareText(data.newsletter_share_text || 'Want better odds? Share this with friends and family!');
        
        if (data.trial_end) {
          const trialEnd = new Date(data.trial_end);
          const today = new Date();
          const daysLeft = Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          setTrialDaysLeft(daysLeft);
          setSubscriptionStatus(data.subscription_status || 'trial');
        }
        
        console.log('✅ Business profile loaded:', data.trading_name);
      }
    } catch (err) {
      console.error('Failed to load business profile:', err);
    }
  };

  const fetchChangeRequests = async () => {
    const businessId = getBusinessId();
    if (!businessId) return;
    
    try {
      const response = await fetch(`/.netlify/functions/get-change-requests?businessId=${businessId}`);
      const data = await response.json();
      setChangeRequests(data);
      
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
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
        alert(`✅ Change Request Approved!\n\nYour request to change "${request.field_name}" to "${request.requested_value}" has been approved. The changes have been applied to your business profile.`);
        localStorage.setItem(`approval_notified_${request.id}`, 'true');
        loadBusinessProfile();
      }
    } catch (error) {
      console.error('Error fetching change requests:', error);
    }
  };

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
      setBookings(validBookings);
      
      const provinces = [...new Set(validBookings.map(b => b.guest_province).filter(Boolean))] as string[];
      const cities = [...new Set(validBookings.map(b => b.guest_city).filter(Boolean))] as string[];
      const countries = [...new Set(validBookings.map(b => b.guest_country).filter(Boolean))] as string[];
      
      setUniqueProvinces(provinces.sort());
      setUniqueCities(cities.sort());
      setUniqueCountries(countries.sort());
      
      const today = new Date().toISOString().split('T')[0];
      const arrivals = validBookings.filter(b => b.check_in_date === today);
      const stayovers = validBookings.filter(b => 
        b.check_in_date < today && 
        (!b.check_out_date || b.check_out_date > today)
      );
      const checkouts = validBookings.filter(b => b.check_out_date === today);
      
      setTodayArrivals(arrivals);
      setTodayStayovers(stayovers);
      setTodayCheckouts(checkouts);
      
    } catch (err) {
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSubscribers = async () => {
    const businessId = getBusinessId();
    if (!businessId) return;
    
    setLoadingSubscribers(true);
    try {
      const response = await fetch(`/.netlify/functions/get-newsletter-subscribers?businessId=${businessId}`);
      const data = await response.json();
      setSubscribers(data.subscribers || []);
      setShowSubscribers(true);
    } catch (err) {
      console.error('Error loading subscribers:', err);
      alert('Failed to load subscribers');
    } finally {
      setLoadingSubscribers(false);
    }
  };

  // ============================================================
  // UPDATE FUNCTIONS
  // ============================================================

  const updateEmail = async () => {
    const businessId = getBusinessId();
    if (!businessId) return;
    
    setUpdatingEmail(true);
    try {
      const response = await fetch('/.netlify/functions/update-business-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          email: newEmail
        })
      });
      
      if (response.ok) {
        alert('✅ Email updated successfully');
        setEditingEmail(false);
        loadBusinessProfile();
      } else {
        alert('❌ Failed to update email');
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
      const response = await fetch('/.netlify/functions/update-business-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          phone: newPhone
        })
      });
      
      if (response.ok) {
        alert('✅ Phone updated successfully');
        setEditingPhone(false);
        loadBusinessProfile();
      } else {
        alert('❌ Failed to update phone');
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
      const response = await fetch('/.netlify/functions/update-business-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      
      if (response.ok) {
        alert('✅ Newsletter settings saved successfully!');
        loadBusinessProfile();
      } else {
        alert('❌ Failed to save newsletter settings');
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

    try {
      const res = await fetch('/.netlify/functions/update-business-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          total_rooms: parseInt(profileForm.total_rooms) || 0,
          avg_price: parseInt(profileForm.avg_price) || 0,
          logo_url: profileForm.logo_url,
          hero_image_url: profileForm.hero_image_url,
          slogan: profileForm.slogan,
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

  const submitChangeRequest = async () => {
    const businessId = getBusinessId();
    if (!businessId) return;
    
    setSendingRequest(true);
    try {
      console.log('📤 Submitting change request:', {
        businessId,
        fieldName: requestField,
        requestedValue: requestNewValue,
        reason: requestReason
      });
      
      const response = await fetch('/.netlify/functions/submit-change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      console.log('📡 Response:', data);
      
      if (response.ok) {
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

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  const exportSubscribersToCSV = () => {
    const headers = ['Email Address', 'First Name', 'Last Name', 'Signup Date', 'Source'];
    const rows = subscribers.map(s => [
      s.email,
      s.guest_name?.split(' ')[0] || '',
      s.guest_name?.split(' ')[1] || '',
      new Date(s.created_at).toLocaleDateString(),
      s.source || 'email'
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${business?.trading_name || 'subscribers'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToMailChimp = () => {
    const headers = ['Email Address', 'First Name', 'Last Name', 'Signup Source'];
    const rows = subscribers.map(s => [
      s.email,
      s.guest_name?.split(' ')[0] || '',
      s.guest_name?.split(' ')[1] || '',
      'FastCheckin Check-in'
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${business?.trading_name || 'subscribers'}_mailchimp_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const handleHeroUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploadingHero(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Image = reader.result as string;
      setProfileForm({ ...profileForm, hero_image_url: base64Image });
      setUploadingHero(false);
    };
    reader.readAsDataURL(file);
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

  const requestIDPhoto = (booking: Booking) => {
    if (confirm(`Request ID photo for ${booking.guest_name}? This will send a verification request.`)) {
      alert(`ID photo request sent to ${booking.guest_email}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      checked_in: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  // ============================================================
  // FILTERS AND METRICS
  // ============================================================

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
    
    if (provinceFilter) {
      filtered = filtered.filter(b => b.guest_province === provinceFilter);
    }
    if (cityFilter) {
      filtered = filtered.filter(b => b.guest_city === cityFilter);
    }
    if (countryFilter) {
      filtered = filtered.filter(b => b.guest_country === countryFilter);
    }
    
    setFilteredBookings(filtered);
    setCurrentPage(1);
  }, [bookings, dateRange, startDate, endDate, searchTerm, statusFilter, provinceFilter, cityFilter, countryFilter]);

  const metrics = useMemo(() => {
    const totalBookings = filteredBookings.length;
    const totalRevenue = filteredBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const avgStay = totalBookings > 0 
      ? (filteredBookings.reduce((sum, b) => sum + (b.nights || 1), 0) / totalBookings).toFixed(1)
      : '0';
    
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = filteredBookings.filter(b => b.check_in_date === today).length;
    
    const occupancyRate = business?.total_rooms && business.total_rooms > 0
      ? Math.min(100, Math.round((todayBookings / business.total_rooms) * 100))
      : 0;
    
    return { totalBookings, totalRevenue, avgStay, todayBookings, occupancyRate };
  }, [filteredBookings, business]);

  const guestOriginData = useMemo(() => {
    const countries: Record<string, number> = {};
    filteredBookings.forEach(b => {
      if (b.guest_country) {
        countries[b.guest_country] = (countries[b.guest_country] || 0) + 1;
      }
    });
    return Object.entries(countries).map(([name, value]) => ({ name, value }));
  }, [filteredBookings]);

  const referralData = useMemo(() => {
    const sources: Record<string, number> = {};
    filteredBookings.forEach(b => {
      const source = b.booking_source || b.referral_source;
      if (source && source !== 'NULL' && source !== 'null' && source.trim() !== '') {
        sources[source] = (sources[source] || 0) + 1;
      }
    });
    return Object.entries(sources).map(([name, value]) => ({ name, value }));
  }, [filteredBookings]);

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBookings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBookings, currentPage]);
  
  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);

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

  const exportToXLSX = useCallback(() => {
    const excelData = filteredBookings.map(b => ({
      'Guest Name': b.guest_name || '',
      'Email': b.guest_email || '',
      'Phone': b.guest_phone || '',
      'ID Number': b.guest_id_number || '',
      'Country': b.guest_country || '',
      'Province': b.guest_province || '',
      'City': b.guest_city || '',
      'Check-in Date': b.check_in_date || '',
      'Check-out Date': b.check_out_date || '',
      'Nights': b.nights || 1,
      'Total Amount (ZAR)': b.total_amount || 0,
      'Status': b.status || 'pending',
      'Referral Source': b.booking_source || b.referral_source || ''
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    
    const colWidths = [
      { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 20 },
      { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
      { wch: 15 }, { wch: 8 },  { wch: 18 }, { wch: 12 },
      { wch: 20 }
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bookings Report');

    const summaryData = [
      { Metric: 'Business Name', Value: business?.trading_name || 'N/A' },
      { Metric: 'Report Generated', Value: new Date().toLocaleString() },
      { Metric: 'Date Range', Value: startDate && endDate ? `${startDate} to ${endDate}` : dateRange },
      { Metric: 'Total Bookings', Value: filteredBookings.length },
      { Metric: 'Total Revenue', Value: `R ${metrics.totalRevenue.toLocaleString()}` },
      { Metric: 'Average Stay', Value: `${metrics.avgStay} nights` },
      { Metric: '', Value: '' },
      { Metric: 'Referral Source Breakdown', Value: '' },
    ];
    
    referralData.forEach(r => {
      summaryData.push({ Metric: `  ${r.name}`, Value: `${r.value} bookings` });
    });
    
    summaryData.push({ Metric: '', Value: '' });
    summaryData.push({ Metric: 'Guest Origin Breakdown', Value: '' });
    
    guestOriginData.forEach(o => {
      summaryData.push({ Metric: `  ${o.name}`, Value: `${o.value} bookings` });
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    XLSX.writeFile(wb, `${business?.trading_name || 'bookings'}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [filteredBookings, business, metrics, referralData, guestOriginData, dateRange, startDate, endDate]);

  // ============================================================
  // EFFECTS
  // ============================================================

  useEffect(() => {
    loadBusinessProfile();
    loadBookings();
    fetchChangeRequests();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

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
            </div>
          </div>
        </div>
      </header>

      {/* Trial Banner */}
      {subscriptionStatus === 'trial' && trialDaysLeft !== null && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          {trialDaysLeft <= 3 && trialDaysLeft > 0 ? (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-red-800">⚠️ Your free trial ends in {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}!</p>
                    <p className="text-sm text-red-700">Upgrade now to continue using FastCheckin without interruption.</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/business/billing')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Upgrade Now →
                </button>
              </div>
            </div>
          ) : trialDaysLeft <= 7 && trialDaysLeft > 3 ? (
            <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-amber-800">Your free trial ends in {trialDaysLeft} days</p>
                    <p className="text-sm text-amber-700">Upgrade to continue enjoying all features.</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/business/billing')}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                >
                  View Plans →
                </button>
              </div>
            </div>
          ) : trialDaysLeft > 0 && (
            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-green-800">✨ Your 14-day free trial is active</p>
                  <p className="text-sm text-green-700">{trialDaysLeft} days remaining. No payment required until your trial ends.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
        
        {/* ============================================================ */}
        {/* OVERVIEW TAB */}
        {/* ============================================================ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Business Information Card */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-white border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Business ID */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Business ID</p>
                    <p className="text-sm font-mono text-gray-700 mt-1">{business?.id || getBusinessId()}</p>
                  </div>
                  
                  {/* Trading Name with Request Change */}
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Trading Name</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{business?.trading_name}</p>
                      </div>
                      <button 
                        onClick={() => openRequestModal('Trading Name', business?.trading_name || '')}
                        className="text-xs text-blue-500 hover:text-blue-700 ml-2"
                      >
                        Request Change
                      </button>
                    </div>
                    {business?.slogan && <p className="text-xs text-gray-500 italic">{business.slogan}</p>}
                  </div>
                  
                  {/* Registered Name with Request Change */}
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Registered Name</p>
                        <p className="text-sm text-gray-700 mt-1">{business?.registered_name}</p>
                      </div>
                      <button 
                        onClick={() => openRequestModal('Registered Name', business?.registered_name || '')}
                        className="text-xs text-blue-500 hover:text-blue-700 ml-2"
                      >
                        Request Change
                      </button>
                    </div>
                  </div>
                  
                  {/* Email - Inline Editable */}
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                        {editingEmail ? (
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              type="email"
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-orange-500 focus:border-orange-500"
                              placeholder={business?.email}
                            />
                            <button 
                              onClick={updateEmail} 
                              disabled={updatingEmail}
                              className="text-green-600 text-xs hover:text-green-800 disabled:opacity-50"
                            >
                              {updatingEmail ? 'Saving...' : 'Save'}
                            </button>
                            <button 
                              onClick={() => setEditingEmail(false)} 
                              className="text-gray-500 text-xs hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 mt-1">{business?.email}</p>
                        )}
                      </div>
                      {!editingEmail && (
                        <button 
                          onClick={() => {
                            setNewEmail(business?.email || '');
                            setEditingEmail(true);
                          }}
                          className="text-xs text-green-500 hover:text-green-700 ml-2"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Phone - Inline Editable */}
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
                        {editingPhone ? (
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              type="tel"
                              value={newPhone}
                              onChange={(e) => setNewPhone(e.target.value)}
                              className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-orange-500 focus:border-orange-500"
                              placeholder={business?.phone}
                            />
                            <button 
                              onClick={updatePhone} 
                              disabled={updatingPhone}
                              className="text-green-600 text-xs hover:text-green-800 disabled:opacity-50"
                            >
                              {updatingPhone ? 'Saving...' : 'Save'}
                            </button>
                            <button 
                              onClick={() => setEditingPhone(false)} 
                              className="text-gray-500 text-xs hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 mt-1">{business?.phone}</p>
                        )}
                      </div>
                      {!editingPhone && (
                        <button 
                          onClick={() => {
                            setNewPhone(business?.phone || '');
                            setEditingPhone(true);
                          }}
                          className="text-xs text-green-500 hover:text-green-700 ml-2"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Location with Request Change */}
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Location</p>
                        <p className="text-sm text-gray-700 mt-1">{business?.physical_address?.city}, {business?.physical_address?.province}</p>
                      </div>
                      <button 
                        onClick={() => openRequestModal('Location', `${business?.physical_address?.city}, ${business?.physical_address?.province}`)}
                        className="text-xs text-blue-500 hover:text-blue-700 ml-2"
                      >
                        Request Change
                      </button>
                    </div>
                  </div>
                  
                  {/* Establishment Type */}
                  {business?.establishment_type && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Establishment Type</p>
                      <p className="text-sm text-gray-700 mt-1">{business.establishment_type}</p>
                    </div>
                  )}
                  
                  {/* Total Rooms */}
                  {business?.total_rooms && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Total Rooms</p>
                      <p className="text-sm text-gray-700 mt-1">{business.total_rooms}</p>
                    </div>
                  )}
                  
                  {/* Average Room Price */}
                  {business?.avg_price && (
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
              {/* Arrivals - Green */}
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
                          <a href={`mailto:${guest.guest_email}`} className="text-green-600 hover:text-green-800">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Stayovers - Blue */}
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
                          <a href={`mailto:${guest.guest_email}`} className="text-blue-600 hover:text-blue-800">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Check-outs - Orange */}
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
                          <a href={`mailto:${guest.guest_email}`} className="text-orange-600 hover:text-orange-800">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </a>
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
                  onClick={() => window.location.href = `/checkin/${business?.id || getBusinessId()}`}
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
                {/* Import Google Forms Button */}
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
              </div>

              <div className="flex flex-wrap gap-4 items-center mt-4 pt-4 border-t border-gray-200">
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
                
                <select
                  value={provinceFilter}
                  onChange={(e) => setProvinceFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">All Provinces</option>
                  {uniqueProvinces.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">All Cities</option>
                  {uniqueCities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">All Countries</option>
                  {uniqueCountries.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                
                {(dateRange !== '30days' || startDate || endDate || searchTerm || statusFilter || provinceFilter || cityFilter || countryFilter) && (
                  <button
                    onClick={() => {
                      setDateRange('30days');
                      setStartDate('');
                      setEndDate('');
                      setSearchTerm('');
                      setStatusFilter('');
                      setProvinceFilter('');
                      setCityFilter('');
                      setCountryFilter('');
                    }}
                    className="text-sm text-orange-600 hover:text-orange-700"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>

            {/* Check-ins Table */}
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
                              <span className="cursor-help">
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

            {/* Report Summary */}
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

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Guest Origins by Country</h3>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">How Guests Found You</h3>
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

            {/* Newsletter Subscribers */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">📧 Newsletter Subscribers</h3>
                <button
                  onClick={loadSubscribers}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Load Subscribers
                </button>
              </div>
              
              {showSubscribers && (
                <>
                  <div className="flex gap-3 mb-4">
                    <button
                      onClick={exportSubscribersToCSV}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                    >
                      Export to CSV
                    </button>
                    <button
                      onClick={exportToMailChimp}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      Export to MailChimp
                    </button>
                  </div>
                  
                  {loadingSubscribers ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading subscribers...</p>
                    </div>
                  ) : subscribers.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      No subscribers yet. Newsletter promotions will build this list.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signup Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {subscribers.map((sub, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{sub.email}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{sub.guest_name || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {new Date(sub.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                  {sub.source || 'email'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Export Options */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Report</h3>
              <div className="flex flex-wrap gap-4">
                <button onClick={exportToCSV} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export to CSV
                </button>
                <button onClick={exportToXLSX} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export to Excel (XLSX)
                </button>
                <button onClick={() => window.print()} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Report
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                Excel export includes: Detailed bookings sheet + Summary sheet with metrics and breakdowns
              </p>
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
                      <div><span className="text-gray-500">Registered Name:</span> {business?.registered_name}</div>
                      <div><span className="text-gray-500">Email:</span> {business?.email}</div>
                      <div><span className="text-gray-500">Phone:</span> {business?.phone}</div>
                      {business?.physical_address?.city && (
                        <div><span className="text-gray-500">Location:</span> {business.physical_address.city}, {business.physical_address.province}</div>
                      )}
                      {business?.establishment_type && (
                        <div><span className="text-gray-500">Establishment Type:</span> {business.establishment_type}</div>
                      )}
                      {business?.tgsa_grading && business.tgsa_grading !== 'NA' && (
                        <div><span className="text-gray-500">TGSA Grading:</span> {business.tgsa_grading}</div>
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
                
                {business?.hero_image_url && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Hero Image</p>
                    <img src={business.hero_image_url} alt="Hero Image" className="h-32 w-auto border rounded-lg p-2 bg-white object-cover" />
                  </div>
                )}
                
                <button
                  onClick={() => setEditingProfile(true)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Edit Profile
                </button>

                {/* Newsletter Settings */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📧 Newsletter Promotion</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Enable to include a newsletter subscription offer in your check-in confirmation emails.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Enable Newsletter Promotion</p>
                        <p className="text-sm text-gray-500">Add a "Win Your Next Stay" block to confirmation emails</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newsletterEnabled}
                          onChange={(e) => setNewsletterEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>
                    
                    {newsletterEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Promotion Title</label>
                          <input
                            type="text"
                            value={newsletterTitle}
                            onChange={(e) => setNewsletterTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Prize Description</label>
                          <input
                            type="text"
                            value={newsletterPrize}
                            onChange={(e) => setNewsletterPrize(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Text</label>
                          <input
                            type="text"
                            value={newsletterCta}
                            onChange={(e) => setNewsletterCta(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Draw Date (Optional)</label>
                          <input
                            type="date"
                            value={newsletterDrawDate}
                            onChange={(e) => setNewsletterDrawDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Share Text</label>
                          <input
                            type="text"
                            value={newsletterShareText}
                            onChange={(e) => setNewsletterShareText(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                          <textarea
                            value={newsletterTerms}
                            onChange={(e) => setNewsletterTerms(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <button
                            onClick={saveNewsletterSettings}
                            disabled={savingNewsletter}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                          >
                            {savingNewsletter ? 'Saving...' : 'Save Newsletter Settings'}
                          </button>
                        </div>
                        
                        <div className="md:col-span-2 bg-white p-4 rounded-lg border border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                          <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 rounded-lg text-center">
                            <p className="font-bold text-amber-800">🎁 {newsletterTitle}</p>
                            <p className="text-sm text-amber-700 mt-1">✨ {newsletterPrize} ✨</p>
                            <button className="mt-2 px-4 py-1 bg-amber-500 text-white rounded-full text-xs">
                              {newsletterCta}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slogan (Optional)</label>
                    <input
                      type="text"
                      value={profileForm.slogan}
                      onChange={(e) => setProfileForm({ ...profileForm, slogan: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Your business slogan"
                    />
                    <p className="text-xs text-gray-400 mt-1">Appears on check-in welcome page</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Message</label>
                    <input
                      type="text"
                      value={profileForm.welcome_message}
                      onChange={(e) => setProfileForm({ ...profileForm, welcome_message: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Welcome to our establishment"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image (Check-in Welcome Page)</label>
                    <div className="flex items-center gap-4">
                      {profileForm.hero_image_url ? (
                        <img src={profileForm.hero_image_url} alt="Hero Image Preview" className="h-20 w-32 object-cover border rounded-lg p-1 bg-white" />
                      ) : (
                        <div className="h-20 w-32 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          id="hero-upload"
                          accept="image/*"
                          onChange={handleHeroUpload}
                          className="hidden"
                          disabled={uploadingHero}
                        />
                        <button
                          onClick={() => document.getElementById('hero-upload')?.click()}
                          disabled={uploadingHero}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                          {uploadingHero ? 'Uploading...' : 'Choose Hero Image'}
                        </button>
                        <p className="text-xs text-gray-400 mt-1">Recommended: 1200x600px, JPG/PNG up to 5MB</p>
                      </div>
                      {profileForm.hero_image_url && (
                        <button
                          onClick={() => setProfileForm({ ...profileForm, hero_image_url: '' })}
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

      {/* Request Change Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Change: {requestField}</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Value</label>
                <input
                  type="text"
                  value={requestCurrentValue}
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">New Value *</label>
                <input
                  type="text"
                  value={requestNewValue}
                  onChange={(e) => setRequestNewValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter the new value"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Change *</label>
                <textarea
                  rows={3}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Please explain why this change is needed..."
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={submitChangeRequest}
                  disabled={sendingRequest || !requestNewValue || !requestReason}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {sendingRequest ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appeal Modal */}
      {showAppealModal && rejectedRequest && business && (
        <AppealModal
          isOpen={showAppealModal}
          onClose={() => {
            setShowAppealModal(false);
            setRejectedRequest(null);
          }}
          request={rejectedRequest}
          business={{
            id: business.id,
            trading_name: business.trading_name,
            email: business.email
          }}
          onSubmit={() => {
            fetchChangeRequests();
          }}
        />
      )}

      {/* QR Code Modal */}
      {showQRModal && business && (
        <QRCodeModal
          businessId={business.id}
          businessName={business.trading_name}
          businessLogo={business.logo_url}
          businessPhone={business.phone}
          onClose={() => setShowQRModal(false)}
        />
      )}

      {/* Import Google Forms Modal */}
      {showImportModal && (
        <ImportGoogleForms
          businessId={business?.id || getBusinessId()}
          onImportComplete={() => {
            loadBookings();
            setShowImportModal(false);
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}
