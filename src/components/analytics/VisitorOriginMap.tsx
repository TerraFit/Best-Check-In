// src/components/analytics/VisitorOriginMap.tsx
import { useState, useMemo, useRef, useEffect } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps';
import { scaleQuantize } from 'd3-scale';
import { OriginData, DrillLevel, SubscriptionLimits } from '../../types/analytics';

// World map topology - using a reliable CDN source
const WORLD_MAP_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface VisitorOriginMapProps {
  data: OriginData[];
  drillLevel: DrillLevel;
  limits: SubscriptionLimits;
  onDrillDown: (item: OriginData) => void;
  onDrillUp: () => void;
  canDrillDeeper: (level: DrillLevel) => boolean;
  getUpgradeMessage: (feature: string) => string;
  isLoading: boolean;
}

// Country name mapping for display
const COUNTRY_NAME_MAP: Record<string, string> = {
  'United States of America': 'United States',
  'United Kingdom': 'UK',
  'Czechia': 'Czech Republic',
  'Russia': 'Russian Federation',
  'South Korea': 'Korea'
};

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
  const [tooltipContent, setTooltipContent] = useState<{
    name: string;
    count: number;
    percentage: number;
    x: number;
    y: number;
  } | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OriginData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate max count for color scaling
  const maxCount = useMemo(() => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map(d => d.count), 1);
  }, [data]);

  // Create color scale based on visitor density
  const colorScale = useMemo(() => {
    return scaleQuantize<string>()
      .domain([0, maxCount])
      .range([
        '#fef3c7', // 0-25%
        '#fde68a', // 25-50%
        '#fcd34d', // 50-75%
        '#f59e0b', // 75-100%
        '#d97706'  // 100%+
      ]);
  }, [maxCount]);

  // Get country name for tooltip
  const getDisplayName = (geoName: string): string => {
    return COUNTRY_NAME_MAP[geoName] || geoName;
  };

  // Find data for a specific country
  const getCountryData = (countryName: string): OriginData | undefined => {
    // Handle special cases
    const normalizedName = COUNTRY_NAME_MAP[countryName] || countryName;
    return data.find(d => d.name === normalizedName || d.name === countryName);
  };

  // Handle geography click
  const handleGeographyClick = (geo: any) => {
    const countryName = geo.properties.name;
    const countryData = getCountryData(countryName);
    
    if (countryData) {
      if (drillLevel === 'world' && canDrillDeeper('continent')) {
        onDrillDown(countryData);
      } else if (drillLevel === 'world' && !canDrillDeeper('continent')) {
        // Show upgrade prompt
        setSelectedItem(countryData);
        setShowUpgradeModal(true);
      }
    }
  };

  // Handle hover enter
  const handleHoverEnter = (geo: any) => {
    const countryName = geo.properties.name;
    const countryData = getCountryData(countryName);
    setHoveredRegion(countryName);
    
    if (countryData) {
      setTooltipContent({
        name: countryName,
        count: countryData.count,
        percentage: countryData.percentage,
        x: 0,
        y: 0
      });
    }
  };

  const handleHoverLeave = () => {
    setHoveredRegion(null);
    setTooltipContent(null);
  };

  // Get color for a geography
  const getGeographyColor = (geo: any): string => {
    const countryName = geo.properties.name;
    const countryData = getCountryData(countryName);
    
    if (!countryData) return '#e5e7eb'; // Gray for no data
    return colorScale(countryData.count);
  };

  // Get opacity for hover effect
  const getGeographyOpacity = (geo: any): number => {
    const countryName = geo.properties.name;
    if (hoveredRegion && hoveredRegion !== countryName) {
      return 0.4;
    }
    return 1;
  };

  if (isLoading || !data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-stone-400">Loading visitor data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
        {/* Map Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-stone-900 flex items-center gap-2">
              <span className="text-2xl">🌍</span>
              Visitor Origin Explorer
            </h3>
            <p className="text-xs text-stone-400">
              {drillLevel === 'world' && 'Global view - Hover for details, click to drill down'}
              {drillLevel === 'continent' && 'Continent view'}
              {drillLevel === 'country' && 'Country view'}
              {drillLevel === 'region' && 'Region view'}
              {drillLevel === 'city' && 'City view'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Drill Up Button */}
            {drillLevel !== 'world' && (
              <button
                onClick={onDrillUp}
                className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-sm text-stone-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
            )}
            
            {/* Legend */}
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span>Low</span>
              <div className="flex gap-0.5">
                <div className="w-4 h-3 rounded bg-amber-50"></div>
                <div className="w-4 h-3 rounded bg-amber-200"></div>
                <div className="w-4 h-3 rounded bg-amber-400"></div>
                <div className="w-4 h-3 rounded bg-amber-500"></div>
                <div className="w-4 h-3 rounded bg-amber-700"></div>
              </div>
              <span>High</span>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div ref={containerRef} className="relative w-full h-[500px] bg-gradient-to-br from-slate-50 to-stone-50">
          {data.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-stone-400">
              No visitor data available
            </div>
          ) : (
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{
                scale: 150,
                center: [10, 20]
              }}
              className="w-full h-full"
            >
              <ZoomableGroup
                center={[0, 0]}
                zoom={1}
                minZoom={0.8}
                maxZoom={4}
              >
                <Geographies geography={WORLD_MAP_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const countryName = geo.properties.name;
                      const countryData = getCountryData(countryName);
                      
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={getGeographyColor(geo)}
                          stroke="#ffffff"
                          strokeWidth={0.5}
                          style={{
                            default: {
                              outline: 'none',
                              transition: 'all 0.15s ease',
                              cursor: countryData ? 'pointer' : 'default'
                            },
                            hover: {
                              outline: 'none',
                              fill: countryData ? '#f59e0b' : undefined,
                              transition: 'all 0.15s ease'
                            },
                            pressed: {
                              outline: 'none'
                            }
                          }}
                          onMouseEnter={() => handleHoverEnter(geo)}
                          onMouseLeave={handleHoverLeave}
                          onClick={() => handleGeographyClick(geo)}
                          opacity={getGeographyOpacity(geo)}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          )}

          {/* Tooltip */}
          {tooltipContent && (
            <div
              className="absolute pointer-events-none z-20 bg-stone-900 text-white px-4 py-2.5 rounded-xl shadow-2xl max-w-xs transform -translate-x-1/2 -translate-y-full"
              style={{
                top: '20%',
                left: '50%'
              }}
            >
              <p className="font-semibold text-sm">{tooltipContent.name}</p>
              <p className="text-xs text-stone-300">
                {tooltipContent.count.toLocaleString()} visitors
                <span className="ml-2 text-amber-400">
                  ({tooltipContent.percentage.toFixed(1)}%)
                </span>
              </p>
              {canDrillDeeper('continent') && (
                <p className="text-[10px] text-stone-400 mt-1">Click to explore</p>
              )}
            </div>
          )}

          {/* Top Contributors Overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap justify-center gap-2">
            {data.slice(0, 5).map((item, index) => (
              <div
                key={item.name}
                className={`px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border transition-all cursor-pointer ${
                  hoveredRegion === item.name
                    ? 'bg-orange-500 text-white border-orange-600 scale-105'
                    : 'bg-white text-stone-700 border-stone-200 hover:shadow-md'
                }`}
                onMouseEnter={() => setHoveredRegion(item.name)}
                onMouseLeave={() => setHoveredRegion(null)}
              >
                <span className="font-semibold">{item.name}</span>
                <span className="ml-1.5 text-stone-400">
                  {item.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Footer */}
        <div className="px-6 py-3 border-t border-stone-100 bg-stone-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-6 text-sm">
            <span className="text-stone-500">
              Total: <span className="font-semibold text-stone-900">
                {data.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
              </span> visitors
            </span>
            <span className="text-stone-500">
              Regions: <span className="font-semibold text-stone-900">{data.length}</span>
            </span>
            <span className="text-stone-500">
              Top: <span className="font-semibold text-stone-900">{data[0]?.name || 'N/A'}</span>
            </span>
          </div>
          
          <div className="text-xs text-stone-400">
            {drillLevel === 'world' && '🌎 Click any country to explore'}
            {drillLevel === 'continent' && '🌍 Click any country on the map'}
            {drillLevel === 'country' && '📌 Country-level view'}
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              
              <h4 className="text-xl font-semibold text-stone-900 mb-2">
                Unlock {selectedItem.name} Insights
              </h4>
              
              <p className="text-stone-500 text-sm mb-6">
                {getUpgradeMessage('countries')}
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => window.location.href = '/business/billing'}
                  className="w-full px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                >
                  Upgrade to Growth
                </button>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
                >
                  Continue with Starter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
