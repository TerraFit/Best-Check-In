import { useState, useEffect, useCallback } from 'react';
import { VisitorOriginWorldMap } from './VisitorOriginWorldMap';
import { VisitorOriginContinentMap } from './VisitorOriginContinentMap';
import { VisitorOriginCountryMap } from './VisitorOriginCountryMap';
import { VisitorOriginRegionMap } from './VisitorOriginRegionMap';
import { VisitorOriginCityGrid } from './VisitorOriginCityGrid';
import { UpgradePromptModal } from './UpgradePromptModal';
import { CityInsightPanel } from './CityInsightPanel';
import { GeographicMapViewport } from './geo/GeographicMapViewport';
import { MAP_ENGINE } from './geo/mapConfig';
import { SubscriptionTier, SubscriptionLimits } from '../../types';
import { Globe2, Layers, Zap, ArrowLeft } from 'lucide-react';
import {
  fetchVisitorOrigins,
  type OriginNode,
  type CityDashboard,
  type DrillLevel,
} from '../../services/analyticsApi';

export interface VisitorOriginExplorerProps {
  businessId: string;
  dateFrom?: string;
  dateTo?: string;
  limits: SubscriptionLimits;
  canInteractiveMap?: boolean;
  isLoading?: boolean;
  /** @deprecated client data path — ignored; server is source of truth */
  data?: any[];
  onTierChange?: (tier: SubscriptionTier) => void;
}

type UiLevel = 'world' | 'continents' | 'countries' | 'regions' | 'cities' | 'cityDetail';

function toApiLevel(ui: UiLevel): DrillLevel {
  if (ui === 'world') return 'world';
  if (ui === 'continents') return 'continent';
  if (ui === 'countries') return 'country';
  if (ui === 'regions') return 'region';
  return 'city';
}

/** Display-side country → continent for choropleth join (does not mutate server data). */
const COUNTRY_TO_CONTINENT: Record<string, string> = {
  'South Africa': 'Africa',
  Namibia: 'Africa',
  Botswana: 'Africa',
  Zimbabwe: 'Africa',
  Mozambique: 'Africa',
  Lesotho: 'Africa',
  Eswatini: 'Africa',
  Kenya: 'Africa',
  Nigeria: 'Africa',
  Egypt: 'Africa',
  Morocco: 'Africa',
  Tanzania: 'Africa',
  Ghana: 'Africa',
  'United Kingdom': 'Europe',
  Germany: 'Europe',
  France: 'Europe',
  Netherlands: 'Europe',
  Switzerland: 'Europe',
  Italy: 'Europe',
  Spain: 'Europe',
  Portugal: 'Europe',
  Austria: 'Europe',
  Belgium: 'Europe',
  Sweden: 'Europe',
  Norway: 'Europe',
  Denmark: 'Europe',
  Finland: 'Europe',
  Greece: 'Europe',
  Ireland: 'Europe',
  Poland: 'Europe',
  Russia: 'Europe',
  Turkey: 'Europe',
  Czechia: 'Europe',
  Hungary: 'Europe',
  Romania: 'Europe',
  Bulgaria: 'Europe',
  Croatia: 'Europe',
  Ukraine: 'Europe',
  'United States': 'North America',
  Canada: 'North America',
  Mexico: 'North America',
  Brazil: 'South America',
  Argentina: 'South America',
  Chile: 'South America',
  Colombia: 'South America',
  Peru: 'South America',
  Australia: 'Oceania',
  'New Zealand': 'Oceania',
  Fiji: 'Oceania',
  China: 'Asia',
  India: 'Asia',
  Japan: 'Asia',
  'South Korea': 'Asia',
  Singapore: 'Asia',
  Malaysia: 'Asia',
  Indonesia: 'Asia',
  Thailand: 'Asia',
  Vietnam: 'Asia',
  Philippines: 'Asia',
  'United Arab Emirates': 'Asia',
  'Saudi Arabia': 'Asia',
  Israel: 'Asia',
  Pakistan: 'Asia',
  Bangladesh: 'Asia',
};

function continentOfCountryName(country: string): string {
  if (!country) return 'Other';
  return COUNTRY_TO_CONTINENT[country] || COUNTRY_TO_CONTINENT[country.trim()] || 'Other';
}

export function VisitorOriginExplorer({
  businessId,
  dateFrom,
  dateTo,
  limits,
  canInteractiveMap = true,
  isLoading: parentLoading = false,
}: VisitorOriginExplorerProps) {
  const [currentLevel, setCurrentLevel] = useState<UiLevel>('world');
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const [nodes, setNodes] = useState<OriginNode[]>([]);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [domesticCount, setDomesticCount] = useState(0);
  const [internationalCount, setInternationalCount] = useState(0);
  const [cityPanel, setCityPanel] = useState<CityDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [modalTargetTier, setModalTargetTier] = useState<SubscriptionTier>('growth');
  const [modalFeatureName, setModalFeatureName] = useState('');

  const interactive = canInteractiveMap && limits.subscriptionTier !== 'starter';
  const useGeoMap = MAP_ENGINE === 'geo';

  const loadLevel = useCallback(
    async (
      uiLevel: UiLevel,
      parent: {
        continent?: string | null;
        country?: string | null;
        region?: string | null;
        city?: string | null;
      }
    ) => {
      if (!businessId) return;
      if (!interactive && uiLevel !== 'world') {
        setShowUpgradeModal(true);
        setModalTargetTier('growth');
        setModalFeatureName('Interactive Visitor Origin Explorer');
        return;
      }

      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetchVisitorOrigins({
          businessId,
          level: toApiLevel(uiLevel === 'cityDetail' ? 'cities' : uiLevel),
          dateFrom,
          dateTo,
          continent: parent.continent,
          country: parent.country,
          region: parent.region,
          city: parent.city,
        });

        if (res.upgradeRequired) {
          setModalTargetTier((res.requiredPlan as SubscriptionTier) || 'growth');
          setModalFeatureName(res.error || 'Upgrade required');
          setShowUpgradeModal(true);
          setLoading(false);
          return;
        }

        if (!res.success) {
          setFetchError(res.error || 'Failed to load origins');
          setNodes([]);
        } else {
          setNodes(res.nodes || []);
          setTotalVisitors(res.meta?.totalVisitors || 0);
          setDomesticCount(res.meta?.domesticCount || 0);
          setInternationalCount(res.meta?.internationalCount || 0);
          if (res.cityDashboard) setCityPanel(res.cityDashboard);

          // Auto-skip to city when region data is empty
          if (uiLevel === 'regions' && res.skipToCity && parent.country) {
            setCurrentLevel('cities');
            setSelectedRegion(null);
            const cityRes = await fetchVisitorOrigins({
              businessId,
              level: 'city',
              dateFrom,
              dateTo,
              continent: parent.continent,
              country: parent.country,
            });
            if (cityRes.success) setNodes(cityRes.nodes || []);
          }
        }
      } catch (e: any) {
        setFetchError(e?.message || 'Failed to load origins');
      } finally {
        setLoading(false);
      }
    },
    [businessId, dateFrom, dateTo, interactive]
  );

  useEffect(() => {
    if (!businessId) return;
    if (!interactive) {
      setCurrentLevel('world');
      return;
    }
    loadLevel('world', {});
  }, [businessId, dateFrom, dateTo, interactive, loadLevel]);

  const handleWorldExplore = () => {
    if (!interactive) {
      setModalTargetTier('growth');
      setModalFeatureName('Interactive Visitor Origin Explorer');
      setShowUpgradeModal(true);
      return;
    }
    setCurrentLevel('continents');
    loadLevel('continents', {});
  };

  const handleContinentClick = (continent: string) => {
    if (!limits.canViewCountries) {
      setModalTargetTier('growth');
      setModalFeatureName('Country-Level Distribution');
      setShowUpgradeModal(true);
      return;
    }
    setSelectedContinent(continent);
    setSelectedCountry(null);
    setSelectedRegion(null);
    setSelectedCity(null);
    setCurrentLevel('countries');
    loadLevel('countries', { continent });
  };

  const handleCountryClick = (country: string) => {
    if (!limits.canViewRegions && !limits.canViewCities) {
      setModalTargetTier('pro');
      setModalFeatureName('Province, Region & City Analytics');
      setShowUpgradeModal(true);
      return;
    }
    setSelectedCountry(country);
    setSelectedRegion(null);
    setSelectedCity(null);
    if (limits.canViewRegions) {
      setCurrentLevel('regions');
      loadLevel('regions', { continent: selectedContinent, country });
    } else {
      setCurrentLevel('cities');
      loadLevel('cities', { continent: selectedContinent, country });
    }
  };

  const handleRegionClick = (region: string) => {
    if (!limits.canViewCities) {
      setModalTargetTier('pro');
      setModalFeatureName('City Insights');
      setShowUpgradeModal(true);
      return;
    }
    setSelectedRegion(region);
    setSelectedCity(null);
    setCurrentLevel('cities');
    loadLevel('cities', {
      continent: selectedContinent,
      country: selectedCountry,
      region,
    });
  };

  const handleCityClick = (city: string) => {
    setSelectedCity(city);
    setCurrentLevel('cityDetail');
    loadLevel('cityDetail', {
      continent: selectedContinent,
      country: selectedCountry,
      region: selectedRegion,
      city,
    });
  };

  const handleBack = () => {
    if (currentLevel === 'cityDetail') {
      setSelectedCity(null);
      setCurrentLevel('cities');
      loadLevel('cities', {
        continent: selectedContinent,
        country: selectedCountry,
        region: selectedRegion,
      });
    } else if (currentLevel === 'cities') {
      setSelectedRegion(null);
      if (selectedCountry && limits.canViewRegions) {
        setCurrentLevel('regions');
        loadLevel('regions', { continent: selectedContinent, country: selectedCountry });
      } else {
        setCurrentLevel('countries');
        loadLevel('countries', { continent: selectedContinent });
      }
    } else if (currentLevel === 'regions') {
      setSelectedCountry(null);
      setCurrentLevel('countries');
      loadLevel('countries', { continent: selectedContinent });
    } else if (currentLevel === 'countries') {
      setSelectedContinent(null);
      setCurrentLevel('continents');
      loadLevel('continents', {});
    } else if (currentLevel === 'continents') {
      setCurrentLevel('world');
      loadLevel('world', {});
    }
  };

  const jumpTo = (target: UiLevel) => {
    if (target === 'world') {
      setSelectedContinent(null);
      setSelectedCountry(null);
      setSelectedRegion(null);
      setSelectedCity(null);
      setCurrentLevel('world');
      loadLevel('world', {});
    } else if (target === 'continents') {
      setSelectedCountry(null);
      setSelectedRegion(null);
      setSelectedCity(null);
      setCurrentLevel('continents');
      loadLevel('continents', {});
    } else if (target === 'countries' && selectedContinent) {
      setSelectedRegion(null);
      setSelectedCity(null);
      setCurrentLevel('countries');
      loadLevel('countries', { continent: selectedContinent });
    } else if (target === 'regions' && selectedCountry) {
      setSelectedCity(null);
      setCurrentLevel('regions');
      loadLevel('regions', { continent: selectedContinent, country: selectedCountry });
    }
  };

  const isBusy = loading || parentLoading;

  // Starter locked state
  if (!interactive) {
    return (
      <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-stone-100 bg-stone-50/50 flex items-center gap-3">
          <div className="p-2 bg-stone-300 rounded-2xl text-white">
            <Globe2 size={22} />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-stone-900 tracking-tight">
              Visitor Origin Explorer
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Interactive map available on Growth and higher
            </p>
          </div>
        </div>
        <div className="p-10 text-center space-y-4">
          <p className="text-stone-600 text-sm max-w-md mx-auto">
            Unlock world → continent → country drill-down to see where your guests come from.
            Pro adds provinces and city insight panels.
          </p>
          <button
            type="button"
            onClick={() => {
              setModalTargetTier('growth');
              setModalFeatureName('Interactive Visitor Origin Explorer');
              setShowUpgradeModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-sm font-bold shadow-md"
          >
            <Zap size={14} className="fill-white" /> Upgrade to Growth
          </button>
        </div>
        <UpgradePromptModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentTier={limits.subscriptionTier}
          targetTier={modalTargetTier}
          featureName={modalFeatureName}
          onUpgrade={() => {
            setShowUpgradeModal(false);
            window.location.href = '/business/billing';
          }}
          onCompare={() => {
            setShowUpgradeModal(false);
            window.location.href = '/business/billing';
          }}
        />
      </div>
    );
  }

  const continentData = nodes.map((n) => ({
    name: n.name,
    count: n.count,
    percentage: n.percentage,
  }));

  const geoNodes = nodes.map((n) => ({
    name: n.name,
    count: n.count,
    percentage: n.percentage,
  }));

  const geoLevel =
    currentLevel === 'cityDetail'
      ? 'cities'
      : (currentLevel as 'world' | 'continents' | 'countries' | 'regions' | 'cities');

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden transition-all duration-300">
      <div className="px-6 py-5 border-b border-stone-100 bg-stone-50/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500 rounded-2xl text-white shadow-md shadow-orange-500/20">
            <Globe2 size={22} />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-stone-900 tracking-tight">
              Visitor Origin Explorer
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              {totalVisitors} guest check-ins · SA {domesticCount} · International{' '}
              {internationalCount}
            </p>
          </div>
        </div>
        {currentLevel !== 'world' && (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"
          >
            <ArrowLeft size={12} /> Back
          </button>
        )}
      </div>

      <div className="bg-stone-100/40 px-6 py-2 border-b border-stone-100 flex flex-wrap items-center gap-2 text-xs font-mono text-stone-400">
        <button
          type="button"
          className={currentLevel === 'world' ? 'text-orange-500 font-bold' : 'hover:text-stone-600'}
          onClick={() => jumpTo('world')}
        >
          World
        </button>
        {selectedContinent && (
          <>
            <span>></span>
            <button
              type="button"
              className={
                currentLevel === 'countries' ? 'text-orange-500 font-bold' : 'hover:text-stone-600'
              }
              onClick={() => jumpTo('countries')}
            >
              {selectedContinent}
            </button>
          </>
        )}
        {selectedCountry && (
          <>
            <span>></span>
            <button
              type="button"
              className={
                currentLevel === 'regions' ? 'text-orange-500 font-bold' : 'hover:text-stone-600'
              }
              onClick={() => jumpTo('regions')}
            >
              {selectedCountry}
            </button>
          </>
        )}
        {selectedRegion && (
          <>
            <span>></span>
            <span className={currentLevel === 'cities' ? 'text-orange-500 font-bold' : ''}>
              {selectedRegion}
            </span>
          </>
        )}
        {selectedCity && (
          <>
            <span>></span>
            <span className="text-orange-500 font-bold">{selectedCity}</span>
          </>
        )}
      </div>

      <div className="p-6">
        {fetchError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {fetchError}
          </div>
        )}

        {useGeoMap && currentLevel !== 'cityDetail' ? (
          <div className="space-y-4">
            <div className="h-[380px] md:h-[440px]">
              <GeographicMapViewport
                level={geoLevel}
                nodes={geoNodes}
                selectedContinent={selectedContinent}
                selectedCountry={selectedCountry}
                selectedRegion={selectedRegion}
                isLoading={isBusy}
                interactive={interactive}
                onContinentClick={handleContinentClick}
                onCountryClick={handleCountryClick}
                onRegionClick={handleRegionClick}
                onCityClick={handleCityClick}
                continentOfCountry={continentOfCountryName}
              />
            </div>

            {/* Side list for regions / cities when geo province coverage is limited */}
            {(currentLevel === 'regions' || currentLevel === 'cities') && nodes.length > 0 && (
              <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                  {currentLevel === 'regions' ? 'Provinces & states' : 'Cities'}
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                  {nodes.map((n) => (
                    <li key={n.name}>
                      <button
                        type="button"
                        onClick={() =>
                          currentLevel === 'regions'
                            ? handleRegionClick(n.name)
                            : handleCityClick(n.name)
                        }
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-stone-200 transition-all"
                      >
                        <span className="font-semibold">{n.name}</span>
                        <span className="text-stone-400 ml-2">
                          {n.count.toLocaleString()} · {n.percentage}%
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <>
            {currentLevel === 'world' && (
              <VisitorOriginWorldMap
                totalVisitors={totalVisitors}
                onExplore={handleWorldExplore}
                isLoading={isBusy}
              />
            )}

            {currentLevel === 'continents' && (
              <VisitorOriginContinentMap
                data={continentData}
                onContinentClick={handleContinentClick}
                onBack={handleBack}
                isLoading={isBusy}
              />
            )}

            {currentLevel === 'countries' && (
              <VisitorOriginCountryMap
                data={nodes.map((n) => ({
                  country: n.name,
                  continent: selectedContinent || n.continent || '',
                  count: n.count,
                  percentage: n.percentage,
                }))}
                continentName={selectedContinent || ''}
                onCountryClick={handleCountryClick}
                onBack={handleBack}
                isLoading={isBusy}
              />
            )}

            {currentLevel === 'regions' && (
              <VisitorOriginRegionMap
                data={nodes.map((n) => ({
                  region: n.name,
                  country: selectedCountry || '',
                  count: n.count,
                  percentage: n.percentage,
                }))}
                countryName={selectedCountry || ''}
                onRegionClick={handleRegionClick}
                onBack={handleBack}
                isLoading={isBusy}
              />
            )}

            {currentLevel === 'cities' && (
              <VisitorOriginCityGrid
                data={nodes.map((n) => ({
                  city: n.name,
                  region: selectedRegion || '',
                  count: n.count,
                  percentage: n.percentage,
                }))}
                regionName={selectedRegion || selectedCountry || ''}
                onBack={handleBack}
                isLoading={isBusy}
                onCityClick={handleCityClick}
              />
            )}
          </>
        )}

        {currentLevel === 'cityDetail' && selectedCity && (
          <CityInsightPanel
            cityName={selectedCity}
            regionName={selectedRegion}
            countryName={selectedCountry}
            data={cityPanel}
            isLoading={isBusy}
            onBack={handleBack}
          />
        )}
      </div>

      <div className="bg-stone-50 px-6 py-4 border-t border-stone-200/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Layers size={16} className="text-orange-500" />
          <span className="text-xs text-stone-600 font-medium">
            Plan: <strong className="capitalize text-stone-900">{limits.subscriptionTier}</strong>
            {limits.maxDrillLevel ? ` · max depth ${limits.maxDrillLevel}` : ''}
          </span>
        </div>
      </div>

      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={limits.subscriptionTier}
        targetTier={modalTargetTier}
        featureName={modalFeatureName}
        onUpgrade={() => {
          setShowUpgradeModal(false);
          window.location.href = '/business/billing';
        }}
        onCompare={() => {
          setShowUpgradeModal(false);
          window.location.href = '/business/billing';
        }}
      />
    </div>
  );
}

export default VisitorOriginExplorer;
