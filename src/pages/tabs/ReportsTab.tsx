// src/pages/tabs/ReportsTab.tsx
import { useMemo } from 'react';
import { VisitorOriginMap } from '../../components/analytics/VisitorOriginMap';
import { TravelPatternsCard } from '../../components/analytics/TravelPatternsCard';
import { GuestOriginsChart } from '../../components/dashboard/GuestOriginsChart';
import { ReferralSourcesChart } from '../../components/dashboard/ReferralSourcesChart';
import { LengthOfStayChart } from '../../components/dashboard/LengthOfStayChart';
import { UpgradePreview } from '../../components/analytics/UpgradePreview';
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
  const {
    analyticsData,
    drillLevel,
    setDrillLevel,
    drillPath,
    setDrillPath,
    limits,
    canDrillDeeper,
    getUpgradeMessage,
    isLoading
  } = useAnalytics(props.bookings, props.subscriptionTier);

  const totalRevenue = props.bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

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
    } else if (drillLevel === 'country') {
      setDrillLevel('continent');
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Guests</p>
          <p className="text-xl font-bold text-gray-900">{analyticsData.summary.totalGuests.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Check-ins</p>
          <p className="text-xl font-bold text-gray-900">{analyticsData.summary.totalBookings.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Occupancy</p>
          <p className="text-xl font-bold text-gray-900">{analyticsData.summary.occupancyRate}%</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Avg Stay</p>
          <p className="text-xl font-bold text-gray-900">{analyticsData.summary.averageStay.toFixed(1)} nights</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Revenue</p>
          <p className="text-xl font-bold text-gray-900">R{analyticsData.summary.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Countries</p>
          <p className="text-xl font-bold text-gray-900">{analyticsData.summary.uniqueCountries}</p>
        </div>
      </div>

      {/* 🌍 Interactive World Map - SINGLE RENDER */}
      <VisitorOriginMap
        data={analyticsData.originData}
        drillLevel={drillLevel}
        limits={limits}
        onDrillDown={handleDrillDown}
        onDrillUp={handleDrillUp}
        canDrillDeeper={canDrillDeeper}
        getUpgradeMessage={getUpgradeMessage}
        isLoading={isLoading}
      />

      {/* Supporting Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      {/* Travel Patterns */}
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
    </div>
  );
}
