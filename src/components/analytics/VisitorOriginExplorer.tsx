import { useState, useMemo } from 'react';
import { VisitorOriginWorldMap } from './VisitorOriginWorldMap';
import { VisitorOriginContinentMap } from './VisitorOriginContinentMap';
import { VisitorOriginCountryMap } from './VisitorOriginCountryMap';
import { VisitorOriginRegionMap } from './VisitorOriginRegionMap';
import { VisitorOriginCityGrid } from './VisitorOriginCityGrid';
import { UpgradePromptModal } from './UpgradePromptModal';
import { SubscriptionTier, SubscriptionLimits } from '../../types';
import { Globe2, Layers, Zap } from 'lucide-react';

type DrillLevel = 'world' | 'continents' | 'countries' | 'regions' | 'cities';

export interface VisitorOriginExplorerProps {
  data: any[];
  limits: SubscriptionLimits;
  onTierChange?: (tier: SubscriptionTier) => void;
  isLoading?: boolean;
}

export function VisitorOriginExplorer({
  data,
  limits,
  onTierChange,
  isLoading = false
}: VisitorOriginExplorerProps) {
  // Navigation states
  const [currentLevel, setCurrentLevel] = useState<DrillLevel>('world');
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // Upgrade Modal triggers
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [modalTargetTier, setModalTargetTier] = useState<SubscriptionTier>('growth');
  const [modalFeatureName, setModalFeatureName] = useState<string>('');

  // Extract total visitor count safely
  const totalVisitors = useMemo(() => {
    return data.length;
  }, [data]);

  // Aggregate continent distribution
  const continentData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const continentCounts: Record<string, number> = {};
    data.forEach((item) => {
      const cont = item.continent;
      if (cont) {
        continentCounts[cont] = (continentCounts[cont] || 0) + 1;
      }
    });

    const total = Object.values(continentCounts).reduce((sum, count) => sum + count, 0) || 1;

    return Object.entries(continentCounts).map(([name, count]) => ({
      name,
      count,
      percentage: (count / total) * 100,
    })).sort((a, b) => b.count - a.count);
  }, [data]);

  // Drill level navigation controls with tier permission checks
  const handleWorldExplore = () => {
    setCurrentLevel('continents');
  };

  const handleContinentClick = (continent: string) => {
    if (limits.canViewCountries) {
      setSelectedContinent(continent);
      setCurrentLevel('countries');
    } else {
      setModalTargetTier('growth');
      setModalFeatureName('Country-Level Distribution');
      setShowUpgradeModal(true);
    }
  };

  const handleCountryClick = (country: string) => {
    if (limits.canViewRegions) {
      setSelectedCountry(country);
      setCurrentLevel('regions');
    } else {
      setModalTargetTier('pro');
      setModalFeatureName('State, Province, & Region Analytics');
      setShowUpgradeModal(true);
    }
  };

  const handleRegionClick = (region: string) => {
    if (limits.canViewCities) {
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

  // Upgrading demo functions
  const handleUpgradeAction = () => {
    setShowUpgradeModal(false);
    if (onTierChange) {
      // Simulate tier upgrade
      onTierChange(modalTargetTier);
    }
  };

  // Filter records based on our active drill layers
  const filteredCountryData = useMemo(() => {
    if (!selectedContinent) return [];
    return data.filter(d => d.continent.toLowerCase() === selectedContinent.toLowerCase());
  }, [data, selectedContinent]);

  const filteredRegionData = useMemo(() => {
    if (!selectedCountry) return [];
    return data.filter(d => d.country.toLowerCase() === selectedCountry.toLowerCase());
  }, [data, selectedCountry]);

  const filteredCityData = useMemo(() => {
    if (!selectedRegion) return [];
    return data.filter(d => d.region.toLowerCase() === selectedRegion.toLowerCase());
  }, [data, selectedRegion]);

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden transition-all duration-300">
      {/* Top Brand & Level Header */}
      <div className="px-6 py-5 border-b border-stone-100 bg-stone-50/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500 rounded-2xl text-white shadow-md shadow-orange-500/20">
            <Globe2 size={22} className="animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold text-stone-900 tracking-tight">
                Visitor Origin Explorer
              </h3>
              <span className="text-[10px] bg-orange-100 text-orange-600 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                FastCheckin SDK
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

        {/* Tier status indicator with inline override buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider font-mono">Demo Plan:</span>
          <div className="flex gap-1">
            {(['starter', 'growth', 'pro', 'business'] as SubscriptionTier[]).map((tier) => (
              <button
                key={tier}
                onClick={() => onTierChange && onTierChange(tier)}
                className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg border transition-all ${
                  limits.subscriptionTier === tier
                    ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/10'
                    : 'bg-white hover:bg-stone-50 text-stone-500 border-stone-200'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Embedded Level Navigation Status Breadcrumb bar */}
      <div className="bg-stone-100/40 px-6 py-2 border-b border-stone-100 flex items-center gap-2 text-xs font-mono text-stone-400">
        <span className={currentLevel === 'world' ? 'text-orange-500 font-bold' : 'cursor-pointer hover:text-stone-600'} onClick={() => {
          setCurrentLevel('world');
          setSelectedContinent(null);
          setSelectedCountry(null);
          setSelectedRegion(null);
        }}>World</span>
        
        {selectedContinent && (
          <>
            <span>/</span>
            <span className={currentLevel === 'countries' ? 'text-orange-500 font-bold' : 'cursor-pointer hover:text-stone-600'} onClick={() => {
              setCurrentLevel('countries');
              setSelectedCountry(null);
              setSelectedRegion(null);
            }}>{selectedContinent}</span>
          </>
        )}

        {selectedCountry && (
          <>
            <span>/</span>
            <span className={currentLevel === 'regions' ? 'text-orange-500 font-bold' : 'cursor-pointer hover:text-stone-600'} onClick={() => {
              setCurrentLevel('regions');
              setSelectedRegion(null);
            }}>{selectedCountry}</span>
          </>
        )}

        {selectedRegion && (
          <>
            <span>/</span>
            <span className="text-orange-500 font-bold">{selectedRegion}</span>
          </>
        )}
      </div>

      {/* Main Map Viewer Layer */}
      <div className="p-6">
        {currentLevel === 'world' && (
          <VisitorOriginWorldMap
            totalVisitors={totalVisitors}
            onExplore={handleWorldExplore}
            isLoading={isLoading}
          />
        )}

        {currentLevel === 'continents' && (
          <VisitorOriginContinentMap
            data={continentData}
            onContinentClick={handleContinentClick}
            onBack={handleBack}
            isLoading={isLoading}
          />
        )}

        {currentLevel === 'countries' && (
          <VisitorOriginCountryMap
            data={filteredCountryData}
            continentName={selectedContinent || ''}
            onCountryClick={handleCountryClick}
            onBack={handleBack}
            isLoading={isLoading}
          />
        )}

        {currentLevel === 'regions' && (
          <VisitorOriginRegionMap
            data={filteredRegionData}
            countryName={selectedCountry || ''}
            onRegionClick={handleRegionClick}
            onBack={handleBack}
            isLoading={isLoading}
          />
        )}

        {currentLevel === 'cities' && (
          <VisitorOriginCityGrid
            data={filteredCityData}
            regionName={selectedRegion || ''}
            onBack={handleBack}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Plan lock banners below the explorer */}
      <div className="bg-stone-50 px-6 py-4 border-t border-stone-200/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Layers size={16} className="text-orange-500" />
          <span className="text-xs text-stone-600 font-medium">
            Currently displaying data depths using a simulated <strong className="capitalize text-stone-900">{limits.subscriptionTier}</strong> subscription limits.
          </span>
        </div>
        {limits.subscriptionTier !== 'business' && (
          <button 
            onClick={() => {
              const target = limits.subscriptionTier === 'starter' ? 'growth' : limits.subscriptionTier === 'growth' ? 'pro' : 'business';
              setModalTargetTier(target);
              setModalFeatureName(target === 'growth' ? 'Country Distribution' : target === 'pro' ? 'Region Distribution' : 'City Grid Breakdown');
              setShowUpgradeModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/10"
          >
            <Zap size={12} className="fill-white" /> Upgrade Plan
          </button>
        )}
      </div>

      {/* Render the lock upgrade modal dynamically */}
      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={limits.subscriptionTier}
        targetTier={modalTargetTier}
        featureName={modalFeatureName}
        onUpgrade={handleUpgradeAction}
        onCompare={() => {
          setShowUpgradeModal(false);
          alert('FastCheckin billing page loaded (Demo mode - plan limits simulated successfully!)');
        }}
      />
    </div>
  );
}
