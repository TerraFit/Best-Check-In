// src/components/analytics/VisitorOriginExplorer.tsx
console.log('🔍 Checking imports:', {
  VisitorOriginWorldMap: typeof VisitorOriginWorldMap,
  VisitorOriginContinentMap: typeof VisitorOriginContinentMap,
  VisitorOriginCountryMap: typeof VisitorOriginCountryMap,
  VisitorOriginRegionMap: typeof VisitorOriginRegionMap,
  VisitorOriginCityGrid: typeof VisitorOriginCityGrid,
  UpgradePromptModal: typeof UpgradePromptModal,
});

// ISOLATED VERSION - No child components, just simple UI
import { useState, useMemo } from 'react';

export type DrillLevel = 'world' | 'continents' | 'countries' | 'regions' | 'cities';
export type SubscriptionTier = 'starter' | 'growth' | 'pro' | 'business';

export interface ExplorerLimits {
  canViewCountries: boolean;
  canViewRegions: boolean;
  canViewCities: boolean;
  maxDrillLevel: DrillLevel;
  subscriptionTier: SubscriptionTier;
}

export interface VisitorOriginExplorerProps {
  data?: any;
  simpleData?: Record<string, number>;
  limits?: ExplorerLimits;
  onTierChange?: (tier: SubscriptionTier) => void;
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
}

const DEFAULT_LIMITS: ExplorerLimits = {
  canViewCountries: false,
  canViewRegions: false,
  canViewCities: false,
  maxDrillLevel: 'world',
  subscriptionTier: 'starter',
};

export function VisitorOriginExplorer({
  data,
  simpleData = {},
  limits = DEFAULT_LIMITS,
  onTierChange,
  isLoading = false,
  title = 'Visitor Origin Explorer',
  subtitle = 'Click the orange bubbles to drill down from world to cities'
}: VisitorOriginExplorerProps) {
  console.log('🔵 VisitorOriginExplorer - Component mounted', {
    data: !!data,
    simpleDataKeys: Object.keys(simpleData),
    limits,
    isLoading,
  });

  const safeData = useMemo(() => {
    if (!data || typeof data !== 'object') {
      return { world: { total: 0 }, continents: [] };
    }
    return {
      world: data.world || { total: 0 },
      continents: Array.isArray(data.continents) ? data.continents : [],
    };
  }, [data]);

  const totalVisitors = useMemo(() => {
    if (safeData.world?.total > 0) return safeData.world.total;
    const simpleTotal = Object.values(simpleData).reduce((sum, val) => sum + val, 0);
    return simpleTotal > 0 ? simpleTotal : 0;
  }, [safeData, simpleData]);

  const continentData = useMemo(() => {
    if (safeData.continents?.length > 0) return safeData.continents;
    const total = Object.values(simpleData).reduce((sum, val) => sum + val, 0) || 1;
    return Object.entries(simpleData).map(([name, count]) => ({
      name,
      count,
      percentage: (count / total) * 100,
      children: [],
    }));
  }, [safeData, simpleData]);

  const safeLimits = limits || DEFAULT_LIMITS;

  const [currentLevel, setCurrentLevel] = useState<'world' | 'continents' | 'countries' | 'regions' | 'cities'>('world');
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [modalTargetTier, setModalTargetTier] = useState<SubscriptionTier>('growth');
  const [modalFeatureName, setModalFeatureName] = useState<string>('');

  console.log('🔵 VisitorOriginExplorer - State:', {
    currentLevel,
    totalVisitors,
    continentDataLength: continentData.length,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
        <p className="text-stone-500">Loading visitor data...</p>
      </div>
    );
  }

  if (totalVisitors === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden p-12 text-center">
        <div className="text-5xl mb-4">🌍</div>
        <h3 className="text-lg font-semibold text-stone-900 mb-2">No Visitor Data Available</h3>
        <p className="text-stone-500 text-sm">As guests check in, their origin data will appear here.</p>
        <p className="text-xs text-stone-400 mt-4">Powered by FastCheckin</p>
      </div>
    );
  }

  // ✅ SIMPLE RENDER - Just show the data in a grid
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-stone-900">🌍 Visitor Origin Explorer</h3>
          <p className="text-xs text-stone-400">Showing {totalVisitors} visitors across {continentData.length} regions</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-stone-400">Plan:</span>
          <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-[#f97316] text-white">
            {safeLimits.subscriptionTier}
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {continentData.slice(0, 6).map((item: any) => (
            <div
              key={item.name}
              className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 text-center border border-orange-200 hover:border-orange-400 transition-all hover:shadow-md"
            >
              <div className="text-3xl mb-2">🌍</div>
              <div className="font-semibold text-stone-800">{item.name}</div>
              <div className="text-2xl font-bold text-orange-500">{item.count}</div>
              <div className="text-xs text-stone-400">{item.percentage?.toFixed(1) || 0}%</div>
            </div>
          ))}
        </div>
        {continentData.length > 6 && (
          <p className="text-center text-xs text-stone-400 mt-4">+{continentData.length - 6} more regions</p>
        )}
      </div>

      <div className="bg-stone-50 px-6 py-3 border-t border-stone-100 text-center text-xs text-stone-400">
        Powered by FastCheckin
      </div>
    </div>
  );
}

export default VisitorOriginExplorer;
