// src/pages/tabs/CheckinsTab.tsx
// ✅ SLIDER/SWITCH - Green when active, Gray when inactive

import { useState } from 'react';
import { FiltersBar, CheckinsTable, PageSizeSelector } from '../../components/dashboard';
import MarketingExportModal from '../../components/export/MarketingExportModal';
import OfficialRegisterExportModal from '../../components/export/OfficialRegisterExportModal';
import { Download, Shield, Users, Mail } from 'lucide-react';

interface CheckinsTabProps {
  bookings: any[];
  filteredBookings: any[];
  totalBookings: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  filters: any;
  onUpdateFilter: (key: string, value: any) => void;
  onClearFilters: () => void;
  isFilterActive: () => boolean;
  uniqueProvinces: string[];
  uniqueCities: string[];
  uniqueCountries: string[];
  getStatusBadge: (status: string) => string;
  isLoading: boolean;
  businessId: string;
  businessName: string;
}

export function CheckinsTab(props: CheckinsTabProps) {
  const [showMarketingExport, setShowMarketingExport] = useState(false);
  const [showOfficialExport, setShowOfficialExport] = useState(false);
  const [showMarketingConsentOnly, setShowMarketingConsentOnly] = useState(false);
  
  // Filter bookings by marketing consent when toggle is on
  const displayBookings = showMarketingConsentOnly
    ? props.filteredBookings.filter(b => b.marketing_consent === true)
    : props.filteredBookings;

  const displayTotal = showMarketingConsentOnly
    ? displayBookings.length
    : props.totalBookings;

  const displayPages = showMarketingConsentOnly
    ? Math.ceil(displayBookings.length / props.pageSize)
    : props.totalPages;

  const startRange = displayBookings.length > 0 ? (props.currentPage - 1) * props.pageSize + 1 : 0;
  const endRange = Math.min(props.currentPage * props.pageSize, displayTotal);

  // Toggle handler - resets to page 1
  const handleToggle = (showConsentOnly: boolean) => {
    setShowMarketingConsentOnly(showConsentOnly);
    props.onPageChange(1);
  };

  return (
    <div className="space-y-6">
      {/* Export Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-lg shadow-sm border border-stone-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-stone-400" />
          <span className="text-sm font-medium text-stone-600">
            {displayTotal.toLocaleString()} check-ins
          </span>
          {showMarketingConsentOnly && (
            <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
              ✉️ Marketing Consents Only
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMarketingExport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
          >
            <Download size={14} />
            Marketing Contacts
          </button>
          <button
            onClick={() => setShowOfficialExport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
          >
            <Shield size={14} />
            Official Register
          </button>
        </div>
      </div>

      <FiltersBar
        filters={props.filters}
        updateFilter={props.onUpdateFilter}
        clearCurrentFilters={props.onClearFilters}
        isFilterActive={props.isFilterActive}
        uniqueProvinces={props.uniqueProvinces}
        uniqueCities={props.uniqueCities}
        uniqueCountries={props.uniqueCountries}
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* ✅ SLIDER/SWITCH HEADER - Green when active */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left: View toggle */}
            <div className="flex items-center gap-6">
              <span className="text-sm font-medium text-gray-500">View:</span>
              
              {/* Toggle Container */}
              <div className="relative flex items-center bg-gray-100 rounded-full p-1 shadow-inner">
                {/* ✅ Sliding Background - GREEN when active */}
                <div 
                  className={`absolute top-1 bottom-1 rounded-full transition-all duration-300 ease-in-out ${
                    // When "All Check-ins" is selected (showMarketingConsentOnly = false)
                    // The slider is on the LEFT and is GREEN
                    // When "Marketing Consents" is selected (showMarketingConsentOnly = true)
                    // The slider is on the RIGHT and is GREEN
                    !showMarketingConsentOnly 
                      ? 'left-1 w-1/2 bg-green-500 shadow-md shadow-green-200' 
                      : 'left-1/2 w-1/2 bg-green-500 shadow-md shadow-green-200'
                  }`}
                />
                
                {/* All Check-ins Button */}
                <button
                  onClick={() => handleToggle(false)}
                  className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
                    !showMarketingConsentOnly
                      ? 'text-white' // Active = White text on green background
                      : 'text-gray-500 hover:text-gray-700' // Inactive = Gray text
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Users size={14} />
                    All Check-ins
                  </span>
                </button>
                
                {/* Marketing Consents Button */}
                <button
                  onClick={() => handleToggle(true)}
                  className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
                    showMarketingConsentOnly
                      ? 'text-white' // Active = White text on green background
                      : 'text-gray-500 hover:text-gray-700' // Inactive = Gray text
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Mail size={14} />
                    Marketing Consents
                    {showMarketingConsentOnly && displayBookings.length > 0 && (
                      <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                        {displayBookings.length}
                      </span>
                    )}
                  </span>
                </button>
              </div>
              
              {/* Active filter indicator */}
              {showMarketingConsentOnly && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  ✉️ {displayBookings.length} consented
                </span>
              )}
            </div>

            {/* Right: Count and Page Size */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                Total: <span className="font-semibold text-gray-900">{displayTotal.toLocaleString()}</span>
              </span>
              <PageSizeSelector pageSize={props.pageSize} onPageSizeChange={props.onPageSizeChange} />
            </div>
          </div>
        </div>

        {displayBookings.length === 0 && props.bookings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading bookings...</p>
          </div>
        ) : displayBookings.length === 0 && props.bookings.length > 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">
              {showMarketingConsentOnly 
                ? 'No guests with marketing consent match your filters'
                : 'No check-ins match your filters'}
            </p>
            <button onClick={props.onClearFilters} className="mt-2 text-sm text-orange-600 hover:text-orange-700">
              Clear all filters
            </button>
          </div>
        ) : (
          <CheckinsTable
            bookings={displayBookings}
            loading={props.isLoading}
            getStatusBadge={props.getStatusBadge}
          />
        )}

        {/* Pagination Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              Showing{' '}
              <span className="font-medium text-gray-900">{startRange}</span>
              {' '}to{' '}
              <span className="font-medium text-gray-900">{endRange}</span>
              {' '}of{' '}
              <span className="font-semibold text-gray-900">{displayTotal.toLocaleString()}</span>
              {' '}check-ins
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => props.onPageChange(1)}
                  disabled={props.currentPage === 1}
                  className="p-1.5 rounded-md text-gray-500 hover:text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="First page"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => props.onPageChange(Math.max(1, props.currentPage - 1))}
                  disabled={props.currentPage === 1}
                  className="p-1.5 rounded-md text-gray-500 hover:text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous page"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <span className="text-sm text-gray-700 mx-2">
                  Page{' '}
                  <span className="font-medium text-gray-900">{props.currentPage}</span>
                  {' '}of{' '}
                  <span className="font-medium text-gray-900">{displayPages}</span>
                </span>
                
                <button
                  onClick={() => props.onPageChange(Math.min(displayPages, props.currentPage + 1))}
                  disabled={props.currentPage === displayPages}
                  className="p-1.5 rounded-md text-gray-500 hover:text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next page"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => props.onPageChange(displayPages)}
                  disabled={props.currentPage === displayPages}
                  className="p-1.5 rounded-md text-gray-500 hover:text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Last page"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-300">
                <span className="text-sm text-gray-500">Go to:</span>
                <input
                  type="number"
                  min={1}
                  max={displayPages}
                  value={props.currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (!isNaN(page) && page >= 1 && page <= displayPages) {
                      props.onPageChange(page);
                    }
                  }}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md text-center focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Modals */}
      <MarketingExportModal
        isOpen={showMarketingExport}
        onClose={() => setShowMarketingExport(false)}
        businessId={props.businessId}
        defaultFilters={{
          marketingConsent: showMarketingConsentOnly ? 'subscribed' : 'all',
          dateFrom: props.filters?.startDate,
          dateTo: props.filters?.endDate
        }}
      />

      <OfficialRegisterExportModal
        isOpen={showOfficialExport}
        onClose={() => setShowOfficialExport(false)}
        businessId={props.businessId}
        businessName={props.businessName}
      />
    </div>
  );
}
