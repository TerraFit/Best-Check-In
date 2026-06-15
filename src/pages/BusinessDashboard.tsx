// src/pages/BusinessDashboard.tsx - REFACTORED WITH FIXES

import { useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDashboardState } from '../hooks/useDashboardState';
import { useBusinessData } from '../hooks/useBusinessData';
import { useFilters } from '../hooks/useFilters';
import { Header, TrialBanner, NavigationTabs, DashboardModals } from '../components/dashboard';
import { OverviewTab, CheckinsTab, ReportsTab, SettingsTab } from './tabs';

export default function BusinessDashboard() {
  const { getBusinessId, handleLogout, fetchWithAuth } = useAuth();
  
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

  const { currentFilters, updateFilter, clearCurrentFilters, isFilterActive } = useFilters(activeTab);
  
  // ✅ FIX: useBusinessData returns the API totals
  const { 
    business,
    bookings,
    loading,
    refreshing,
    todayArrivals,
    todayStayovers,
    todayCheckouts,
    totalBookingsCount: apiTotalBookings,  // API total (correct for pagination)
    totalPages: apiTotalPages,             // API total pages (correct)
    refreshData
  } = useBusinessData(activeTab, currentPage, pageSize, currentFilters);

  // ✅ FIX: Use API totals for ALL tabs
  const displayTotalBookings = apiTotalBookings;
  const displayTotalPages = apiTotalPages;

  const getStatusBadge = useCallback((status: string) => {
    const styles: Record<string, string> = {
      checked_in: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  }, []);

  // Filtered bookings for CHECK-INS tab only
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

  const exportToCSV = useCallback(() => {
    const dataToExport = activeTab === 'reports' ? bookings : filteredCheckinsBookings;
    const headers = ['Guest Name', 'Email', 'Phone', 'ID Number', 'Country', 'Province', 'City', 'Check-in Date', 'Check-out Date', 'Nights', 'Total Amount', 'Status', 'Referral Source'];
    const rows = dataToExport.map(b => [
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
  }, [activeTab === 'reports' ? bookings : filteredCheckinsBookings, business]);

  // Update functions (unchanged from your refactored version)
  const updateEmail = async () => { /* ... existing code ... */ };
  const updatePhone = async () => { /* ... existing code ... */ };
  const saveBusinessProfile = async () => { /* ... existing code ... */ };
  const saveNewsletterSettings = async () => { /* ... existing code ... */ };
  const submitChangeRequest = async () => { /* ... existing code ... */ };
  const openRequestModal = (field: string, currentValue: string) => { /* ... existing code ... */ };

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'checkins', name: 'Check-ins' },
    { id: 'reports', name: 'Reports' },
    { id: 'settings', name: 'Settings' },
  ];

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        business={business}
        refreshing={refreshing}
        onRefresh={refreshData}
        onLogout={handleLogout}
        onShowQRModal={() => setShowQRModal(true)}
      />

      <TrialBanner subscriptionStatus={subscriptionStatus} trialDaysLeft={trialDaysLeft} />

      <NavigationTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => {
          setActiveTab(tabId);
          setCurrentPage(1);
        }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {activeTab === 'checkins' && (
          <CheckinsTab
            bookings={bookings}
            filteredBookings={filteredCheckinsBookings}
            totalBookings={displayTotalBookings}           // ✅ FIXED: Use API total
            currentPage={currentPage}
            totalPages={displayTotalPages}                 // ✅ FIXED: Use API pages
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

        {activeTab === 'reports' && (
          <ReportsTab
            bookings={bookings}
            totalBookings={displayTotalBookings}           // ✅ Already correct
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
          />
        )}

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
          />
        )}
      </main>

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
