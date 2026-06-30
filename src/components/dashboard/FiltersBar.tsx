import { useTranslation } from '../../i18n';

interface FiltersBarProps {
  filters: {
    dateRange: string
    startDate: string
    endDate: string
    searchTerm: string
    statusFilter: string
    provinceFilter: string
    cityFilter: string
    countryFilter: string
  }
  updateFilter: (key: string, value: any) => void
  clearCurrentFilters: () => void
  isFilterActive: () => boolean
  uniqueProvinces: string[]
  uniqueCities: string[]
  uniqueCountries: string[]
}

export function FiltersBar({
  filters,
  updateFilter,
  clearCurrentFilters,
  isFilterActive,
  uniqueProvinces,
  uniqueCities,
  uniqueCountries
}: FiltersBarProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <select
            value={filters.dateRange}
            onChange={(e) => {
              updateFilter('dateRange', e.target.value);
              updateFilter('startDate', '');
              updateFilter('endDate', '');
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="7days">7 {t('filters_days')}</option>
            <option value="30days">30 {t('filters_days')}</option>
            <option value="90days">90 {t('filters_days')}</option>
            <option value="12months">12 {t('filters_months')}</option>
            <option value="all">{t('filters_all_time')}</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{t('filters_from')}:</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => {
              updateFilter('startDate', e.target.value);
              updateFilter('dateRange', 'all');
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{t('filters_to')}:</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => {
              updateFilter('endDate', e.target.value);
              updateFilter('dateRange', 'all');
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={t('filters_search')}
              value={filters.searchTerm}
              onChange={(e) => updateFilter('searchTerm', e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center mt-4 pt-4 border-t border-gray-200">
        <select
          value={filters.statusFilter}
          onChange={(e) => updateFilter('statusFilter', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="">{t('filters_all_statuses')}</option>
          <option value="checked_in">{t('filters_status_checked_in')}</option>
          <option value="completed">{t('filters_status_completed')}</option>
          <option value="confirmed">{t('filters_status_confirmed')}</option>
        </select>
        
        <select
          value={filters.provinceFilter}
          onChange={(e) => updateFilter('provinceFilter', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="">{t('filters_all_provinces')}</option>
          {uniqueProvinces.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        
        <select
          value={filters.cityFilter}
          onChange={(e) => updateFilter('cityFilter', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="">{t('filters_all_cities')}</option>
          {uniqueCities.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        
        <select
          value={filters.countryFilter}
          onChange={(e) => updateFilter('countryFilter', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="">{t('filters_all_countries')}</option>
          {uniqueCountries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        
        {isFilterActive() && (
          <button
            onClick={clearCurrentFilters}
            className="text-sm text-orange-600 hover:text-orange-700"
          >
            {t('filters_clear')}
          </button>
        )}
      </div>
    </div>
  );
}
