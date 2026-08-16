// src/pages/BusinessDashboard.tsx
import { useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDashboardState } from '../hooks/useDashboardState';
import { useBusinessData } from '../hooks/useBusinessData';
import { useFilters } from '../hooks/useFilters';
import { Header, TrialBanner, NavigationTabs, DashboardModals } from '../components/dashboard';
import { OverviewTab, CheckinsTab, ReportsTab, SettingsTab } from './tabs';
import { SubscriptionTier } from '../types/analytics';
import StaffPortalTab from './tabs/StaffPortalTab';
import HousekeepingTab from './tabs/HousekeepingTab';
import LostFoundTab from './tabs/LostFoundTab';
import { businessOwnerPrincipal, filterTabs } from '../services/rbacService';
import { t } from '../i18n';

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
    uniqueProvinces: _stateUniqueProvinces,
    uniqueCities: _stateUniqueCities,
    uniqueCountries: _stateUniqueCountries,
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

  const { currentFilters, updateFilter: updateFilterBase, clearCurrentFilters, isFilterActive } =
    useFilters(activeTab);

  // Reset to page 1 whenever a filter changes so pagination matches filtered population
  const updateFilter = useCallback(
    (key: string, value: any) => {
      updateFilterBase(key as any, value);
      setCurrentPage(1);
    },
    [updateFilterBase, setCurrentPage]
  );

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
    uniqueProvinces: dataUniqueProvinces,
    uniqueCities: dataUniqueCities,
    uniqueCountries: dataUniqueCountries,
    refreshData
  } = useBusinessData(activeTab, currentPage, pageSize, currentFilters);

  // Prefer server-backed facets from useBusinessData (full business population)
  const uniqueProvinces = dataUniqueProvinces?.length
    ? dataUniqueProvinces
    : _stateUniqueProvinces;
  const uniqueCities = dataUniqueCities?.length ? dataUniqueCities : _stateUniqueCities;
  const uniqueCountries = dataUniqueCountries?.length
    ? dataUniqueCountries
    : _stateUniqueCountries;

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      if (tab === 'rooms') {
        navigate('/business/rooms');
        return;
      }
      setActiveTab(tab);
    }
  }, [searchParams]);

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

  // Server applies status/province/city/country/search BEFORE pagination.
  // Bookings array is already the filtered page — do not re-filter client-side
  // or page counts / totals will be wrong.
  const filteredCheckinsBookings = useMemo(() => {
    if (activeTab !== 'checkins') return bookings;
    return bookings;
  }, [bookings, activeTab]);

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

  const principal = businessOwnerPrincipal();
  const allTabs = [
    { id: 'overview', name: t('dashboard_overview') },
    { id: 'checkins', name: t('dashboard_checkins') },
    { id: 'reports', name: t('dashboard_reports') },
    { id: 'rooms', name: t('nav_rooms') },
    { id: 'housekeeping', name: t('nav_housekeeping') },
    { id: 'lost_found', name: t('nav_lost_found') },
    { id: 'staff', name: t('nav_staff') },
    { id: 'settings', name: t('dashboard_settings') },
  ];
  const tabs = filterTabs(principal, allTabs);

  const handleTabChange = useCallback((tabId: string) => {
    if (tabId === 'rooms') {
      navigate('/business/rooms');
      return;
    }
    setActiveTab(tabId);
    setCurrentPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabId);
      return next;
    });
  }, [navigate, setActiveTab, setCurrentPage, setSearchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-500">{t('common_loading')}</p>
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
        onTabChange={handleTabChange}
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

        {activeTab === 'reports' && (
          <ReportsTab
            bookings={bookings}
            totalBookings={displayTotalBookings}
          />
        )}

        {activeTab === 'housekeeping' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate('/business/housekeeping-settings')}
                className="text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                {t('housekeeping_title')} {t('nav_settings')} →
              </button>
            </div>
            <HousekeepingTab businessId={business?.id || getBusinessId() || ''} />
          </div>
        )}

        {activeTab === 'lost_found' && (
          <LostFoundTab
            mode="business"
            businessId={business?.id || getBusinessId() || ''}
            businessName={business?.trading_name || business?.name || ''}
            canCreate
            canEdit
            canDispose
          />
        )}
        
        {activeTab === 'staff' && (
          <StaffPortalTab businessId={business?.id || getBusinessId() || ''} />
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
            onRefreshBusiness={refreshData}
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
