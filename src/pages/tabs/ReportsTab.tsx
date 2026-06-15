// src/pages/tabs/ReportsTab.tsx
import { ReportFilters, ReportSummary, GuestOriginsChart, ReferralSourcesChart, LengthOfStayChart } from '../../components/dashboard';

interface ReportsTabProps {
  bookings: any[];
  totalBookings: number;
  todayArrivals: any[];
  todayStayovers: any[];
  todayCheckouts: any[];
  filters: any;
  onUpdateFilter: (key: string, value: any) => void;
  onClearFilters: () => void;
  isFilterActive: () => boolean;
  onFilterChange: () => void;
  guestChartType: 'donut' | 'bar';
  onGuestChartTypeChange: (type: 'donut' | 'bar') => void;
  referralChartType: 'donut' | 'bar';
  onReferralChartTypeChange: (type: 'donut' | 'bar') => void;
  onExport: () => void;
}

export function ReportsTab(props: ReportsTabProps) {
  const totalRevenue = props.bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Total Check-ins Counter Card */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Total Check-ins</p>
              <p className="text-4xl font-bold text-white mt-1">{props.totalBookings.toLocaleString()}</p>
              <p className="text-orange-100 text-xs mt-2">
                {props.filters.dateRange !== 'all' || props.filters.startDate 
                  ? 'For selected date range' 
                  : 'All time • All statuses'}
              </p>
            </div>
            <div className="bg-white/20 rounded-full p-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Today's Arrivals</p>
          <p className="text-2xl font-bold text-gray-900">{props.todayArrivals.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Current Stayovers</p>
          <p className="text-2xl font-bold text-gray-900">{props.todayStayovers.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Today's Check-outs</p>
          <p className="text-2xl font-bold text-gray-900">{props.todayCheckouts.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">R {totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      <ReportFilters
        filters={props.filters}
        updateFilter={props.onUpdateFilter}
        clearCurrentFilters={props.onClearFilters}
        isFilterActive={props.isFilterActive}
        onFilterChange={props.onFilterChange}
      />

      <ReportSummary bookings={props.bookings} onExport={props.onExport} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GuestOriginsChart
          bookings={props.bookings}
          chartType={props.guestChartType}
          onChartTypeChange={props.onGuestChartTypeChange}
        />
        <ReferralSourcesChart
          bookings={props.bookings}
          chartType={props.referralChartType}
          onChartTypeChange={props.onReferralChartTypeChange}
        />
      </div>

      {/* EASY TO ADD NEW CHARTS HERE! */}
      <LengthOfStayChart bookings={props.bookings} />
      
      {/* Future analytics can be added here without touching other tabs */}
      {/* 
      <SeasonalTrendsChart bookings={props.bookings} />
      <RevenueForecastChart bookings={props.bookings} />
      <GuestSatisfactionChart bookings={props.bookings} />
      */}
    </div>
  );
}
