// src/pages/BusinessDashboard.tsx - REFACTORED VERSION
import { useMemo, useCallback } from 'react';

// Hooks
import { useAuth } from '../hooks/useAuth';
import { useDashboardState } from '../hooks/useDashboardState';
import { useBusinessData } from '../hooks/useBusinessData';
import { useFilters } from '../hooks/useFilters';

// Components
import { Header } from '../components/dashboard/Header';
import { TrialBanner } from '../components/dashboard/TrialBanner';
import { NavigationTabs } from '../components/dashboard/NavigationTabs';
import { BusinessInfoCard } from '../components/dashboard/BusinessInfoCard';
import { TodayActivityCards } from '../components/dashboard/TodayActivityCards';
import { QuickActions } from '../components/dashboard/QuickActions';
import { FiltersBar } from '../components/dashboard/FiltersBar';
import { CheckinsTable } from '../components/dashboard/CheckinsTable';
import { Pagination } from '../components/dashboard/Pagination';
import { PageSizeSelector } from '../components/dashboard/PageSizeSelector';
import { ReportFilters } from '../components/dashboard/ReportFilters';
import { ReportSummary } from '../components/dashboard/ReportSummary';
import { GuestOriginsChart } from '../components/dashboard/GuestOriginsChart';
import { ReferralSourcesChart } from '../components/dashboard/ReferralSourcesChart';
import { LengthOfStayChart } from '../components/dashboard/LengthOfStayChart'
import { SettingsTab } from '../components/dashboard/SettingsTab';
import { DashboardModals } from '../components/dashboard/DashboardModals';

export default function BusinessDashboard() {
  // ============================================================
  // HOOKS - All state and logic comes from here
  // ============================================================
  const { getBusinessId, handleLogout, fetchWithAuth } = useAuth();
  
  // UI state and pagination from dashboard state (NOT business data)
  const {
    // Pagination
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalBookingsCount,
    totalPages,
    
    // UI
    activeTab,
    setActiveTab,
    showQRModal,
    setShowQRModal,
    showImportModal,
    setShowImportModal,
    editingProfile,
    setEditingProfile,
    savingProfile,
    uploadingLogo,
    setUploadingLogo,
    uploadingHero,
    setUploadingHero,
    
    // Email/Phone editing
    editingEmail,
    setEditingEmail,
    editingPhone,
    setEditingPhone,
    newEmail,
    setNewEmail,
    newPhone,
    setNewPhone,
    updatingEmail,
    setUpdatingEmail,
    updatingPhone,
    setUpdatingPhone,
    
    // Charts
    guestChartType,
    setGuestChartType,
    referralChartType,
    setReferralChartType,
    
    // Trial
    trialDaysLeft,
    subscriptionStatus,
    
    // Profile form
    profileForm,
    setProfileForm,
    
    // Unique values
    uniqueProvinces,
    uniqueCities,
    uniqueCountries,
    
    // Request modal
    showRequestModal,
    setShowRequestModal,
    requestField,
    setRequestField,
    requestCurrentValue,
    setRequestCurrentValue,
    requestNewValue,
    setRequestNewValue,
    requestReason,
    setRequestReason,
    sendingRequest,
    setSendingRequest,
    
    // Appeal modal
    showAppealModal,
    setShowAppealModal,
    rejectedRequest,
    setRejectedRequest,
    
    // Newsletter
    newsletterEnabled,
    setNewsletterEnabled,
    newsletterTitle,
    setNewsletterTitle,
    newsletterPrize,
    setNewsletterPrize,
    newsletterCta,
    setNewsletterCta,
    newsletterTerms,
    setNewsletterTerms,
    newsletterDrawDate,
    setNewsletterDrawDate,
    newsletterShareText,
    setNewsletterShareText,
    savingNewsletter,
    setSavingNewsletter,
    
    // Subscribers
    subscribers,
    setSubscribers,
    showSubscribers,
    setShowSubscribers,
    loadingSubscribers,
    setLoadingSubscribers,
  } = useDashboardState();

  const { currentFilters, updateFilter, clearCurrentFilters, isFilterActive } = useFilters(activeTab);
  
  // ✅ BUSINESS DATA COMES FROM HERE - NOT from useDashboardState
  const { 
    business,
    bookings,
    loading,
    refreshing,
    todayArrivals,
    todayStayovers,
    todayCheckouts,
    refreshData
  } = useBusinessData(activeTab, currentPage, pageSize, currentFilters);
  
  console.log('🔍 DEBUG - loading:', loading, 'business:', !!business, 'bookings:', bookings.length);
  
  // ... rest of your component continues unchanged
  // ============================================================
  // UI HELPER FUNCTIONS
  // ============================================================

  const getStatusBadge = useCallback((status: string) => {
    const styles: Record<string, string> = {
      checked_in: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  }, []);

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
  }, [bookings, currentFilters]);

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
  // UPDATE FUNCTIONS (use fetchWithAuth from useAuth)
  // ============================================================

  const updateEmail = async () => {
    const businessId = getBusinessId();
    if (!businessId) return;
    
    setUpdatingEmail(true);
    try {
      const response = await fetchWithAuth('/.netlify/functions/update-business-profile', {
        method: 'POST',
        body: JSON.stringify({ businessId, email: newEmail })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        alert('✅ Email updated successfully');
        setEditingEmail(false);
        refreshData();
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
        body: JSON.stringify({ businessId, phone: newPhone })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        alert('✅ Phone updated successfully');
        setEditingPhone(false);
        refreshData();
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
          body: JSON.stringify({ businessId, logo_url: profileForm.logo_url })
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
          body: JSON.stringify({ businessId, hero_image_url: profileForm.hero_image_url })
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
      refreshData();
      
    } catch (err: any) {
      console.error('Error saving profile:', err);
      alert(err.message || 'Error saving profile');
    } finally {
      setSavingProfile(false);
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
        refreshData();
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
        refreshData();
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
      <Header
        business={business}
        refreshing={refreshing}
        onRefresh={refreshData}
        onLogout={handleLogout}
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
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && business && (
          <div className="space-y-6">
            <BusinessInfoCard business={business} />
            <TodayActivityCards
              arrivals={todayArrivals}
              stayovers={todayStayovers}
              checkouts={todayCheckouts}
            />
            <QuickActions
              businessId={business.id || getBusinessId() || ''}
              onShowQRModal={() => setShowQRModal(true)}
              onShowImportModal={() => setShowImportModal(true)}
            />
          </div>
        )}

        {/* CHECK-INS TAB */}
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
                  setPageSize(size);
                  setCurrentPage(1);
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

       {/* REPORTS TAB */}
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

    {/* Length of Stay Chart - Full width */}
    <LengthOfStayChart bookings={bookings} />
  </div>
)}

        {/* SETTINGS TAB */}
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
        onCloseAppeal={() => {
          setShowAppealModal(false);
          setRejectedRequest(null);
        }}
        onImportComplete={() => setShowImportModal(false)}
        onAppealSubmit={() => {}}
        loadBookings={refreshData}
        fetchChangeRequests={() => {}}
      />
    </div>
  );
}
