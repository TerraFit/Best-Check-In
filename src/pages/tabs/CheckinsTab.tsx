// src/pages/tabs/CheckinsTab.tsx
// ✅ MARKETING CONSENTS TOGGLE - Moved left next to label, soft 3D styling

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
      {/* Premium 3D Export Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-xl shadow-md border border-stone-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-stone-100 to-stone-200 rounded-lg shadow-inner">
              <Users size={18} className="text-stone-600" />
            </div>
            <span className="text-sm font-semibold text-stone-700">
              {displayTotal.toLocaleString()} check-ins
            </span>
            {showMarketingConsentOnly && (
              <span className="text-xs text-green-600 font-medium bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                ✉️ Marketing Consents Only
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowMarketingExport(true)}
            className="relative group flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(145deg, #22c55e, #16a34a)',
              boxShadow: '0 4px 15px rgba(34, 197, 94, 0.35), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.1)',
              border: '2px solid rgba(255,255,255,0.2)'
            }}
          >
            <span className="absolute inset-0 rounded-xl pointer-events-none" style={{
              background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.2) 0%, transparent 60%)'
            }} />
            <Download size={16} className="relative z-10" />
            <span className="relative z-10">Marketing Contacts</span>
            <span className="relative z-10 text-xs bg-white/20 px-2 py-0.5 rounded-full">CSV</span>
          </button>
          
          <button
            onClick={() => setShowOfficialExport(true)}
            className="relative group flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(145deg, #ef4444, #dc2626)',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.35), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.1)',
              border: '2px solid rgba(255,255,255,0.2)'
            }}
          >
            <span className="absolute inset-0 rounded-xl pointer-events-none" style={{
              background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.2) 0%, transparent 60%)'
            }} />
            <Shield size={16} className="relative z-10" />
            <span className="relative z-10">Official Register</span>
            <span className="relative z-10 text-xs bg-white/20 px-2 py-0.5 rounded-full">PDF</span>
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
        {/* ✅ MARKETING CONSENTS TOGGLE - Left aligned, soft 3D */}
        <div className="px-6 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div 
            className="flex items-center gap-4 rounded-full px-4 py-2"
            style={{
              backgroundColor: '#F5F5F5',
              border: '1px solid #E5E7EB',
              minHeight: '52px',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            {/* ✅ Label + Toggle - Grouped together on the left */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <Mail size={20} className="text-[#4A4A4A]" strokeWidth={1.5} />
              <span 
                className="font-bold text-[#4A4A4A] whitespace-nowrap"
                style={{
                  fontSize: 'clamp(13px, 1.1vw, 18px)',
                  fontWeight: 700,
                  fontFamily: 'sans-serif',
                }}
              >
                Marketing Consents
              </span>

              {/* ✅ Segmented Switch - Next to label, soft 3D */}
              <div 
                className="relative flex items-center rounded-full cursor-pointer transition-all duration-300 flex-shrink-0"
                style={{
                  width: '140px',
                  height: '34px',
                  backgroundColor: '#E8E8E8',
                  borderRadius: '999px',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.02)',
                  border: '1px solid #E5E7EB',
                }}
                onClick={() => handleToggle(!showMarketingConsentOnly)}
              >
                {/* Active Segment - ORANGE for OFF, GREEN for ON */}
                <div 
                  className="absolute top-[2px] bottom-[2px] rounded-full transition-all duration-300 ease-in-out"
                  style={{
                    width: showMarketingConsentOnly ? 'calc(50% + 4px)' : 'calc(50% - 4px)',
                    left: showMarketingConsentOnly ? 'calc(50% - 4px)' : '2px',
                    backgroundColor: showMarketingConsentOnly ? '#22c55e' : '#f97316',
                    borderRadius: '999px',
                    boxShadow: showMarketingConsentOnly 
                      ? '0 2px 8px rgba(34, 197, 94, 0.2), inset 0 1px 2px rgba(255,255,255,0.4)'
                      : '0 2px 8px rgba(249, 115, 22, 0.2), inset 0 1px 2px rgba(255,255,255,0.4)',
                  }}
                />

                {/* OFF Label - Left side */}
                <span 
                  className={`absolute left-3 text-xs font-bold transition-colors duration-300 z-10 ${
                    !showMarketingConsentOnly ? 'text-white' : 'text-black/40'
                  }`}
                  style={{
                    fontSize: 'clamp(9px, 0.6vw, 12px)',
                    fontWeight: 700,
                  }}
                >
                  OFF
                </span>

                {/* ON Label - Right side */}
                <span 
                  className={`absolute right-3 text-xs font-bold transition-colors duration-300 z-10 ${
                    showMarketingConsentOnly ? 'text-white' : 'text-black/40'
                  }`}
                  style={{
                    fontSize: 'clamp(9px, 0.6vw, 12px)',
                    fontWeight: 700,
                  }}
                >
                  ON
                </span>
              </div>
            </div>

            {/* Right side - Count */}
            <div className="flex-1 flex justify-end items-center gap-3">
              <span className="text-xs text-gray-400">
                {displayTotal.toLocaleString()} total
              </span>
              {showMarketingConsentOnly && (
                <span className="text-xs text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200 font-medium">
                  ✉️ {displayBookings.length} consented
                </span>
              )}
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
