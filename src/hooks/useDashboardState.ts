// src/hooks/useDashboardState.ts
import { useState } from 'react';

export function useDashboardState() {
  // Business data states
  const [business, setBusiness] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [todayStayovers, setTodayStayovers] = useState<any[]>([]);
  const [todayCheckouts, setTodayCheckouts] = useState<any[]>([]);
  const [todayArrivals, setTodayArrivals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
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
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    total_rooms: '',
    avg_price: '',
    logo_url: '',
    hero_image_url: '',
    slogan: '',
    welcome_message: ''
  });
  
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
  const [rejectedRequest, setRejectedRequest] = useState<any>(null);
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  
  // Newsletter states
  const [newsletterEnabled, setNewsletterEnabled] = useState(false);
  const [newsletterTitle, setNewsletterTitle] = useState('Win Your Next Stay With Us');
  const [newsletterPrize, setNewsletterPrize] = useState('TWO nights for TWO (B&B) + welcome bottle of champagne');
  const [newsletterCta, setNewsletterCta] = useState('Subscribe now (takes 10 seconds)');
  const [newsletterTerms, setNewsletterTerms] = useState('*T&C\'s apply. Winner announced monthly.');
  const [newsletterDrawDate, setNewsletterDrawDate] = useState('');
  const [newsletterShareText, setNewsletterShareText] = useState('Want better odds? Share this with friends and family!');
  const [savingNewsletter, setSavingNewsletter] = useState(false);
  
  // Subscribers state
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [showSubscribers, setShowSubscribers] = useState(false);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);

  // Tab-specific filters
  const [filters, setFilters] = useState({
    overview: { dateRange: 'all', startDate: '', endDate: '', searchTerm: '', statusFilter: '', provinceFilter: '', cityFilter: '', countryFilter: '' },
    checkins: { dateRange: 'all', startDate: '', endDate: '', searchTerm: '', statusFilter: '', provinceFilter: '', cityFilter: '', countryFilter: '' },
    reports: { dateRange: '30days', startDate: '', endDate: '', searchTerm: '', statusFilter: '', provinceFilter: '', cityFilter: '', countryFilter: '' }
  });

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

  return {
    // Business data
    business, setBusiness,
    bookings, setBookings,
    todayStayovers, setTodayStayovers,
    todayCheckouts, setTodayCheckouts,
    todayArrivals, setTodayArrivals,
    loading, setLoading,
    initialLoading, setInitialLoading,
    refreshing, setRefreshing,
    
    // Pagination
    currentPage, setCurrentPage,
    pageSize, setPageSize,
    totalBookingsCount, setTotalBookingsCount,
    totalPages, setTotalPages,
    
    // UI
    activeTab, setActiveTab,
    showQRModal, setShowQRModal,
    showImportModal, setShowImportModal,
    editingProfile, setEditingProfile,
    uploadingLogo, setUploadingLogo,
    uploadingHero, setUploadingHero,
    savingProfile, setSavingProfile,
    
    // Email/Phone editing
    editingEmail, setEditingEmail,
    editingPhone, setEditingPhone,
    newEmail, setNewEmail,
    newPhone, setNewPhone,
    updatingEmail, setUpdatingEmail,
    updatingPhone, setUpdatingPhone,
    
    // Charts
    guestChartType, setGuestChartType,
    referralChartType, setReferralChartType,
    
    // Trial
    trialDaysLeft, setTrialDaysLeft,
    subscriptionStatus, setSubscriptionStatus,
    
    // Profile form
    profileForm, setProfileForm,
    
    // Unique values
    uniqueProvinces, setUniqueProvinces,
    uniqueCities, setUniqueCities,
    uniqueCountries, setUniqueCountries,
    
    // Request modal
    showRequestModal, setShowRequestModal,
    requestField, setRequestField,
    requestCurrentValue, setRequestCurrentValue,
    requestNewValue, setRequestNewValue,
    requestReason, setRequestReason,
    sendingRequest, setSendingRequest,
    
    // Change requests
    showAppealModal, setShowAppealModal,
    rejectedRequest, setRejectedRequest,
    changeRequests, setChangeRequests,
    
    // Newsletter
    newsletterEnabled, setNewsletterEnabled,
    newsletterTitle, setNewsletterTitle,
    newsletterPrize, setNewsletterPrize,
    newsletterCta, setNewsletterCta,
    newsletterTerms, setNewsletterTerms,
    newsletterDrawDate, setNewsletterDrawDate,
    newsletterShareText, setNewsletterShareText,
    savingNewsletter, setSavingNewsletter,
    
    // Subscribers
    subscribers, setSubscribers,
    showSubscribers, setShowSubscribers,
    loadingSubscribers, setLoadingSubscribers,
    
    // Filters
    filters, setFilters,
    currentFilters
  };
}
