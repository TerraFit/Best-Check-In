// src/components/analytics/VisitorOriginMap.tsx
import { useState, useEffect, useCallback } from 'react';
import { VisitorOriginContinentMap } from './VisitorOriginContinentMap';
import { VisitorOriginCountryMap } from './VisitorOriginCountryMap';
import { UpgradePromptModal } from './UpgradePromptModal';

interface VisitorOriginMapProps {
  data: any[];
  drillLevel: string;
  limits: {
    canViewCountries: boolean;
    maxDrillLevel: string;
    [key: string]: any;
  };
  onDrillDown: (item: any) => void;
  onDrillUp: () => void;
  canDrillDeeper: (level: string) => boolean;
  getUpgradeMessage: (feature: string) => string;
  isLoading: boolean;
}

export function VisitorOriginMap({
  data,
  drillLevel,
  limits,
  onDrillDown,
  onDrillUp,
  canDrillDeeper,
  getUpgradeMessage,
  isLoading
}: VisitorOriginMapProps) {
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [modalTarget, setModalTarget] = useState<string>('growth');
  const [modalFeature, setModalFeature] = useState<string>('continents');
  const [geoData, setGeoData] = useState<any>(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  const [view, setView] = useState<'continents' | 'countries'>('continents');

  // Load GeoJSON data
  useEffect(() => {
    const loadGeoData = async () => {
      try {
        const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
        const topology = await response.json();
        const { feature } = await import('topojson-client');
        const geoJson = feature(topology, topology.objects.countries);
        setGeoData(geoJson);
      } catch (error) {
        console.error('Error loading map data:', error);
      } finally {
        setLoadingGeo(false);
      }
    };
    loadGeoData();
  }, []);

  // Aggregate continent data from country data
  const continentData = useCallback(() => {
    const continentMap: Record<string, { count: number; name: string }> = {};
    
    data.forEach(item => {
      const continent = item.continent || 'Other';
      if (!continentMap[continent]) {
        continentMap[continent] = { count: 0, name: continent };
      }
      continentMap[continent].count += item.count || 0;
    });

    const total = Object.values(continentMap).reduce((sum, c) => sum + c.count, 0) || 1;
    
    return Object.values(continentMap).map(c => ({
      name: c.name,
      count: c.count,
      percentage: (c.count / total) * 100,
      color: '#f59e0b'
    })).sort((a, b) => b.count - a.count);
  }, [data]);

  const handleContinentClick = (continentName: string) => {
    // Check if user can drill down to countries
    if (limits.canViewCountries && canDrillDeeper('continent')) {
      setSelectedContinent(continentName);
      setView('countries');
      // Find the continent data and drill down
      const continentItem = data.find(d => d.name === continentName);
      if (continentItem) {
        onDrillDown(continentItem);
      }
    } else {
      // Show upgrade modal
      setModalTarget('growth');
      setModalFeature('countries within continents');
      setShowUpgradeModal(true);
    }
  };

  const handleCountryClick = (countryName: string) => {
    // Check if user can drill down to regions
    if (canDrillDeeper('country')) {
      const countryItem = data.find(d => d.name === countryName);
      if (countryItem) {
        onDrillDown(countryItem);
      }
    } else {
      setModalTarget('pro');
      setModalFeature('states, provinces, and regions');
      setShowUpgradeModal(true);
    }
  };

  const handleBack = () => {
    setView('continents');
    setSelectedContinent(null);
    onDrillUp();
  };

  const handleUpgrade = () => {
    window.location.href = '/business/billing';
  };

  const handleCompare = () => {
    window.location.href = '/business/billing?tab=compare';
  };

  if (isLoading || loadingGeo) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
        <div className="h-[450px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-stone-400">Loading map data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Determine current tier from limits
  const currentTier = (() => {
    if (limits.maxDrillLevel === 'world') return 'starter';
    if (limits.maxDrillLevel === 'continent') return 'growth';
    if (limits.maxDrillLevel === 'country') return 'pro';
    return 'business';
  })();

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-stone-900 flex items-center gap-2">
            <span className="text-2xl">🌍</span>
            Visitor Origin Explorer
          </h3>
          <p className="text-xs text-stone-400">
            {view === 'continents' && '🌍 Hover for details • Click continents to explore'}
            {view === 'countries' && `🌍 ${selectedContinent} — Click countries to explore further`}
          </p>
        </div>

        {/* Tier indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">Plan:</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
            currentTier === 'starter' ? 'bg-green-100 text-green-700' :
            currentTier === 'growth' ? 'bg-blue-100 text-blue-700' :
            currentTier === 'pro' ? 'bg-purple-100 text-purple-700' :
            'bg-amber-100 text-amber-700'
          }`}>
            {currentTier}
          </span>
        </div>
      </div>

      {/* Map Content */}
      <div className="p-6">
        {view === 'continents' ? (
          <VisitorOriginContinentMap
            data={continentData()}
            onContinentClick={handleContinentClick}
            onContinentHover={() => {}}
            isLoading={isLoading}
          />
        ) : (
          <VisitorOriginCountryMap
            data={data.filter(d => d.continent === selectedContinent)}
            continentName={selectedContinent || ''}
            onCountryClick={handleCountryClick}
            onCountryHover={() => {}}
            onBack={handleBack}
            isLoading={isLoading}
            geoData={geoData}
          />
        )}
      </div>

      {/* Upgrade Modal */}
      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={currentTier}
        targetTier={modalTarget}
        featureName={modalFeature}
        onUpgrade={handleUpgrade}
        onCompare={handleCompare}
      />
    </div>
  );
}
