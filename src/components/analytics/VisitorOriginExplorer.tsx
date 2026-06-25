// src/components/analytics/VisitorOriginExplorer.tsx
// WITHOUT lucide-react - using inline SVG icons
import { useState, useMemo } from 'react';
import { VisitorOriginWorldMap } from './VisitorOriginWorldMap';
import { VisitorOriginContinentMap } from './VisitorOriginContinentMap';
import { VisitorOriginCountryMap } from './VisitorOriginCountryMap';
import { VisitorOriginRegionMap } from './VisitorOriginRegionMap';
import { VisitorOriginCityGrid } from './VisitorOriginCityGrid';
import { UpgradePromptModal } from './UpgradePromptModal';

// SVG Icons (inline)
const Globe2Icon = ({ size = 22, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const LayersIcon = ({ size = 16, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const ZapIcon = ({ size = 12, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

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
  // SAFE: Ensure data is always an object with defaults
  const safeData = useMemo(() => {
    if (!data || typeof data !== 'object') {
      return { world: { total: 0 }, continents: [] };
    }
    return {
      world: data.world || { total: 0 },
      continents: Array.isArray(data.continents) ? data.continents : [],
    };
  }, [data]);

  // SAFE: Ensure simpleData is always an object
  const safeSimpleData = useMemo(() => {
    return simpleData && typeof simpleData === 'object' ? simpleData : {};
  }, [simpleData]);

  // SAFE: Get total visitors with multiple fallbacks
  const totalVisitors = useMemo(() => {
    if (safeData.world?.total !== undefined && safeData.world.total > 0) {
      return safeData.world.total;
    }
    const simpleTotal = Object.values(safeSimpleData).reduce((sum, val) => sum + val, 0);
    if (simpleTotal > 0) {
      return simpleTotal;
    }
    return 0;
  }, [safeData, safeSimpleData]);

  // SAFE: Get continent data with multiple fallbacks
  const continentData = useMemo(() => {
    if (safeData.continents && safeData.continents.length > 0) {
      return safeData.continents;
    }
    const total = Object.values(safeSimpleData).reduce((sum, val) => sum + val, 0) || 1;
    return Object.entries(safeSimpleData).map(([name, count]) => ({
      name,
      count,
      percentage: (count / total) * 100,
      children: [],
    }));
  }, [safeData, safeSimpleData]);

  const safeLimits = limits || DEFAULT_LIMITS;

  // Navigation states
  const [currentLevel, setCurrentLevel] = useState<DrillLevel>('world');
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // Upgrade Modal triggers
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [modalTargetTier, setModalTargetTier] = useState<SubscriptionTier>('growth');
  const [modalFeatureName, setModalFeatureName] = useState<string>('');

  // Drill level navigation controls
  const handleWorldExplore = () => {
    setCurrentLevel('continents');
  };

  const handleContinentClick = (continent: string) => {
    if (safeLimits.canViewCountries) {
      setSelectedContinent(continent);
      setCurrentLevel('countries');
    } else {
      setModalTargetTier('growth');
      setModalFeatureName('Country-Level Distribution');
      setShowUpgradeModal(true);
    }
  };

  const handleCountryClick = (country: string) => {
    if (safeLimits.canViewRegions) {
      setSelectedCountry(country);
      setCurrentLevel('regions');
    } else {
      setModalTargetTier('pro');
      setModalFeatureName('State, Province, & Region Analytics');
      setShowUpgradeModal(true);
    }
  };

  const handleRegionClick = (region: string) => {
    if (safeLimits.canViewCities) {
      setSelectedRegion(region);
      setCurrentLevel('cities');
    } else {
      setModalTargetTier('business');
      setModalFeatureName('Fine City & Suburb Grid Details');
      setShowUpgradeModal(true);
    }
  };

  const handleBack = () => {
    if (currentLevel === 'continents') {
      setCurrentLevel('world');
    } else if (currentLevel === 'countries') {
      setCurrentLevel('continents');
      setSelectedContinent(null);
    } else if (currentLevel === 'regions') {
      setCurrentLevel('countries');
      setSelectedCountry(null);
    } else if (currentLevel === 'cities') {
      setCurrentLevel('regions');
      setSelectedRegion(null);
    }
  };

  const handleUpgradeAction = () => {
    setShowUpgradeModal(false);
    if (onTierChange) {
      onTierChange(modalTargetTier);
    }
  };

  // Filter records with fallbacks
  const filteredCountryData = useMemo(() => {
    if (!selectedContinent) return [];
    const continent = safeData.continents?.find((c: any) => c.name === selectedContinent);
    return continent?.children || [];
  }, [safeData, selectedContinent]);

  const filteredRegionData = useMemo(() => {
    if (!selectedCountry) return [];
    for (const continent of (safeData.continents || [])) {
      const country = continent.children?.find((c: any) => c.name === selectedCountry);
      if (country?.children) {
        return country.children;
      }
    }
    return [];
  }, [safeData, selectedCountry]);

  const filteredCityData = useMemo(() => {
    if (!selectedRegion) return [];
    for (const continent of (safeData.continents || [])) {
      for (const country of (continent.children || [])) {
        const region = country.children?.find((r: any) => r.name === selectedRegion);
        if (region?.children) {
          return region.children;
        }
      }
    }
    return [];
  }, [safeData, selectedRegion]);

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
        <p className="text-stone-500">Loading visitor data...</p>
      </div>
    );
  }

  // Empty state
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

  // Render the appropriate view
  const renderView = () => {
    switch (currentLevel) {
      case 'world':
        return (
          <VisitorOriginWorldMap
            totalVisitors={totalVisitors}
            onExplore={handleWorldExplore}
            isLoading={false}
          />
        );

      case 'continents':
        return (
          <VisitorOriginContinentMap
            data={continentData}
            onContinentClick={handleContinentClick}
            onBack={handleBack}
            isLoading={false}
          />
        );

      case 'countries':
        return (
          <VisitorOriginCountryMap
            data={filteredCountryData}
            continentName={selectedContinent || ''}
            onCountryClick={handleCountryClick}
            onBack={handleBack}
            isLoading={false}
            geoData={null}
          />
        );

      case 'regions':
        return (
          <VisitorOriginRegionMap
            data={filteredRegionData}
            countryName={selectedCountry || ''}
            onRegionClick={handleRegionClick}
            onBack={handleBack}
            isLoading={false}
            geoData={null}
          />
        );

      case 'cities':
        return (
          <VisitorOriginCityGrid
            data={filteredCityData}
            regionName={selectedRegion || ''}
            onBack={handleBack}
            isLoading={false}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden transition-all duration-300">
      {/* Top Brand & Level Header */}
      <div className="px-6 py-5 border-b border-stone-100 bg-stone-50/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#f97316] rounded-2xl text-white shadow-md shadow-orange-500/20">
            <Globe2Icon size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-stone-900 tracking-tight">
                {title}
              </h3>
              <span className="text-[10px] bg-orange-100 text-orange-600 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                FastCheckin
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              {currentLevel === 'world' && '🌍 World Dashboard — Click bubble to explore'}
              {currentLevel === 'continents' && '🌍 Continents level — Select a continent to zoom'}
              {currentLevel === 'countries' && `📍 Countries in ${selectedContinent} — Drill country`}
              {currentLevel === 'regions' && `🗺️ Provinces & States in ${selectedCountry} — Select a region`}
              {currentLevel === 'cities' && `🏙️ Suburb grid inside ${selectedRegion} — Deepest analytics`}
            </p>
          </div>
        </div>

        {/* Tier status indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider font-mono">Plan:</span>
          <div className="flex gap-1">
            {(['starter', 'growth', 'pro', 'business'] as SubscriptionTier[]).map((tier) => (
              <button
                key={tier}
                onClick={() => onTierChange && onTierChange(tier)}
                className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg border transition-all ${
                  safeLimits.subscriptionTier === tier
                    ? 'bg-[#f97316] text-white border-[#f97316] shadow-md shadow-orange-500/10'
                    : 'bg-white hover:bg-stone-50 text-stone-500 border-stone-200'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="bg-stone-100/40 px-6 py-2 border-b border-stone-100 flex items-center gap-2 text-xs font-mono text-stone-400">
        <span
          className={currentLevel === 'world' ? 'text-[#f97316] font-bold' : 'cursor-pointer hover:text-stone-600'}
          onClick={() => {
            setCurrentLevel('world');
            setSelectedContinent(null);
            setSelectedCountry(null);
            setSelectedRegion(null);
          }}
        >
          World
        </span>

        {selectedContinent && (
          <>
            <span>/</span>
            <span
              className={currentLevel === 'countries' ? 'text-[#f97316] font-bold' : 'cursor-pointer hover:text-stone-600'}
              onClick={() => {
                setCurrentLevel('countries');
                setSelectedCountry(null);
                setSelectedRegion(null);
              }}
            >
              {selectedContinent}
            </span>
          </>
        )}

        {selectedCountry && (
          <>
            <span>/</span>
            <span
              className={currentLevel === 'regions' ? 'text-[#f97316] font-bold' : 'cursor-pointer hover:text-stone-600'}
              onClick={() => {
                setCurrentLevel('regions');
                setSelectedRegion(null);
              }}
            >
              {selectedCountry}
            </span>
          </>
        )}

        {selectedRegion && (
          <>
            <span>/</span>
            <span className="text-[#f97316] font-bold">{selectedRegion}</span>
          </>
        )}
      </div>

      {/* Main Map Viewer Layer */}
      <div className="p-6">
        {renderView()}
      </div>

      {/* Plan lock banners below the explorer */}
      <div className="bg-stone-50 px-6 py-4 border-t border-stone-200/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <LayersIcon size={16} className="text-[#f97316]" />
          <span className="text-xs text-stone-600 font-medium">
            Currently displaying data depths using a <strong className="capitalize text-stone-900">{safeLimits.subscriptionTier}</strong> subscription.
          </span>
        </div>
        {safeLimits.subscriptionTier !== 'business' && (
          <button
            onClick={() => {
              const target = safeLimits.subscriptionTier === 'starter' ? 'growth' :
                           safeLimits.subscriptionTier === 'growth' ? 'pro' : 'business';
              setModalTargetTier(target);
              setModalFeatureName(target === 'growth' ? 'Country Distribution' :
                                 target === 'pro' ? 'Region Distribution' : 'City Grid Breakdown');
              setShowUpgradeModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#f97316] to-amber-500 hover:from-[#ea580c] hover:to-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/10"
          >
            <ZapIcon size={12} className="fill-white" /> Upgrade Plan
          </button>
        )}
      </div>

      {/* Upgrade Modal */}
      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={safeLimits.subscriptionTier}
        targetTier={modalTargetTier}
        featureName={modalFeatureName}
        onUpgrade={handleUpgradeAction}
        onCompare={() => {
          setShowUpgradeModal(false);
          window.location.href = '/business/billing';
        }}
      />
    </div>
  );
}

export default VisitorOriginExplorer;
