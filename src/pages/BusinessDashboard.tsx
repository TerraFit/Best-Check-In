// src/pages/BusinessDashboard.tsx
import { useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDashboardState } from '../hooks/useDashboardState';
import { useBusinessData } from '../hooks/useBusinessData';
import { useFilters } from '../hooks/useFilters';
import { Header, TrialBanner, NavigationTabs, DashboardModals } from '../components/dashboard';
import { OverviewTab, CheckinsTab, ReportsTab, SettingsTab } from './tabs';
import { SubscriptionTier } from '../types/analytics';

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
  // ✅ FIX: Determine subscription tier from business data
  // ============================================================

  const subscriptionTier = useMemo((): SubscriptionTier => {
    // If business is not loaded yet, default to starter
    if (!business) return 'starter';

    console.log('🏷️ Business data:', {
      subscription_tier: business.subscription_tier,
      current_plan: business.current_plan,
      plan: business.plan,
      total_rooms: business.total_rooms,
      trading_name: business.trading_name
    });

    // 1. Check for explicit plan fields first
    const planFields = [
      business.current_plan,
      business.plan,
      business.subscription_plan,
    ];

    for (const field of planFields) {
      if (field) {
        const normalized = field.toLowerCase();
        if (['starter', 'growth', 'pro', 'business', 'enterprise'].includes(normalized)) {
          console.log(`✅ Found plan from field: ${field} → ${normalized}`);
          return normalized as SubscriptionTier;
        }
      }
    }

    // 2. Check subscription_tier (which might be 'monthly' or 'annual')
    const tier = business.subscription_tier?.toLowerCase() || '';
    
    // 3. If subscription_tier is a billing cycle, determine plan from total_rooms
    if (['monthly', 'annual', 'trial', 'complimentary'].includes(tier)) {
      const rooms = business.total_rooms || 0;
      
      // Map room count to plan
      let plan: SubscriptionTier = 'starter';
      if (rooms >= 16) plan = 'business';
      else if (rooms >= 11) plan = 'pro';
      else if (rooms >= 6) plan = 'growth';
      else plan = 'starter';
      
      console.log(`🏠 ${rooms} rooms → ${plan} plan (billing: ${tier})`);
      return plan;
    }

    // 4. If subscription_tier is already a valid plan name, use it
    if (['starter', 'growth', 'pro', 'business'].includes(tier)) {
      console.log(`✅ Using subscription_tier: ${tier}`);
      return tier as SubscriptionTier;
    }

    // 5. Fallback: determine from total_rooms
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

    // Build headers dynamically based on available fields
    const firstRow = dataToExport[0] || {};
    const headers = [
      'Guest Name', 'Email', 'Phone', 'ID Number', 'Country',
      'Province', 'City', 'Check-in Date', 'Check-out Date',
      'Nights', 'Total Amount', 'Status', 'Referral Source',
      // Include travel pattern fields if available
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

      // Add travel fields if they exist
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
  // BUSINESS PROFILE UPDATE FUNCTIONS
  // ============================================================

  const saveBusinessProfile = useCallback(async () => {
    // Implementation
  }, []);

  const saveNewsletterSettings = useCallback(async () => {
    // Implementation
  }, []);

  // ============================================================
  // TABS CONFIGURATION
  // ============================================================

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'checkins', name: 'Check-ins' },
    { id: 'reports', name: 'Reports' },
    { id: 'settings', name: 'Settings' },
  ];

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
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <OverviewTab
            business={business}
            todayArrivals={todayArrivals}
            todayStayovers={todayStayovers}
            todayCheckouts={todayCheckouts}
            businessId={business?.id || getBusinessId() || ''}
            onShowQRModal={() => setShowQRModal(true)}
            onShowImportModal={() => setShowImportModal(true)}
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
          />
        )}

        {/* Reports Tab - Premium Analytics */}
        {activeTab === 'reports' && (
          <ReportsTab
            bookings={bookings}
            totalBookings={displayTotalBookings}
            todayArrivals={todayArrivals}
            todayStayovers={todayStayovers}
            todayCheckouts={todayCheckouts}
            filters={currentFilters}
            onUpdateFilter={updateFilter}
            onClearFilters={clearCurrentFilters}
            isFilterActive={isFilterActive}
            onFilterChange={() => setCurrentPage(1)}
            guestChartType={guestChartType}
            onGuestChartTypeChange={setGuestChartType}
            referralChartType={referralChartType}
            onReferralChartTypeChange={setReferralChartType}
            onExport={exportToCSV}
            subscriptionTier={subscriptionTier}
          />
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
