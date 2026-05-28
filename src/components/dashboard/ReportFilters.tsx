// src/components/dashboard/ReportFilters.tsx

interface ReportFiltersProps {
  filters: {
    dateRange: string
    startDate: string
    endDate: string
  }
  updateFilter: (key: string, value: any) => void
  clearCurrentFilters: () => void
  isFilterActive: () => boolean
}

export function ReportFilters({ 
  filters, 
  updateFilter, 
  clearCurrentFilters, 
  isFilterActive 
}: ReportFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Report Period:</span>
          <select
            value={filters.dateRange}
            onChange={(e) => {
              updateFilter('dateRange', e.target.value);
              updateFilter('startDate', '');
              updateFilter('endDate', '');
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
            <option value="12months">Last 12 months</option>
            <option value="all">All time</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Custom:</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => {
              updateFilter('startDate', e.target.value);
              updateFilter('dateRange', 'all');
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
            placeholder="From"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => {
              updateFilter('endDate', e.target.value);
              updateFilter('dateRange', 'all');
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
            placeholder="To"
          />
        </div>
        
        {isFilterActive() && (
          <button
            onClick={clearCurrentFilters}
            className="text-sm text-orange-600 hover:text-orange-700"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
