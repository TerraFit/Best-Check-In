// src/pages/BusinessDashboard.tsx
// ✅ COMPLETE: With session prop for Room Allocation

import { useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDashboardState } from '../hooks/useDashboardState';
import { useBusinessData } from '../hooks/useBusinessData';
import { useFilters } from '../hooks/useFilters';
import { Header, TrialBanner, NavigationTabs, DashboardModals } from '../components/dashboard';
import { OverviewTab, CheckinsTab, ReportsTab, SettingsTab } from './tabs';
import { SubscriptionTier } from '../types/analytics';
import StaffPortalTab from './tabs/StaffPortalTab';

export default function BusinessDashboard() {
  const { getBusinessId, handleLogout, fetchWithAuth } = useAuth();

  // ============================================================
  // DASHBOARD STATE
  // ============================================================

  const {
    currentPage, setCurrentPage,
    pageSize, setPageSize,
    totalBookingsCount: localTotalBookingsCount,
    totalPages: localTotalPages,
    activeTab, setActiveTab,
    showQRModal, setShowQRModal,
    showImportModal, setShowImportModal,
    editingProfile, setEditingProfile,
    savingProfile,
    setSavingProfile,
    editingEmail, setEditingEmail,
    editingPhone, setEditingPhone,
    newEmail, setNewEmail,
    newPhone, setNewPhone,
    updatingEmail, setUpdatingEmail,
    updatingPhone, setUpdatingPhone,
    guestChartType, setGuestChartType,
    referralChartType, setReferralChartType,
    trialDaysLeft, subscriptionStatus,
    profileForm, setProfileForm,
    uniqueProvinces, uniqueCities, uniqueCountries,
    showRequestModal, setShowRequestModal,
    requestField, setRequestField,
    requestCurrentValue, setRequestCurrentValue,
    requestNewValue, setRequestNewValue,
    requestReason, setRequestReason,
    sendingRequest, setSendingRequest,
    showAppealModal, setShowAppealModal,
    rejectedRequest, setRejectedRequest,
    newsletterEnabled, setNewsletterEnabled,
    newsletterTitle, setNewsletterTitle,
    newsletterPrize, setNewsletterPrize,
    newsletterCta, setNewsletterCta,
    newsletterTerms, setNewsletterTerms,
    newsletterDrawDate, setNewsletterDrawDate,
    newsletterShareText, setNewsletterShareText,
    savingNewsletter, setSavingNewsletter,
    subscribers, setSubscribers,
    showSubscribers, setShowSubscribers,
    loadingSubscribers, setLoadingSubscribers,
  } = useDashboardState();

  // ============================================================
  // FILTERS & DATA
  // ============================================================

  const { currentFilters, updateFilter, clearCurrentFilters, isFilterActive } = useFilters(activeTab);

  const {
    business,
    bookings,
    loading,
    refreshing,
    todayArrivals,
    todayStayovers,
    todayCheckouts,
    totalBookingsCount: apiTotalBookings,
    totalPages: apiTotalPages,
    refreshData
  } = useBusinessData(activeTab, currentPage, pageSize, currentFilters);

  // ============================================================
  // ✅ SESSION - For Room Allocation in GuestDetailsModal
  // ============================================================

  const session = useMemo(() => {
    try {
      const authStr = localStorage.getItem('fastcheckin_auth');
      if (authStr) {
        const auth = JSON.parse(authStr);
        const user = auth.user || {};
        return {
          user: {
            id: user.id || '',
            full_name: user.name || user.full_name || 'Admin',
            role: user.role || 'owner',
            business_id: user.businessId || getBusinessId() || ''
          }
        };
      }
    } catch (e) {
      console.error('Error getting session:', e);
    }
    // Fallback: try to get from business storage
    try {
      const businessStr = localStorage.getItem('business');
      if (businessStr) {
        const businessData = JSON.parse(businessStr);
        return {
          user: {
            id: businessData.id || '',
            full_name: businessData.trading_name || 'Admin',
            role: 'owner',
            business_id: businessData.id || getBusinessId() || ''
          }
        };
      }
    } catch (e) {
      console.error('Error getting business from storage:', e);
    }
    return {
      user: {
        id: '',
        full_name: 'Admin',
        role: 'owner',
        business_id: getBusinessId() || ''
      }
    };
  }, [getBusinessId]);

  // ============================================================
  // LOAD NEWSLETTER SETTINGS FROM BUSINESS DATA
  // ============================================================

  useEffect(() => {
    if (business) {
      setNewsletterEnabled(business.newsletter_enabled ?? false);
      setNewsletterTitle(business.newsletter_title || 'Win Your Next Stay With Us');
      setNewsletterPrize(business.newsletter_prize || 'TWO nights for TWO (B&B) + welcome bottle of champagne');
      setNewsletterCta(business.newsletter_cta || 'Subscribe now, only takes 1 click.');
      setNewsletterTerms(business.newsletter_terms || '*T&C\'s apply. Winner announced monthly.');
      setNewsletterDrawDate(business.newsletter_draw_date || '');
      setNewsletterShareText(business.newsletter_share_text || 'Want better odds? Share this with friends and family!');
    }
  }, [business]);

  // ============================================================
  // DETERMINE SUBSCRIPTION TIER
  // ============================================================

  const subscriptionTier = useMemo((): SubscriptionTier => {
    if (!business) return 'starter';

    const planFields = [
      business.current_plan,
      business.plan,
      business.subscription_plan,
    ];

    for (const field of planFields) {
      if (field) {
        const normalized = field.toLowerCase();
        if (['starter', 'growth', 'pro', 'business', 'enterprise'].includes(normalized)) {
          return normalized as SubscriptionTier;
        }
      }
    }

    const tier = business.subscription_tier?.toLowerCase() || '';
    
    if (['monthly', 'annual', 'trial', 'complimentary'].includes(tier)) {
      const rooms = business.total_rooms || 0;
      if (rooms >= 16) return 'business';
      if (rooms >= 11) return 'pro';
      if (rooms >= 6) return 'growth';
      return 'starter';
    }

    if (['starter', 'growth', 'pro', 'business'].includes(tier)) {
      return tier as SubscriptionTier;
    }

    const rooms = business.total_rooms || 0;
    if (rooms >= 16) return 'business';
    if (rooms >= 11) return 'pro';
    if (rooms >= 6) return 'growth';
    return 'starter';
  }, [business]);

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  const displayTotalBookings = apiTotalBookings || localTotalBookingsCount || 0;
  const displayTotalPages = apiTotalPages || localTotalPages || 1;

  const getStatusBadge = useCallback((status: string) => {
    const styles: Record<string, string> = {
      checked_in: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      pending: 'bg-gray-100 text-gray-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  }, []);

  // ============================================================
  // FILTERED BOOKINGS FOR CHECK-INS TAB
  // ============================================================

  const filteredCheckinsBookings = useMemo(() => {
    if (activeTab !== 'checkins') return bookings;

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
  }, [bookings, activeTab, currentFilters]);

  // ============================================================
  // EXPORT TO CSV
  // ============================================================

  const exportToCSV = useCallback(() => {
    const dataToExport = activeTab === 'reports' ? bookings : filteredCheckinsBookings;

    if (dataToExport.length === 0) {
      alert('No data to export');
      return;
    }

    const firstRow = dataToExport[0] || {};
    const headers = [
      'Guest Name', 'Email', 'Phone', 'ID Number', 'Country',
      'Province', 'City', 'Check-in Date', 'Check-out Date',
      'Nights', 'Total Amount', 'Status', 'Referral Source',
      ...(firstRow.arriving_from ? ['Arriving From'] : []),
      ...(firstRow.next_destination ? ['Next Destination'] : [])
    ];

    const rows = dataToExport.map(b => {
      const baseRow = [
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
      ];

      if (b.arriving_from) baseRow.push(`"${b.arriving_from}"`);
      if (b.next_destination) baseRow.push(`"${b.next_destination}"`);

      return baseRow;
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${business?.trading_name || 'bookings'}_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeTab === 'reports' ? bookings : filteredCheckinsBookings, business, activeTab]);

  // ============================================================
  // SAVE BUSINESS PROFILE
  // ============================================================

  const saveBusinessProfile = useCallback(async () => {
    if (!business?.id) {
      alert('Business ID not available');
      return;
    }

    setSavingProfile(true);
    
    try {
      const updateData = {
        businessId: business.id,
        total_rooms: parseInt(profileForm.total_rooms) || 0,
        avg_price: parseFloat(profileForm.avg_price) || 0,
        slogan: profileForm.slogan || '',
        welcome_message: profileForm.welcome_message || '',
        logo_url: profileForm.logo_url || business.logo_url || '',
        hero_image_url: profileForm.hero_image_url || business.hero_image_url || '',
      };

      const response = await fetch('/.netlify/functions/update-business-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      alert('✅ Profile updated successfully!');
      setEditingProfile(false);
      refreshData();
      
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  }, [business, profileForm, setEditingProfile, refreshData, setSavingProfile]);

  // ============================================================
  // SAVE NEWSLETTER SETTINGS
  // ============================================================

  const saveNewsletterSettings = useCallback(async () => {
    if (!business?.id) {
      alert('Business ID not available');
      return;
    }

    setSavingNewsletter(true);
    
    try {
      const newsletterData = {
        businessId: business.id,
        newsletter_enabled: newsletterEnabled,
        newsletter_title: newsletterTitle,
        newsletter_prize: newsletterPrize,
        newsletter_cta: newsletterCta,
        newsletter_terms: newsletterTerms,
        newsletter_draw_date: newsletterDrawDate || null,
        newsletter_share_text: newsletterShareText
      };

      console.log('📝 Saving newsletter settings:', newsletterData);

      const response = await fetch('/.netlify/functions/update-business-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newsletterData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save newsletter settings');
      }

      alert('✅ Newsletter settings saved successfully!');
      refreshData();
      
    } catch (error) {
      console.error('❌ Error saving newsletter settings:', error);
      alert('Failed to save newsletter settings. Please try again.');
    } finally {
      setSavingNewsletter(false);
    }
  }, [
    business?.id,
    newsletterEnabled,
    newsletterTitle,
    newsletterPrize,
    newsletterCta,
    newsletterTerms,
    newsletterDrawDate,
    newsletterShareText,
    refreshData,
    setSavingNewsletter
  ]);

  // ============================================================
  // TABS CONFIGURATION
  // ============================================================

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'checkins', name: 'Check-ins' },
    { id: 'reports', name: 'Reports' },
    { id: 'staff', name: 'Staff Portal' },
    { id: 'settings', name: 'Settings' },
  ];

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (loading) {
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
      {/* Header */}
      <Header
        business={business}
        refreshing={refreshing}
        onRefresh={refreshData}
        onLogout={handleLogout}
        onShowQRModal={() => setShowQRModal(true)}
      />

      {/* Trial Banner */}
      <TrialBanner subscriptionStatus={subscriptionStatus} trialDaysLeft={trialDaysLeft} />

      {/* Navigation */}
      <NavigationTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => {
          setActiveTab(tabId);
          setCurrentPage(1);
        }}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab - ✅ PASS SESSION HERE */}
        {activeTab === 'overview' && (
          <OverviewTab
            business={business}
            todayArrivals={todayArrivals}
            todayStayovers={todayStayovers}
            todayCheckouts={todayCheckouts}
            businessId={business?.id || getBusinessId() || ''}
            onShowQRModal={() => setShowQRModal(true)}
            onShowImportModal={() => setShowImportModal(true)}
            session={session}  // ✅ PASS SESSION FOR ROOM ALLOCATION
          />
        )}

        {/* Check-ins Tab */}
        {activeTab === 'checkins' && (
          <CheckinsTab
            bookings={bookings}
            filteredBookings={filteredCheckinsBookings}
            totalBookings={displayTotalBookings}
            currentPage={currentPage}
            totalPages={displayTotalPages}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            filters={currentFilters}
            onUpdateFilter={updateFilter}
            onClearFilters={clearCurrentFilters}
            isFilterActive={isFilterActive}
            uniqueProvinces={uniqueProvinces}
            uniqueCities={uniqueCities}
            uniqueCountries={uniqueCountries}
            getStatusBadge={getStatusBadge}
            isLoading={bookings.length === 0}
            businessId={business?.id || getBusinessId() || ''}
            businessName={business?.trading_name || ''}
          />
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <ReportsTab
            bookings={bookings}
            totalBookings={displayTotalBookings}
          />
        )}
        
        {/* Staff Portal Tab */}
        {activeTab === 'staff' && (
          <StaffPortalTab businessId={business?.id || getBusinessId() || ''} />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsTab
            business={business}
            editingProfile={editingProfile}
            profileForm={profileForm}
            savingProfile={savingProfile}
            businessId={getBusinessId() || ''}
            onEdit={() => setEditingProfile(true)}
            onCancelEdit={() => setEditingProfile(false)}
            onSave={saveBusinessProfile}
            newsletterEnabled={newsletterEnabled}
            newsletterTitle={newsletterTitle}
            newsletterPrize={newsletterPrize}
            newsletterCta={newsletterCta}
            newsletterTerms={newsletterTerms}
            newsletterDrawDate={newsletterDrawDate}
            newsletterShareText={newsletterShareText}
            savingNewsletter={savingNewsletter}
            onNewsletterEnabledChange={setNewsletterEnabled}
            onNewsletterTitleChange={setNewsletterTitle}
            onNewsletterPrizeChange={setNewsletterPrize}
            onNewsletterCtaChange={setNewsletterCta}
            onNewsletterTermsChange={setNewsletterTerms}
            onNewsletterDrawDateChange={setNewsletterDrawDate}
            onNewsletterShareTextChange={setNewsletterShareText}
            onSaveNewsletter={saveNewsletterSettings}
            onRefreshBusiness={refreshData}
          />
        )}
      </main>

      {/* Modals */}
      <DashboardModals
        showQRModal={showQRModal}
        showImportModal={showImportModal}
        showAppealModal={showAppealModal}
        business={business}
        rejectedRequest={rejectedRequest}
        onCloseQR={() => setShowQRModal(false)}
        onCloseImport={() => setShowImportModal(false)}
        onCloseAppeal={() => { setShowAppealModal(false); setRejectedRequest(null); }}
        onImportComplete={() => { refreshData(); setShowImportModal(false); }}
        onAppealSubmit={refreshData}
        loadBookings={refreshData}
        fetchChangeRequests={refreshData}
      />
    </div>
  );
}
