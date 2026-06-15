// src/pages/tabs/CheckinsTab.tsx

import { FiltersBar, CheckinsTable, PageSizeSelector } from '../../components/dashboard';

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
}

export function CheckinsTab(props: CheckinsTabProps) {
  const startRange = props.filteredBookings.length > 0 ? (props.currentPage - 1) * props.pageSize + 1 : 0;
  const endRange = Math.min(props.currentPage * props.pageSize, props.totalBookings);

  return (
    <div className="space-y-6">
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
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">All Check-ins</h3>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Total: <span className="font-semibold text-gray-900">{props.totalBookings.toLocaleString()}</span> check-ins
            </span>
            <PageSizeSelector pageSize={props.pageSize} onPageSizeChange={props.onPageSizeChange} />
          </div>
        </div>

        {props.filteredBookings.length === 0 && props.bookings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading bookings...</p>
          </div>
        ) : props.filteredBookings.length === 0 && props.bookings.length > 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No check-ins match your filters</p>
            <button onClick={props.onClearFilters} className="mt-2 text-sm text-orange-600 hover:text-orange-700">
              Clear all filters
            </button>
          </div>
        ) : (
          <CheckinsTable
            bookings={props.filteredBookings}
            loading={props.isLoading}
            getStatusBadge={props.getStatusBadge}
          />
        )}

        {/* ✅ ENHANCED PAGINATION FOOTER */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Left side - Range info */}
            <div className="text-sm text-gray-600">
              Showing{' '}
              <span className="font-medium text-gray-900">{startRange}</span>
              {' '}to{' '}
              <span className="font-medium text-gray-900">{endRange}</span>
              {' '}of{' '}
              <span className="font-semibold text-gray-900">{props.totalBookings.toLocaleString()}</span>
              {' '}check-ins
            </div>

            {/* Right side - Pagination controls */}
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
                  <span className="font-medium text-gray-900">{props.totalPages}</span>
                </span>
                
                <button
                  onClick={() => props.onPageChange(Math.min(props.totalPages, props.currentPage + 1))}
                  disabled={props.currentPage === props.totalPages}
                  className="p-1.5 rounded-md text-gray-500 hover:text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next page"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => props.onPageChange(props.totalPages)}
                  disabled={props.currentPage === props.totalPages}
                  className="p-1.5 rounded-md text-gray-500 hover:text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Last page"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Go to page input */}
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-300">
                <span className="text-sm text-gray-500">Go to:</span>
                <input
                  type="number"
                  min={1}
                  max={props.totalPages}
                  value={props.currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (!isNaN(page) && page >= 1 && page <= props.totalPages) {
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
    </div>
  );
}
