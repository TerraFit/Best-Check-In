// src/pages/tabs/CheckinsTab.tsx
import { FiltersBar, CheckinsTable, PageSizeSelector, Pagination } from '../../components/dashboard';

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

      <div className="flex justify-end items-center gap-4">
        <PageSizeSelector pageSize={props.pageSize} onPageSizeChange={props.onPageSizeChange} />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">All Check-ins</h3>
          <p className="text-sm text-gray-500">Total: {props.totalBookings} bookings</p>
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
          <CheckinsTable bookings={props.filteredBookings} loading={props.isLoading} getStatusBadge={props.getStatusBadge} />
        )}

        <Pagination
          currentPage={props.currentPage}
          totalPages={props.totalPages}
          pageSize={props.pageSize}
          totalCount={props.totalBookings}
          onPageChange={props.onPageChange}
        />
      </div>
    </div>
  );
}
