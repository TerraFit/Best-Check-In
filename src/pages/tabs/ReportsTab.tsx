// src/pages/tabs/ReportsTab.tsx - SIMPLIFIED VERSION

import { useMemo, lazy, Suspense } from 'react';
import { TravelPatternsCard } from '../../components/analytics/TravelPatternsCard';
import { GuestOriginsChart } from '../../components/dashboard/GuestOriginsChart';
import { ReferralSourcesChart } from '../../components/dashboard/ReferralSourcesChart';
import { LengthOfStayChart } from '../../components/dashboard/LengthOfStayChart';
import { UpgradePreview } from '../../components/analytics/UpgradePreview';
import { useAnalytics } from '../../hooks/useAnalytics';
import { SubscriptionTier } from '../../types/analytics';

// ✅ Lazy load the explorer with error handling
const ExplorerMap = lazy(() => 
  import('../../components/analytics/VisitorOriginExplorer')
    .then(module => {
      // Log success
      console.log('✅ VisitorOriginExplorer loaded successfully');
      return { default: module.VisitorOriginExplorer || module.default };
    })
    .catch((err) => {
      console.error('❌ Failed to load VisitorOriginExplorer:', err);
      // Return a fallback component
      return { 
        default: ({ data, isLoading }: any) => (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8 text-center">
            <div className="text-4xl mb-4">🌍</div>
            <h3 className="text-lg font-semibold text-stone-900 mb-2">Visitor Origin Map</h3>
            <p className="text-stone-500 text-sm">
              {isLoading ? 'Loading...' : `${data?.length || 0} regions with ${data?.reduce((s: number, d: any) => s + d.count, 0) || 0} visitors`}
            </p>
            <p className="text-xs text-stone-400 mt-2">FastCheckin Analytics</p>
          </div>
        )
      };
    })
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

  // ✅ Prepare explorer data from bookings
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

  // ✅ Build limits object for the explorer
  const explorerLimits = {
    canViewCountries: limits.canViewCountries || false,
    canViewRegions: limits.canViewRegions || false,
    canViewCities: limits.canViewCities || false,
    maxDrillLevel: (limits.maxDrillLevel || 'world') as 'world' | 'continents' | 'countries' | 'regions' | 'cities',
    subscriptionTier: tier,
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

      {/* 🌍 Visitor Origin Explorer */}
      <Suspense fallback={
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-stone-500">Loading Visitor Origin Explorer...</p>
        </div>
      }>
        <ExplorerMap
          data={explorerData}
          limits={explorerLimits}
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
