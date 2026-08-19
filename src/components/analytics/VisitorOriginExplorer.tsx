import { useState, useEffect, useCallback, useMemo } from 'react';
import { VisitorOriginContributionGrid } from './VisitorOriginContributionGrid';
import { UpgradePromptModal } from './UpgradePromptModal';
import { CityInsightPanel } from './CityInsightPanel';
import { GeographicMapViewport } from './geo/GeographicMapViewport';
import { SubscriptionTier, SubscriptionLimits } from '../../types';
import { Globe2, Layers, Zap } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { fetchVisitorOrigins, type OriginNode, type CityDashboard, type DrillLevel } from '../../services/analyticsApi';

export interface VisitorOriginExplorerProps { businessId: string; dateFrom?: string; dateTo?: string; limits: SubscriptionLimits; canInteractiveMap?: boolean; isLoading?: boolean; data?: any[]; onTierChange?: (tier: SubscriptionTier) => void; }
type UiLevel = 'world' | 'countries' | 'regions' | 'cities' | 'cityDetail';
type ParentSelection = { continent?: string | null; country?: string | null; region?: string | null; city?: string | null };
function toApiLevel(uiLevel: UiLevel): DrillLevel { if (uiLevel === 'world') return 'world'; if (uiLevel === 'countries') return 'country'; if (uiLevel === 'regions') return 'region'; return 'city'; }
const CONTINENTS = ['Africa', 'Europe', 'North America', 'South America', 'Asia', 'Oceania', 'Other'];
const COUNTRY_TO_CONTINENT: Record<string, string> = {
  'South Africa': 'Africa', Namibia: 'Africa', Botswana: 'Africa', Zimbabwe: 'Africa', Mozambique: 'Africa', Lesotho: 'Africa', Eswatini: 'Africa', Kenya: 'Africa', Nigeria: 'Africa', Egypt: 'Africa', Morocco: 'Africa', Tanzania: 'Africa', Ghana: 'Africa',
  'United Kingdom': 'Europe', Germany: 'Europe', France: 'Europe', Netherlands: 'Europe', Switzerland: 'Europe', Italy: 'Europe', Spain: 'Europe', Portugal: 'Europe', Austria: 'Europe', Belgium: 'Europe', Sweden: 'Europe', Norway: 'Europe', Denmark: 'Europe', Finland: 'Europe', Greece: 'Europe', Ireland: 'Europe', Poland: 'Europe', Russia: 'Europe', Turkey: 'Europe', Czechia: 'Europe', Hungary: 'Europe', Romania: 'Europe', Bulgaria: 'Europe', Croatia: 'Europe', Ukraine: 'Europe',
  'United States': 'North America', Canada: 'North America', Mexico: 'North America', Brazil: 'South America', Argentina: 'South America', Chile: 'South America', Colombia: 'South America', Peru: 'South America', Australia: 'Oceania', 'New Zealand': 'Oceania', Fiji: 'Oceania', China: 'Asia', India: 'Asia', Japan: 'Asia', 'South Korea': 'Asia', Singapore: 'Asia', Malaysia: 'Asia', Indonesia: 'Asia', Thailand: 'Asia', Vietnam: 'Asia', Philippines: 'Asia', 'United Arab Emirates': 'Asia', 'Saudi Arabia': 'Asia', Israel: 'Asia', Pakistan: 'Asia', Bangladesh: 'Asia',
};
function continentOfCountryName(country: string): string { if (!country) return 'Other'; return COUNTRY_TO_CONTINENT[country] || COUNTRY_TO_CONTINENT[country.trim()] || 'Other'; }
function aggregateContinents(nodes: OriginNode[]): OriginNode[] {
  const knownContinents = new Set(CONTINENTS.map(name => name.toLowerCase()));
  const alreadyAggregated = nodes.length > 0 && nodes.every(node => knownContinents.has(node.name.trim().toLowerCase()));
  if (alreadyAggregated) { const total = nodes.reduce((sum, node) => sum + (Number(node.count) || 0), 0); return nodes.map(node => ({ ...node, percentage: total ? ((Number(node.count) || 0) / total) * 100 : 0 })).sort((a, b) => b.count - a.count); }
  const buckets = new Map<string, number>();
  nodes.forEach(node => { const continent = continentOfCountryName(node.name); buckets.set(continent, (buckets.get(continent) || 0) + (Number(node.count) || 0)); });
  const total = Array.from(buckets.values()).reduce((sum, count) => sum + count, 0);
  return Array.from(buckets.entries()).map(([name, count]) => ({ name, count, percentage: total ? (count / total) * 100 : 0 })).filter(node => node.count > 0).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function VisitorOriginExplorer({ businessId, dateFrom, dateTo, limits, canInteractiveMap = true, isLoading: parentLoading = false }: VisitorOriginExplorerProps) {
  const { t } = useTranslation();
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
  const [qualityNote, setQualityNote] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [modalTargetTier, setModalTargetTier] = useState<SubscriptionTier>('growth');
  const [modalFeatureName, setModalFeatureName] = useState('');
  const interactive = canInteractiveMap && limits.subscriptionTier !== 'starter';

  const loadLevel = useCallback(async (uiLevel: UiLevel, parent: ParentSelection) => {
    if (!businessId) return;
    if (!interactive && uiLevel !== 'world') { setShowUpgradeModal(true); setModalTargetTier('growth'); setModalFeatureName(t('reports_visitor_origin_explorer')); return; }
    setLoading(true); setFetchError(null);
    try {
      const res = await fetchVisitorOrigins({ businessId, level: toApiLevel(uiLevel), dateFrom, dateTo, continent: parent.continent, country: parent.country, region: parent.region, city: parent.city });
      if (res.upgradeRequired) { setModalTargetTier((res.requiredPlan as SubscriptionTier) || 'growth'); setModalFeatureName(res.error || 'Upgrade required'); setShowUpgradeModal(true); return; }
      if (!res.success) { setFetchError(res.error || 'Failed to load origins'); setNodes([]); setQualityNote(null); return; }
      setNodes(res.nodes || []); setTotalVisitors(res.meta?.totalVisitors || 0); setDomesticCount(res.meta?.domesticCount || 0); setInternationalCount(res.meta?.internationalCount || 0); if (res.cityDashboard) setCityPanel(res.cityDashboard);
      const q = res.meta?.quality as { eligibleStays?: number; excludedByStatus?: number } | undefined;
      if (q && (q.excludedByStatus || 0) > 0 && (q.eligibleStays || 0) === 0) setQualityNote(t('reports_quality_no_eligible', { count: q.excludedByStatus })); else if (q && (q.excludedByStatus || 0) > 0) setQualityNote(t('reports_quality_partial_eligible', { eligible: q.eligibleStays ?? 0, excluded: q.excludedByStatus })); else setQualityNote(null);
      if (uiLevel === 'regions' && res.skipToCity && parent.country) { setCurrentLevel('cities'); setSelectedRegion(null); const cityRes = await fetchVisitorOrigins({ businessId, level: 'city', dateFrom, dateTo, continent: parent.continent, country: parent.country }); if (cityRes.success) setNodes(cityRes.nodes || []); }
    } catch (e: any) { setFetchError(e?.message || 'Failed to load origins'); }
    finally { setLoading(false); }
  }, [businessId, dateFrom, dateTo, interactive, t]);

  useEffect(() => { if (!businessId) return; if (!interactive) { setCurrentLevel('world'); return; } loadLevel('world', {}); }, [businessId, dateFrom, dateTo, interactive, loadLevel]);
  const handleContinentClick = (continent: string) => { if (!limits.canViewCountries) { setModalTargetTier('growth'); setModalFeatureName('Country-Level Distribution'); setShowUpgradeModal(true); return; } setSelectedContinent(continent); setSelectedCountry(null); setSelectedRegion(null); setSelectedCity(null); setCurrentLevel('countries'); loadLevel('countries', { continent }); };
  const handleCountryClick = (country: string) => { if (!limits.canViewRegions && !limits.canViewCities) { setModalTargetTier('pro'); setModalFeatureName('Province, Region & City Analytics'); setShowUpgradeModal(true); return; } setSelectedCountry(country); setSelectedRegion(null); setSelectedCity(null); if (limits.canViewRegions) { setCurrentLevel('regions'); loadLevel('regions', { continent: selectedContinent, country }); } else { setCurrentLevel('cities'); loadLevel('cities', { continent: selectedContinent, country }); } };
  const handleRegionClick = (region: string) => { if (!limits.canViewCities) { setModalTargetTier('pro'); setModalFeatureName('City Insights'); setShowUpgradeModal(true); return; } setSelectedRegion(region); setSelectedCity(null); setCurrentLevel('cities'); loadLevel('cities', { continent: selectedContinent, country: selectedCountry, region }); };
  const handleCityClick = (city: string) => { setSelectedCity(city); setCurrentLevel('cityDetail'); loadLevel('cityDetail', { continent: selectedContinent, country: selectedCountry, region: selectedRegion, city }); };
  const handleBack = () => {
    if (currentLevel === 'cityDetail') { setSelectedCity(null); setCurrentLevel('cities'); loadLevel('cities', { continent: selectedContinent, country: selectedCountry, region: selectedRegion }); return; }
    if (currentLevel === 'cities') { if (selectedRegion) { setSelectedRegion(null); setCurrentLevel('regions'); loadLevel('regions', { continent: selectedContinent, country: selectedCountry }); } else { setCurrentLevel('countries'); loadLevel('countries', { continent: selectedContinent }); } return; }
    if (currentLevel === 'regions') { setSelectedCountry(null); setSelectedRegion(null); setCurrentLevel('countries'); loadLevel('countries', { continent: selectedContinent }); return; }
    if (currentLevel === 'countries') { setSelectedContinent(null); setCurrentLevel('world'); loadLevel('world', {}); }
  };
  const handleHome = () => { setSelectedContinent(null); setSelectedCountry(null); setSelectedRegion(null); setSelectedCity(null); setCurrentLevel('world'); loadLevel('world', {}); };
  const jumpToContinent = () => { if (!selectedContinent) return; setSelectedCountry(null); setSelectedRegion(null); setSelectedCity(null); setCurrentLevel('countries'); loadLevel('countries', { continent: selectedContinent }); };
  const jumpToCountry = () => { if (!selectedCountry) return; setSelectedRegion(null); setSelectedCity(null); if (limits.canViewRegions) { setCurrentLevel('regions'); loadLevel('regions', { continent: selectedContinent, country: selectedCountry }); } else { setCurrentLevel('cities'); loadLevel('cities', { continent: selectedContinent, country: selectedCountry }); } };
  const jumpToRegion = () => { if (!selectedRegion) return; setSelectedCity(null); setCurrentLevel('cities'); loadLevel('cities', { continent: selectedContinent, country: selectedCountry, region: selectedRegion }); };

  const isBusy = loading || parentLoading;
  const continentNodes = useMemo(() => aggregateContinents(nodes), [nodes]);
  const displayNodes = currentLevel === 'world' ? continentNodes : nodes;
  const geoLevel = currentLevel === 'cityDetail' ? 'cities' : currentLevel;
  const gridLevel = currentLevel === 'world' ? 'continents' : currentLevel === 'countries' ? 'countries' : currentLevel === 'regions' ? 'regions' : 'cities';
  const gridTitle = currentLevel === 'world' ? 'Bookings by continent' : currentLevel === 'countries' ? `Bookings by country · ${selectedContinent || 'Continent'}` : currentLevel === 'regions' ? `Bookings by province / state / region · ${selectedCountry || ''}` : `Bookings by city · ${selectedRegion || selectedCountry || ''}`;
  const gridSubtitle = currentLevel === 'world' ? 'Select a continent to see its country distribution.' : currentLevel === 'countries' ? 'Select a country to see provinces, states, cantons or lands.' : currentLevel === 'regions' ? 'Select an administrative area to see its cities.' : 'Select a city to open detailed visitor insights.';
  const gridSelect = currentLevel === 'world' ? handleContinentClick : currentLevel === 'countries' ? handleCountryClick : currentLevel === 'regions' ? handleRegionClick : handleCityClick;
  const gridNodes = displayNodes.map(node => ({ name: node.name, count: node.count, percentage: node.percentage, code: node.code }));

  if (!interactive) {
    return <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden"><div className="px-6 py-5 border-b border-stone-100 bg-stone-50/50 flex items-center gap-3"><div className="p-2 bg-stone-300 rounded-2xl text-white"><Globe2 size={22} /></div><div><h3 className="text-lg font-extrabold text-stone-900 tracking-tight">{t('reports_visitor_origin_explorer')}</h3><p className="text-xs text-stone-400 mt-0.5">{t('reports_upgrade_map_growth')}</p></div></div><div className="p-10 text-center space-y-4"><p className="text-stone-600 text-sm max-w-md mx-auto">Unlock world → continent → country → province / state → city drill-down to see where your guests come from.</p><button type="button" onClick={() => { setModalTargetTier('growth'); setModalFeatureName(t('reports_visitor_origin_explorer')); setShowUpgradeModal(true); }} className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-sm font-bold shadow-md"><Zap size={14} className="fill-white" /> {t('reports_upgrade_to_growth')}</button></div><UpgradePromptModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} currentTier={limits.subscriptionTier} targetTier={modalTargetTier} featureName={modalFeatureName} onUpgrade={() => { setShowUpgradeModal(false); window.location.href = '/business/billing'; }} onCompare={() => { setShowUpgradeModal(false); window.location.href = '/business/billing'; }} /></div>;
  }

  return <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden transition-all duration-300">
    <div className="sticky top-0 z-40 px-6 py-5 border-b border-stone-100 bg-white/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="p-2 bg-orange-500 rounded-2xl text-white shadow-md shadow-orange-500/20"><Globe2 size={22} /></div><div><h3 className="text-lg font-extrabold text-stone-900 tracking-tight">{t('reports_visitor_origin_explorer')}</h3><p className="text-xs text-stone-400 mt-0.5">{t('reports_guest_checkins_summary', { count: totalVisitors, domestic: domesticCount, international: internationalCount })}</p></div></div></div>
    <div className="bg-stone-100/40 px-6 py-2.5 border-b border-stone-100 flex flex-wrap items-center gap-2 text-xs font-mono text-stone-400"><button type="button" className={currentLevel === 'world' ? 'text-orange-500 font-bold' : 'hover:text-stone-600'} onClick={handleHome}>World</button>{selectedContinent && <><span>›</span><button type="button" className={currentLevel === 'countries' ? 'text-orange-500 font-bold' : 'hover:text-stone-600'} onClick={jumpToContinent}>{selectedContinent}</button></>}{selectedCountry && <><span>›</span><button type="button" className={currentLevel === 'regions' ? 'text-orange-500 font-bold' : 'hover:text-stone-600'} onClick={jumpToCountry}>{selectedCountry}</button></>}{selectedRegion && <><span>›</span><button type="button" className={currentLevel === 'cities' ? 'text-orange-500 font-bold' : 'hover:text-stone-600'} onClick={jumpToRegion}>{selectedRegion}</button></>}{selectedCity && <><span>›</span><span className="text-orange-500 font-bold">{selectedCity}</span></>}<span className="ml-auto rounded-md bg-stone-900 px-2 py-1 text-[9px] font-bold tracking-wider text-orange-300 uppercase">{currentLevel === 'world' ? 'WORLD' : currentLevel === 'countries' ? 'COUNTRIES' : currentLevel === 'regions' ? 'PROVINCES / STATES' : currentLevel === 'cities' ? 'CITIES' : 'CITY INSIGHTS'}</span></div>
    <div className="p-6 space-y-6">{fetchError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{fetchError}</div>}{qualityNote && !fetchError && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{qualityNote}</div>}
      {currentLevel !== 'cityDetail' ? <div className="relative h-[500px] md:h-[560px]"><GeographicMapViewport level={geoLevel as 'world' | 'continents' | 'countries' | 'regions' | 'cities'} nodes={displayNodes.map(node => ({ name: node.name, count: node.count, percentage: node.percentage, code: node.code }))} selectedContinent={selectedContinent} selectedCountry={selectedCountry} selectedRegion={selectedRegion} isLoading={isBusy} interactive={interactive} onContinentClick={handleContinentClick} onCountryClick={handleCountryClick} onRegionClick={handleRegionClick} onCityClick={handleCityClick} onBack={handleBack} onHome={handleHome} continentOfCountry={continentOfCountryName} overlayInset={320} /><div className="absolute left-3 top-3 z-30 hidden w-[320px] md:block"><VisitorOriginContributionGrid level={gridLevel} nodes={gridNodes} title={gridTitle} subtitle={gridSubtitle} onSelect={gridSelect} overlay /></div></div> : selectedCity && <CityInsightPanel cityName={selectedCity} regionName={selectedRegion} countryName={selectedCountry} data={cityPanel} isLoading={isBusy} onBack={handleBack} />}
      {currentLevel !== 'cityDetail' && <div className="md:hidden"><VisitorOriginContributionGrid level={gridLevel} nodes={gridNodes} title={gridTitle} subtitle={gridSubtitle} onSelect={gridSelect} /></div>}
    </div>
    <div className="bg-stone-50 px-6 py-4 border-t border-stone-200/80 flex items-center justify-between gap-4"><div className="flex items-center gap-2.5"><Layers size={16} className="text-orange-500" /><span className="text-xs text-stone-600 font-medium">{t('reports_plan_label', { plan: String(limits.subscriptionTier) })}{limits.maxDrillLevel ? ` · ${t('reports_max_depth', { level: String(limits.maxDrillLevel) })}` : ''}</span></div></div>
    <UpgradePromptModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} currentTier={limits.subscriptionTier} targetTier={modalTargetTier} featureName={modalFeatureName} onUpgrade={() => { setShowUpgradeModal(false); window.location.href = '/business/billing'; }} onCompare={() => { setShowUpgradeModal(false); window.location.href = '/business/billing'; }} />
  </div>;
}

export default VisitorOriginExplorer;
