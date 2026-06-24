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
  // ✅ FIX: Ensure subscriptionTier is properly passed
  const tier = props.subscriptionTier || 'starter';
  console.log('📊 ReportsTab - subscriptionTier received:', tier);
  
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
  } = useAnalytics(props.bookings, tier);
  
  // Debug: Log what limits we got
  console.log('📊 ReportsTab - limits:', limits);

  const totalRevenue = props.bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

  // Handle drill down
  const handleDrillDown = (item: any) => {
    console.log('🔽 Drill down:', item);
    if (item.children && canDrillDeeper('continent')) {
      setDrillLevel('continent');
      setDrillPath([...drillPath, item.name]);
    }
  };

  const handleDrillUp = () => {
    console.log('⬆️ Drill up from:', drillLevel);
    if (drillLevel === 'continent') {
      setDrillLevel('world');
      setDrillPath(drillPath.slice(0, -1));
    } else if (drillLevel === 'country') {
      setDrillLevel('continent');
    }
  };

  // Prepare data for the map - ensure we have continent data
  const mapData = useMemo(() => {
    if (!props.bookings || props.bookings.length === 0) return [];
    
    // Aggregate by continent from guest_country
    const continentMap: Record<string, { name: string; count: number; children: any[] }> = {};
    
    props.bookings.forEach((b: any) => {
      const country = b.guest_country || b.country;
      if (!country) return;
      
      // Simple continent mapping
      const countryToContinent: Record<string, string> = {
        // Africa
        'South Africa': 'Africa',
        'Namibia': 'Africa',
        'Botswana': 'Africa',
        'Zimbabwe': 'Africa',
        'Mozambique': 'Africa',
        'Lesotho': 'Africa',
        'Eswatini': 'Africa',
        'Zambia': 'Africa',
        'Angola': 'Africa',
        'Malawi': 'Africa',
        'Tanzania': 'Africa',
        'Kenya': 'Africa',
        'Nigeria': 'Africa',
        'Ghana': 'Africa',
        'Egypt': 'Africa',
        'Morocco': 'Africa',
        'Tunisia': 'Africa',
        'Algeria': 'Africa',
        'Mauritius': 'Africa',
        'Seychelles': 'Africa',
        // Europe
        'Germany': 'Europe',
        'France': 'Europe',
        'United Kingdom': 'Europe',
        'Italy': 'Europe',
        'Spain': 'Europe',
        'Netherlands': 'Europe',
        'Switzerland': 'Europe',
        'Austria': 'Europe',
        'Belgium': 'Europe',
        'Portugal': 'Europe',
        'Sweden': 'Europe',
        'Norway': 'Europe',
        'Denmark': 'Europe',
        'Finland': 'Europe',
        'Greece': 'Europe',
        'Ireland': 'Europe',
        'Poland': 'Europe',
        'Czech Republic': 'Europe',
        'Hungary': 'Europe',
        'Romania': 'Europe',
        'Bulgaria': 'Europe',
        'Croatia': 'Europe',
        'Russia': 'Europe',
        'Ukraine': 'Europe',
        // North America
        'United States': 'North America',
        'United States of America': 'North America',
        'Canada': 'North America',
        'Mexico': 'North America',
        // South America
        'Brazil': 'South America',
        'Argentina': 'South America',
        'Chile': 'South America',
        'Colombia': 'South America',
        'Peru': 'South America',
        'Venezuela': 'South America',
        // Asia
        'China': 'Asia',
        'India': 'Asia',
        'Japan': 'Asia',
        'South Korea': 'Asia',
        'Singapore': 'Asia',
        'Malaysia': 'Asia',
        'Indonesia': 'Asia',
        'Thailand': 'Asia',
        'Vietnam': 'Asia',
        'Philippines': 'Asia',
        'Saudi Arabia': 'Asia',
        'United Arab Emirates': 'Asia',
        'Israel': 'Asia',
        'Turkey': 'Asia',
        // Oceania
        'Australia': 'Oceania',
        'New Zealand': 'Oceania',
        'Fiji': 'Oceania',
      };
      
      const continent = countryToContinent[country] || 'Other';
      
      if (!continentMap[continent]) {
        continentMap[continent] = { name: continent, count: 0, children: [] };
      }
      continentMap[continent].count += 1;
      continentMap[continent].children.push({
        name: country,
        count: 1,
        percentage: 0 // Will be calculated later
      });
    });
    
    const total = Object.values(continentMap).reduce((sum, c) => sum + c.count, 0) || 1;
    
    return Object.values(continentMap).map(c => ({
      name: c.name,
      count: c.count,
      percentage: (c.count / total) * 100,
      children: c.children.map((child: any) => ({
        ...child,
        percentage: (child.count / c.count) * 100
      }))
    })).sort((a, b) => b.count - a.count);
  }, [props.bookings]);

  console.log('📊 ReportsTab - mapData:', mapData);

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

      {/* 🌍 Interactive World Map */}
      <VisitorOriginMap
        data={mapData}
        drillLevel={drillLevel}
        limits={limits}
        onDrillDown={handleDrillDown}
        onDrillUp={handleDrillUp}
        canDrillDeeper={canDrillDeeper}
        getUpgradeMessage={getUpgradeMessage}
        isLoading={isLoading || props.bookings.length === 0}
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
