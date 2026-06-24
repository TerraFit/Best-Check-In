// src/components/analytics/VisitorOriginMap.tsx
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';

// ============================================================
// TYPES
// ============================================================

interface VisitorOriginMapProps {
  data: Array<{
    name: string;
    count: number;
    percentage: number;
    children?: any[];
    [key: string]: any;
  }>;
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

interface CountryFeature {
  type: string;
  properties: {
    name: string;
    iso_n3?: string;
    iso_a2?: string;
    [key: string]: any;
  };
  geometry: any;
}

// ============================================================
// CONSTANTS
// ============================================================

const COLOR_SCALE = ['#fef3c7', '#fde68a', '#fcd34d', '#f59e0b', '#d97706'];
const NO_DATA_COLOR = '#e5e7eb';

const COUNTRY_NAME_MAP: Record<string, string> = {
  'United States of America': 'United States',
  'United States': 'United States of America',
  'UK': 'United Kingdom',
  'U.K.': 'United Kingdom',
  'Russia': 'Russia',
  'Czechia': 'Czech Republic',
  'South Korea': 'South Korea',
  'Congo': 'Democratic Republic of the Congo',
  'Tanzania': 'United Republic of Tanzania',
  'Swaziland': 'Eswatini',
  'Burma': 'Myanmar',
  'Cabo Verde': 'Cape Verde',
};

// ============================================================
// MAIN COMPONENT
// ============================================================

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
  // ============================================================
  // ALL HOOKS AT TOP LEVEL (NO CONDITIONAL HOOKS)
  // ============================================================

  const [viewType, setViewType] = useState<'map' | 'bar' | 'pie'>('map');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: any } | null>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // CDN GEOJSON LOADER
  // ============================================================

  const loadGeoJsonFromCDN = useCallback(async () => {
    setLoadingGeo(true);
    setLoadError(null);

    const sources = [
      'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
      'https://unpkg.com/world-atlas@2/countries-110m.json',
      'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson'
    ];

    for (const source of sources) {
      try {
        console.log(`🌍 Attempting to load map from: ${source}`);
        const response = await fetch(source);
        
        if (!response.ok) {
          console.warn(`Source ${source} returned ${response.status}`);
          continue;
        }

        const rawData = await response.json();
        
        let features: any[] = [];
        
        if (rawData.type === 'Topology') {
          const geoJson = feature(rawData, rawData.objects.countries);
          features = geoJson.features || [];
          console.log(`✅ Loaded ${features.length} countries from TopoJSON`);
        } else if (rawData.type === 'FeatureCollection') {
          features = rawData.features || [];
          console.log(`✅ Loaded ${features.length} countries from GeoJSON`);
        } else if (Array.isArray(rawData)) {
          features = rawData;
          console.log(`✅ Loaded ${features.length} countries from array`);
        } else {
          throw new Error('Unrecognized data format');
        }

        if (features.length === 0) {
          throw new Error('No features found in data');
        }

        setGeoData({ type: 'FeatureCollection', features });
        setLoadingGeo(false);
        return;
      } catch (err) {
        console.warn(`Failed to load from ${source}:`, err);
      }
    }

    setLoadError('Could not load map data from any source. Please check your internet connection.');
    setLoadingGeo(false);
  }, []);

  useEffect(() => {
    loadGeoJsonFromCDN();
  }, [loadGeoJsonFromCDN]);

  // ============================================================
  // COMPUTED VALUES (useMemo hooks - always called)
  // ============================================================

  const maxCount = useMemo(() => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map(d => d.count || 0), 1);
  }, [data]);

  const getCountryColor = useCallback((countryName: string): string => {
    if (!data || data.length === 0) return NO_DATA_COLOR;
    
    const normalizedName = COUNTRY_NAME_MAP[countryName] || countryName;
    const countryData = data.find(d => 
      d.name === normalizedName || 
      d.name === countryName ||
      COUNTRY_NAME_MAP[d.name] === countryName
    );
    
    if (!countryData || countryData.count === 0) return NO_DATA_COLOR;
    
    const ratio = countryData.count / maxCount;
    if (ratio < 0.2) return COLOR_SCALE[0];
    if (ratio < 0.4) return COLOR_SCALE[1];
    if (ratio < 0.6) return COLOR_SCALE[2];
    if (ratio < 0.8) return COLOR_SCALE[3];
    return COLOR_SCALE[4];
  }, [data, maxCount]);

  const getCountryData = useCallback((countryName: string) => {
    const normalizedName = COUNTRY_NAME_MAP[countryName] || countryName;
    return data.find(d => 
      d.name === normalizedName || 
      d.name === countryName ||
      COUNTRY_NAME_MAP[d.name] === countryName
    );
  }, [data]);

  const hasChildren = useCallback((countryName: string): boolean => {
    const countryData = getCountryData(countryName);
    return !!(countryData?.children && countryData.children.length > 0);
  }, [getCountryData]);

  // Map projection - always computed
  const projection = useMemo(() => {
    return geoMercator()
      .fitSize([800, 450], { type: 'Sphere' })
      .translate([400, 225])
      .center([0, 0])
      .scale(100);
  }, []);

  const pathGenerator = useMemo(() => {
    return geoPath().projection(projection);
  }, [projection]);

  // Enhanced data for charts
  const enhancedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      color: getCountryColor(item.name)
    }));
  }, [data, getCountryColor]);

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  const handleMouseEnter = useCallback((e: React.MouseEvent, countryName: string) => {
    setHoveredId(countryName);
    const countryData = getCountryData(countryName);
    if (countryData) {
      const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
      setTooltip({
        x: e.clientX + 15,
        y: e.clientY - 10,
        data: countryData
      });
    }
  }, [getCountryData]);

  const handleMouseLeave = useCallback(() => {
    setHoveredId(null);
    setTooltip(null);
  }, []);

  const handleCountryClick = useCallback((countryName: string) => {
    const countryData = getCountryData(countryName);
    if (!countryData) return;
    
    if (countryData.children && canDrillDeeper('continent')) {
      onDrillDown(countryData);
    } else if (countryData.children && !canDrillDeeper('continent')) {
      const upgradeMsg = getUpgradeMessage('countries');
      alert(upgradeMsg);
    }
  }, [getCountryData, canDrillDeeper, onDrillDown, getUpgradeMessage]);

  const handleChartClick = useCallback((item: any) => {
    if (item.children && canDrillDeeper('continent')) {
      onDrillDown(item);
    } else if (item.children && !canDrillDeeper('continent')) {
      const upgradeMsg = getUpgradeMessage('countries');
      alert(upgradeMsg);
    }
  }, [canDrillDeeper, onDrillDown, getUpgradeMessage]);

  const getCountryStyle = useCallback((countryName: string) => {
    const isHovered = hoveredId === countryName;
    const hasData = data.some(d => 
      d.name === countryName || 
      d.name === COUNTRY_NAME_MAP[countryName]
    );
    
    return {
      fill: getCountryColor(countryName),
      stroke: isHovered ? '#f59e0b' : '#ffffff',
      strokeWidth: isHovered ? 2 : 0.5,
      opacity: isHovered ? 1 : (hasData ? 0.9 : 0.6),
      cursor: hasChildren(countryName) ? 'pointer' : 'default',
      transition: 'all 0.15s ease'
    };
  }, [hoveredId, data, getCountryColor, hasChildren]);

  const CustomTooltip = useCallback(({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-sm pointer-events-none">
          <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{item.count?.toLocaleString() || 0}</span> visitors
          </p>
          <p className="text-sm text-orange-600 font-medium">
            {(item.percentage || 0).toFixed(1)}%
          </p>
          {item.children && canDrillDeeper('continent') && (
            <p className="text-xs text-stone-400 mt-1 border-t border-stone-100 pt-1">👆 Click to explore</p>
          )}
          {item.children && !canDrillDeeper('continent') && (
            <p className="text-xs text-amber-500 mt-1">🔒 Upgrade to explore</p>
          )}
        </div>
      );
    }
    return null;
  }, [canDrillDeeper]);

  // ============================================================
  // EARLY RETURNS AFTER ALL HOOKS
  // ============================================================

  // Loading state
  if (isLoading || loadingGeo) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-stone-400">
              {loadingGeo ? 'Loading world map data...' : 'Loading visitor data...'}
            </p>
            <p className="text-stone-300 text-xs mt-2">
              {loadingGeo ? 'Fetching from CDN...' : 'Processing analytics...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
        <div className="h-96 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">🌍</div>
            <h3 className="text-lg font-semibold text-stone-900 mb-2">Unable to Load Map</h3>
            <p className="text-stone-500 text-sm mb-4">{loadError}</p>
            <button
              onClick={loadGeoJsonFromCDN}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Retry Loading Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty data state
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <div className="text-5xl mb-4">🌍</div>
            <h3 className="text-lg font-semibold text-stone-900 mb-2">No visitor origin data available yet</h3>
            <p className="text-stone-400 text-sm">
              As guests check in, this map will highlight where they come from around the world.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No features state
  if (!geoData || !geoData.features || geoData.features.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
        <div className="h-96 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">🗺️</div>
            <h3 className="text-lg font-semibold text-stone-900 mb-2">Map Data Unavailable</h3>
            <p className="text-stone-500 text-sm mb-4">Could not load country boundaries.</p>
            <button
              onClick={loadGeoJsonFromCDN}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Retry Loading Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================

  const colorScaleLegend = [
    { color: '#fef3c7', label: 'Low (0-20%)' },
    { color: '#fde68a', label: 'Low-Mid (20-40%)' },
    { color: '#fcd34d', label: 'Medium (40-60%)' },
    { color: '#f59e0b', label: 'High (60-80%)' },
    { color: '#d97706', label: 'Very High (80-100%)' }
  ];

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
            {drillLevel === 'world' && 'Global view - Hover for details, click to explore'}
            {drillLevel === 'continent' && 'Continent view'}
            {drillLevel === 'country' && 'Country view'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Type Toggle */}
          <div className="flex bg-stone-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewType('map')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                viewType === 'map' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              🗺️ Map
            </button>
            <button
              onClick={() => setViewType('bar')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                viewType === 'bar' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              📊 Bar
            </button>
            <button
              onClick={() => setViewType('pie')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                viewType === 'pie' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              🍩 Pie
            </button>
          </div>

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
        </div>
      </div>

      {/* Map / Chart */}
      <div ref={containerRef} className="p-6">
        {viewType === 'map' ? (
          <div className="relative w-full h-[450px] bg-slate-50 rounded-xl overflow-hidden">
            <svg
              ref={svgRef}
              viewBox="0 0 800 450"
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full"
            >
              {geoData.features.map((feature: CountryFeature, index: number) => {
                const countryName = feature.properties?.name || 
                                   feature.properties?.ADMIN || 
                                   feature.properties?.COUNTRY;
                
                if (!countryName) return null;
                
                const style = getCountryStyle(countryName);
                
                let path = '';
                try {
                  path = pathGenerator(feature) || '';
                } catch (e) {
                  console.warn(`Could not generate path for ${countryName}:`, e);
                  return null;
                }
                
                if (!path) return null;
                
                return (
                  <path
                    key={index}
                    d={path}
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth={style.strokeWidth}
                    opacity={style.opacity}
                    style={{ 
                      cursor: style.cursor,
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => handleMouseEnter(e, countryName)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleCountryClick(countryName)}
                  />
                );
              })}
            </svg>

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-white/90 px-3 py-1.5 rounded-lg shadow-sm border border-stone-200">
              <span className="text-[10px] text-stone-500">Low</span>
              <div className="flex gap-0.5">
                {colorScaleLegend.map((item, index) => (
                  <div key={index} className="w-5 h-2 rounded" style={{ backgroundColor: item.color }} />
                ))}
              </div>
              <span className="text-[10px] text-stone-500">High</span>
              <span className="text-[10px] text-stone-300 mx-1">|</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-2 rounded" style={{ backgroundColor: NO_DATA_COLOR }} />
                <span className="text-[10px] text-stone-400">No Data</span>
              </div>
            </div>

            {/* Country Count */}
            <div className="absolute bottom-4 right-4 bg-white/90 px-3 py-1.5 rounded-lg shadow-sm border border-stone-200 text-xs text-stone-500">
              {data.length} countries with data
            </div>

            {/* Tooltip */}
            {tooltip && (
              <div
                className="fixed bg-white p-3 rounded-xl shadow-lg border border-stone-200 max-w-[220px] pointer-events-none z-50"
                style={{
                  left: tooltip.x,
                  top: tooltip.y,
                  transform: 'translateY(-8px)'
                }}
              >
                <p className="font-semibold text-stone-900 text-sm">{tooltip.data.name}</p>
                <p className="text-sm text-stone-600">
                  {tooltip.data.count?.toLocaleString() || 0} visitors
                  <span className="ml-2 text-orange-500">
                    ({tooltip.data.percentage?.toFixed(1) || 0}%)
                  </span>
                </p>
                {tooltip.data.children && tooltip.data.children.length > 0 && (
                  <p className="text-[10px] text-stone-400 mt-1 border-t border-stone-100 pt-1">👆 Click to explore</p>
                )}
              </div>
            )}
          </div>
        ) : viewType === 'bar' ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={enhancedData}
              layout="vertical"
              margin={{ left: 120, right: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={120} 
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="count" 
                radius={[0, 8, 8, 0]}
                onClick={handleChartClick}
                cursor="pointer"
                label={{ 
                  position: 'right', 
                  formatter: (value: number) => value?.toLocaleString() || 0,
                  fontSize: 11
                }}
              >
                {enhancedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    onMouseEnter={() => setHoveredId(entry.name)}
                    onMouseLeave={() => setHoveredId(null)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={enhancedData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={140}
                paddingAngle={2}
                dataKey="count"
                label={({ name, percent }) => percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
                labelLine={false}
                onClick={handleChartClick}
                cursor="pointer"
              >
                {enhancedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    onMouseEnter={() => setHoveredId(entry.name)}
                    onMouseLeave={() => setHoveredId(null)}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}

        {/* Color Scale Legend */}
        <div className="mt-4 pt-3 border-t border-stone-100">
          <p className="text-xs text-stone-500 mb-2">Visitor Density Scale:</p>
          <div className="flex flex-wrap items-center gap-2">
            {colorScaleLegend.map((item, index) => (
              <div key={index} className="flex items-center gap-1">
                <div 
                  className="w-5 h-4 rounded-sm border border-stone-200" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] text-stone-500">{item.label}</span>
                {index < colorScaleLegend.length - 1 && (
                  <span className="text-stone-300 text-xs">→</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stats Footer */}
        <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-6 text-sm">
            <span className="text-stone-500">
              Total: <span className="font-semibold text-stone-900">
                {data.reduce((sum, d) => sum + (d.count || 0), 0).toLocaleString()}
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
            {viewType === 'map' && '🌍 Hover for details • Click to explore'}
            {viewType === 'bar' && '📊 Click a bar to explore'}
            {viewType === 'pie' && '🍩 Click a slice to explore'}
          </div>
        </div>

        {/* Subscription Upgrade Notice */}
        {drillLevel === 'world' && !limits.canViewCountries && data.some(d => d.children) && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Upgrade to Growth to explore continent-level data</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
