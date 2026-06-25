// src/pages/tabs/ReportsTab.tsx
import { useMemo, lazy, Suspense } from 'react';
import { TravelPatternsCard } from '../../components/analytics/TravelPatternsCard';
import { GuestOriginsChart } from '../../components/dashboard/GuestOriginsChart';
import { ReferralSourcesChart } from '../../components/dashboard/ReferralSourcesChart';
import { LengthOfStayChart } from '../../components/dashboard/LengthOfStayChart';
import { UpgradePreview } from '../../components/analytics/UpgradePreview';
import { useAnalytics } from '../../hooks/useAnalytics';
import { SubscriptionTier } from '../../types/analytics';

// ✅ Fallback Map Component (always works)
function FallbackMap({ data, drillLevel, limits, onDrillDown, onDrillUp, canDrillDeeper, getUpgradeMessage, isLoading }: any) {
  const totalVisitors = data?.reduce((sum: number, d: any) => sum + d.count, 0) || 0;
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-stone-500">Loading visitor data...</p>
      </div>
    );
  }

  if (totalVisitors === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-12 text-center">
        <div className="text-4xl mb-4">🌍</div>
        <h3 className="text-lg font-semibold text-stone-900 mb-2">No Visitor Data Available</h3>
        <p className="text-stone-500 text-sm">As guests check in, their origin data will appear here.</p>
      </div>
    );
  }

  // Simple working map view
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <span className="text-2xl">🌍</span>
            Visitor Origin Explorer
          </h3>
          <p className="text-xs text-stone-400">Showing {data?.length || 0} regions with {totalVisitors} total visitors</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">Plan:</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-green-100 text-green-700">
            {limits?.subscriptionTier || 'starter'}
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data?.slice(0, 8).map((item: any, index: number) => (
            <div 
              key={item.name || index}
              className="bg-stone-50 rounded-lg p-4 text-center border border-stone-200 hover:border-orange-300 transition-colors cursor-pointer"
              onClick={() => onDrillDown && onDrillDown(item)}
            >
              <div className="text-2xl mb-1">
                {item.name === 'Africa' && '🌍'}
                {item.name === 'Europe' && '🌍'}
                {item.name === 'North America' && '🌍'}
                {item.name === 'South America' && '🌍'}
                {item.name === 'Asia' && '🌍'}
                {item.name === 'Oceania' && '🌍'}
                {!['Africa','Europe','North America','South America','Asia','Oceania'].includes(item.name) && '📍'}
              </div>
              <p className="font-semibold text-stone-800 text-sm truncate">{item.name}</p>
              <p className="text-2xl font-bold text-orange-500">{item.count}</p>
              <p className="text-xs text-stone-400">{item.percentage?.toFixed(1)}%</p>
              {item.children && item.children.length > 0 && (
                <p className="text-[10px] text-stone-400 mt-1">👆 Click to explore</p>
              )}
            </div>
          ))}
        </div>
        {data?.length > 8 && (
          <p className="text-center text-sm text-stone-400 mt-4">+{data.length - 8} more regions</p>
        )}
      </div>

      <div className="bg-stone-50 px-6 py-3 border-t border-stone-100 flex justify-between text-xs text-stone-400">
        <span>Total: {totalVisitors.toLocaleString()} visitors</span>
        <span>Regions: {data?.length || 0}</span>
        <span>Powered by FastCheckin</span>
      </div>
    </div>
  );
}

// ✅ Lazy load the new explorer (if available)
const ExplorerMap = lazy(() => 
  import('../../components/analytics/VisitorOriginExplorer')
    .then(module => ({ default: module.VisitorOriginExplorer || module.default || FallbackMap }))
    .catch(() => ({ default: FallbackMap }))
);

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
  } = useAnalytics(props.bookings || [], tier);
  
  console.log('📊 ReportsTab - limits:', limits);

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
    } else if (drillLevel === 'region') {
      setDrillLevel('country');
    } else if (drillLevel === 'city') {
      setDrillLevel('region');
    }
  };

  // Prepare data for the map
  const mapData = useMemo(() => {
    const bookings = props.bookings || [];
    if (!bookings || bookings.length === 0) return [];
    
    const continentMap: Record<string, { name: string; count: number; children: any[] }> = {};
    
    bookings.forEach((b: any) => {
      const country = b.guest_country || b.country;
      if (!country) return;
      
      const countryToContinent: Record<string, string> = {
        'South Africa': 'Africa', 'Namibia': 'Africa', 'Botswana': 'Africa',
        'Zimbabwe': 'Africa', 'Mozambique': 'Africa', 'Lesotho': 'Africa',
        'Eswatini': 'Africa', 'Zambia': 'Africa', 'Angola': 'Africa',
        'Malawi': 'Africa', 'Tanzania': 'Africa', 'Kenya': 'Africa',
        'Nigeria': 'Africa', 'Ghana': 'Africa', 'Egypt': 'Africa',
        'Morocco': 'Africa', 'Tunisia': 'Africa', 'Algeria': 'Africa',
        'Mauritius': 'Africa', 'Seychelles': 'Africa',
        'Germany': 'Europe', 'France': 'Europe', 'United Kingdom': 'Europe',
        'Italy': 'Europe', 'Spain': 'Europe', 'Netherlands': 'Europe',
        'Switzerland': 'Europe', 'Austria': 'Europe', 'Belgium': 'Europe',
        'Portugal': 'Europe', 'Sweden': 'Europe', 'Norway': 'Europe',
        'Denmark': 'Europe', 'Finland': 'Europe', 'Greece': 'Europe',
        'Ireland': 'Europe', 'Poland': 'Europe', 'Czech Republic': 'Europe',
        'Hungary': 'Europe', 'Romania': 'Europe', 'Bulgaria': 'Europe',
        'Croatia': 'Europe', 'Russia': 'Europe', 'Ukraine': 'Europe',
        'United States': 'North America', 'United States of America': 'North America',
        'Canada': 'North America', 'Mexico': 'North America',
        'Brazil': 'South America', 'Argentina': 'South America',
        'Chile': 'South America', 'Colombia': 'South America',
        'Peru': 'South America', 'Venezuela': 'South America',
        'China': 'Asia', 'India': 'Asia', 'Japan': 'Asia',
        'South Korea': 'Asia', 'Singapore': 'Asia', 'Malaysia': 'Asia',
        'Indonesia': 'Asia', 'Thailand': 'Asia', 'Vietnam': 'Asia',
        'Philippines': 'Asia', 'Saudi Arabia': 'Asia',
        'United Arab Emirates': 'Asia', 'Israel': 'Asia', 'Turkey': 'Asia',
        'Australia': 'Oceania', 'New Zealand': 'Oceania', 'Fiji': 'Oceania',
      };
      
      const continent = countryToContinent[country] || 'Other';
      
      if (!continentMap[continent]) {
        continentMap[continent] = { name: continent, count: 0, children: [] };
      }
      continentMap[continent].count += 1;
      continentMap[continent].children.push({ name: country, count: 1, percentage: 0 });
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

  // Prepare explorer data
  const explorerData = useMemo(() => {
    const bookings = props.bookings || [];
    if (!bookings || bookings.length === 0) return [];
    
    return bookings.map((b: any) => ({
      id: b.id || `booking-${Math.random()}`,
      timestamp: b.created_at || b.check_in_date || new Date().toISOString(),
      continent: getContinentFromCountry(b.guest_country || b.country),
      country: b.guest_country || b.country || 'Unknown',
      region: b.guest_province || b.province || 'Unknown',
      city: b.guest_city || b.city || 'Unknown',
      count: 1,
    }));
  }, [props.bookings]);

  function getContinentFromCountry(country: string): string {
    if (!country) return 'Other';
    const map: Record<string, string> = {
      'South Africa': 'Africa', 'Namibia': 'Africa', 'Botswana': 'Africa',
      'Zimbabwe': 'Africa', 'Mozambique': 'Africa', 'Lesotho': 'Africa',
      'Eswatini': 'Africa', 'Zambia': 'Africa', 'Angola': 'Africa',
      'Malawi': 'Africa', 'Tanzania': 'Africa', 'Kenya': 'Africa',
      'Nigeria': 'Africa', 'Ghana': 'Africa', 'Egypt': 'Africa',
      'Morocco': 'Africa', 'Tunisia': 'Africa', 'Algeria': 'Africa',
      'Mauritius': 'Africa', 'Seychelles': 'Africa',
      'Germany': 'Europe', 'France': 'Europe', 'United Kingdom': 'Europe',
      'Italy': 'Europe', 'Spain': 'Europe', 'Netherlands': 'Europe',
      'Switzerland': 'Europe', 'Austria': 'Europe', 'Belgium': 'Europe',
      'Portugal': 'Europe', 'Sweden': 'Europe', 'Norway': 'Europe',
      'Denmark': 'Europe', 'Finland': 'Europe', 'Greece': 'Europe',
      'Ireland': 'Europe', 'Poland': 'Europe', 'Czech Republic': 'Europe',
      'Hungary': 'Europe', 'Romania': 'Europe', 'Bulgaria': 'Europe',
      'Croatia': 'Europe', 'Russia': 'Europe', 'Ukraine': 'Europe',
      'United States': 'North America', 'United States of America': 'North America',
      'Canada': 'North America', 'Mexico': 'North America',
      'Brazil': 'South America', 'Argentina': 'South America',
      'Chile': 'South America', 'Colombia': 'South America',
      'Peru': 'South America', 'Venezuela': 'South America',
      'China': 'Asia', 'India': 'Asia', 'Japan': 'Asia',
      'South Korea': 'Asia', 'Singapore': 'Asia', 'Malaysia': 'Asia',
      'Indonesia': 'Asia', 'Thailand': 'Asia', 'Vietnam': 'Asia',
      'Philippines': 'Asia', 'Saudi Arabia': 'Asia',
      'United Arab Emirates': 'Asia', 'Israel': 'Asia', 'Turkey': 'Asia',
      'Australia': 'Oceania', 'New Zealand': 'Oceania', 'Fiji': 'Oceania',
    };
    return map[country] || 'Other';
  }

  const tierDisplayNames: Record<string, string> = {
    'starter': 'Starter',
    'growth': 'Growth',
    'pro': 'Pro',
    'business': 'Business'
  };

  const tierColors: Record<string, string> = {
    'starter': 'bg-green-100 text-green-700',
    'growth': 'bg-blue-100 text-blue-700',
    'pro': 'bg-purple-100 text-purple-700',
    'business': 'bg-amber-100 text-amber-700'
  };

  return (
    <div className="space-y-6">
      {/* Plan Tier Indicator */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-stone-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Analytics & Reports</h2>
          <p className="text-sm text-gray-500">Understand your guest demographics and booking patterns</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Current Plan:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${tierColors[tier] || 'bg-gray-100 text-gray-700'}`}>
            {tierDisplayNames[tier] || tier}
          </span>
          {(tier === 'starter' || tier === 'growth') && (
            <button 
              onClick={() => window.location.href = '/business/billing'}
              className="text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors flex items-center gap-1"
            >
              Upgrade →
              <span className="text-[10px] text-stone-400 font-normal">
                {tier === 'starter' ? 'to unlock countries' : 'to unlock regions'}
              </span>
            </button>
          )}
          {tier === 'pro' && (
            <button 
              onClick={() => window.location.href = '/business/billing'}
              className="text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors flex items-center gap-1"
            >
              Upgrade to Business →
              <span className="text-[10px] text-stone-400 font-normal">for city-level insights</span>
            </button>
          )}
        </div>
      </div>

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

      {/* 🌍 Map Component - Lazy loaded with fallback */}
      <Suspense fallback={
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-stone-500">Loading Visitor Origin Explorer...</p>
        </div>
      }>
        <ExplorerMap
          data={explorerData}
          drillLevel={drillLevel}
          limits={limits}
          onDrillDown={handleDrillDown}
          onDrillUp={handleDrillUp}
          canDrillDeeper={canDrillDeeper}
          getUpgradeMessage={getUpgradeMessage}
          isLoading={isLoading || (props.bookings || []).length === 0}
        />
      </Suspense>

      {/* Supporting Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {limits.canViewCountries ? (
          <GuestOriginsChart
            bookings={props.bookings || []}
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
            bookings={props.bookings || []}
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
            isLoading={(props.bookings || []).length === 0}
            title="Guest Travel Patterns"
          />
          <LengthOfStayChart bookings={props.bookings || []} />
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
