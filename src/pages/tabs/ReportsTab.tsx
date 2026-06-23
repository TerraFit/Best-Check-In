// src/pages/tabs/ReportsTab.tsx
import { useMemo } from 'react';
import { VisitorOriginMap } from '../../components/analytics/VisitorOriginMap';
import { TravelPatternsCard } from '../../components/analytics/TravelPatternsCard';
import { UpgradePreview } from '../../components/analytics/UpgradePreview';
import { GuestOriginsChart } from '../../components/dashboard/GuestOriginsChart';
import { ReferralSourcesChart } from '../../components/dashboard/ReferralSourcesChart';
import { LengthOfStayChart } from '../../components/dashboard/LengthOfStayChart';
import { useAnalytics } from '../../hooks/useAnalytics';
import { SubscriptionTier } from '../../types/analytics';

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
  subscriptionTier: SubscriptionTier;
}

export function ReportsTab(props: ReportsTabProps) {
  const totalRevenue = props.bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
  
  const {
    analyticsData,
    filters: analyticsFilters,
    setFilters,
    drillLevel,
    setDrillLevel,
    drillPath,
    setDrillPath,
    limits,
    canDrillDeeper,
    getUpgradeMessage
  } = useAnalytics(props.bookings, props.subscriptionTier);

  // Handle drill down
  const handleDrillDown = (item: any) => {
    if (item.children && canDrillDeeper('continent')) {
      setDrillLevel('continent');
      setDrillPath([...drillPath, item.name]);
    }
  };

  const handleDrillUp = () => {
    if (drillLevel === 'continent') {
      setDrillLevel('world');
      setDrillPath(drillPath.slice(0, -1));
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Total Check-ins</p>
          <p className="text-2xl font-bold text-gray-900">{analyticsData.summary.totalBookings.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Total Guests</p>
          <p className="text-2xl font-bold text-gray-900">{analyticsData.summary.totalGuests.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Occupancy Rate</p>
          <p className="text-2xl font-bold text-gray-900">{analyticsData.summary.occupancyRate}%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Avg Stay</p>
          <p className="text-2xl font-bold text-gray-900">{analyticsData.summary.averageStay.toFixed(1)} nights</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">R {analyticsData.summary.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Countries</p>
          <p className="text-2xl font-bold text-gray-900">{analyticsData.summary.uniqueCountries}</p>
        </div>
      </div>

      {/* Interactive World Map - Hero Section */}
      <VisitorOriginMap
        data={analyticsData.originData}
        drillLevel={drillLevel}
        limits={limits}
        onDrillDown={handleDrillDown}
        onDrillUp={handleDrillUp}
        canDrillDeeper={canDrillDeeper}
        getUpgradeMessage={getUpgradeMessage}
      />

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guest Origins by Country */}
        {limits.canViewCountries ? (
          <GuestOriginsChart
            bookings={props.bookings}
            chartType={props.guestChartType}
            onChartTypeChange={props.onGuestChartTypeChange}
          />
        ) : (
          <UpgradePreview
            title="Guest Origins by Country"
            description="Discover which countries your guests are coming from to target your marketing efforts."
            upgradeTo="Growth"
          />
        )}

        {/* How Guests Found You */}
        {limits.canViewCountries ? (
          <ReferralSourcesChart
            bookings={props.bookings}
            chartType={props.referralChartType}
            onChartTypeChange={props.onReferralChartTypeChange}
          />
        ) : (
          <UpgradePreview
            title="How Guests Found You"
            description="Understand your marketing channels and where your bookings are coming from."
            upgradeTo="Growth"
          />
        )}
      </div>

      {/* Travel Patterns - Pro+ */}
      {limits.canViewTravelPatterns ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TravelPatternsCard
            arrivingFrom={analyticsData.arrivingFrom}
            goingTo={analyticsData.goingTo}
            isLoading={props.bookings.length === 0}
            title="Guest Travel Patterns"
          />
          <LengthOfStayChart bookings={props.bookings} />
        </div>
      ) : (
        <UpgradePreview
          title="Guest Travel Patterns"
          description="Discover where guests stay before arriving and where they travel to after departure."
          upgradeTo="Pro"
        />
      )}

      {/* Upgrade Preview Banner */}
      {props.subscriptionTier !== 'business' && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-semibold text-stone-900">📊 Want deeper insights?</h4>
            <p className="text-sm text-stone-500">
              Upgrade to {props.subscriptionTier === 'starter' ? 'Growth' : props.subscriptionTier === 'growth' ? 'Pro' : 'Business'} for {props.subscriptionTier === 'starter' ? 'country-level analytics and more' : props.subscriptionTier === 'growth' ? 'travel pattern tracking and regional insights' : 'full city-level drill-down'}
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/business/billing'}
            className="px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors whitespace-nowrap"
          >
            Upgrade Now
          </button>
        </div>
      )}
    </div>
  );
}
