// src/pages/tabs/ReportsTab.tsx
import { useMemo, lazy, Suspense } from 'react';
import { TravelPatternsCard } from '../../components/analytics/TravelPatternsCard';
import { GuestOriginsChart } from '../../components/dashboard/GuestOriginsChart';
import { ReferralSourcesChart } from '../../components/dashboard/ReferralSourcesChart';
import { LengthOfStayChart } from '../../components/dashboard/LengthOfStayChart';
import { UpgradePreview } from '../../components/analytics/UpgradePreview';
import { useAnalytics } from '../../hooks/useAnalytics';
import { SubscriptionTier } from '../../types/analytics';
import { buildVisitorData, buildSimpleVisitorData } from '../../services/visitorOriginAdapter';

// ✅ FIXED: Proper lazy loading with fallback
const VisitorOriginExplorer = lazy(() =>
  import('../../components/analytics/VisitorOriginExplorer')
    .then((module) => {
      console.log('✅ VisitorOriginExplorer module loaded:', Object.keys(module));
      // Try to get the component from named export or default export
      const Component = module.VisitorOriginExplorer || module.default;
      if (!Component) {
        console.error('❌ No component found in module:', module);
        // Return a fallback component
        return {
          default: ({ data, isLoading }: any) => {
            const total = data?.world?.total || 0;
            const continents = data?.continents || [];
            if (isLoading) {
              return (
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3" />
                  <p className="text-stone-400 text-sm">Loading visitor data...</p>
                </div>
              );
            }
            if (total === 0 && continents.length === 0) {
              return (
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8 text-center">
                  <div className="text-3xl mb-3">🌍</div>
                  <p className="text-stone-500 text-sm">No visitor data available yet</p>
                  <p className="text-xs text-stone-400 mt-1">As guests check in, their origin data will appear here</p>
                </div>
              );
            }
            return (
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 flex justify-between items-center">
                  <span className="text-sm font-medium text-stone-700">🌍 Visitor Origins</span>
                  <span className="text-xs text-stone-400">{total} total visitors</span>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {continents.slice(0, 8).map((item: any) => (
                      <div key={item.name} className="bg-stone-50 rounded-lg p-3 text-center border border-stone-200">
                        <div className="text-2xl mb-1">🌍</div>
                        <div className="text-sm font-medium text-stone-800 truncate">{item.name}</div>
                        <div className="text-xl font-bold text-orange-500">{item.count}</div>
                        <div className="text-xs text-stone-400">{item.percentage?.toFixed(1) || 0}%</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-stone-50 px-4 py-2 border-t border-stone-100 text-center text-xs text-stone-400">
                  Powered by FastCheckin
                </div>
              </div>
            );
          },
        };
      }
      return { default: Component };
    })
    .catch((err) => {
      console.error('❌ Failed to load VisitorOriginExplorer:', err);
      return {
        default: ({ data, isLoading }: any) => {
          const total = data?.world?.total || 0;
          const continents = data?.continents || [];
          if (isLoading) {
            return (
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3" />
                <p className="text-stone-400 text-sm">Loading visitor data...</p>
              </div>
            );
          }
          if (total === 0 && continents.length === 0) {
            return (
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8 text-center">
                <div className="text-3xl mb-3">🌍</div>
                <p className="text-stone-500 text-sm">No visitor data available yet</p>
                <p className="text-xs text-stone-400 mt-1">As guests check in, their origin data will appear here</p>
              </div>
            );
          }
          return (
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 flex justify-between items-center">
                <span className="text-sm font-medium text-stone-700">🌍 Visitor Origins</span>
                <span className="text-xs text-stone-400">{total} total visitors</span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {continents.slice(0, 8).map((item: any) => (
                    <div key={item.name} className="bg-stone-50 rounded-lg p-3 text-center border border-stone-200">
                      <div className="text-2xl mb-1">🌍</div>
                      <div className="text-sm font-medium text-stone-800 truncate">{item.name}</div>
                      <div className="text-xl font-bold text-orange-500">{item.count}</div>
                      <div className="text-xs text-stone-400">{item.percentage?.toFixed(1) || 0}%</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-stone-50 px-4 py-2 border-t border-stone-100 text-center text-xs text-stone-400">
                Powered by FastCheckin
              </div>
            </div>
          );
        },
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

  // ✅ ADAPTER: Convert FastCheckIn bookings to aggregated data
  const visitorData = useMemo(() => {
    const rawData = buildVisitorData(props.bookings || []);
    return {
      world: rawData?.world || { total: 0 },
      continents: Array.isArray(rawData?.continents) ? rawData.continents : [],
    };
  }, [props.bookings]);

  const simpleData = useMemo(() => {
    return buildSimpleVisitorData(props.bookings || []) || {};
  }, [props.bookings]);

  // ✅ Build limits with safe defaults
  const explorerLimits = {
    canViewCountries: limits?.canViewCountries || false,
    canViewRegions: limits?.canViewRegions || false,
    canViewCities: limits?.canViewCities || false,
    maxDrillLevel: (limits?.maxDrillLevel || 'world') as 'world' | 'continents' | 'countries' | 'regions' | 'cities',
    subscriptionTier: tier,
  };

  // Handle drill down
  const handleDrillDown = (item: any) => {
    console.log('🔽 Drill down:', item);
    if (item?.children && canDrillDeeper('continent')) {
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
          <p className="text-xl font-bold text-gray-900">{analyticsData?.summary?.totalGuests?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Check-ins</p>
          <p className="text-xl font-bold text-gray-900">{analyticsData?.summary?.totalBookings?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Occupancy</p>
          <p className="text-xl font-bold text-gray-900">{analyticsData?.summary?.occupancyRate || 0}%</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Avg Stay</p>
          <p className="text-xl font-bold text-gray-900">{analyticsData?.summary?.averageStay?.toFixed(1) || 0} nights</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Revenue</p>
          <p className="text-xl font-bold text-gray-900">R{(analyticsData?.summary?.totalRevenue || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Countries</p>
          <p className="text-xl font-bold text-gray-900">{analyticsData?.summary?.uniqueCountries || 0}</p>
        </div>
      </div>

      {/* 🌍 Visitor Origin Explorer */}
      <Suspense
        fallback={
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">Loading Visitor Origin Explorer...</p>
          </div>
        }
      >
        <VisitorOriginExplorer
          data={visitorData}
          simpleData={simpleData}
          limits={explorerLimits}
          isLoading={isLoading || (props.bookings || []).length === 0}
        />
      </Suspense>

      {/* Supporting Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {limits?.canViewCountries ? (
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

        {limits?.canViewCountries ? (
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
      {limits?.canViewTravelPatterns ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TravelPatternsCard
            arrivingFrom={analyticsData?.arrivingFrom || []}
            goingTo={analyticsData?.goingTo || []}
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
