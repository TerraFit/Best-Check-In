// src/components/analytics/VisitorOriginMap.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie } from 'recharts';
import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';

interface VisitorOriginMapProps {
  data: any[];
  drillLevel: string;
  limits: any;
  onDrillDown: (item: any) => void;
  onDrillUp: () => void;
  canDrillDeeper: (level: string) => boolean;
  getUpgradeMessage: (feature: string) => string;
  isLoading: boolean;
}

const COLOR_SCALE = ['#fef3c7', '#fde68a', '#fcd34d', '#f59e0b', '#d97706'];
const NO_DATA_COLOR = '#e5e7eb';

// World map data URL
const WORLD_MAP_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Country name normalization
const COUNTRY_NAME_MAP: Record<string, string> = {
  'United States of America': 'United States',
  'United Kingdom': 'UK',
  'Russia': 'Russian Federation',
  'Czechia': 'Czech Republic',
  'South Korea': 'Korea',
  'Congo': 'Democratic Republic of the Congo',
  'Tanzania': 'United Republic of Tanzania'
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
  const [viewType, setViewType] = useState<'map' | 'bar' | 'pie'>('map');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: any } | null>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load GeoJSON data
  useEffect(() => {
    const loadGeoData = async () => {
      try {
        const response = await fetch(WORLD_MAP_URL);
        const topology = await response.json();
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

  // Calculate max count for color scaling
  const maxCount = useMemo(() => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map(d => d.count), 1);
  }, [data]);

  // Get color for a country
  const getCountryColor = (countryName: string): string => {
    if (!data || data.length === 0) return NO_DATA_COLOR;
    
    const normalizedName = COUNTRY_NAME_MAP[countryName] || countryName;
    const countryData = data.find(d => d.name === normalizedName || d.name === countryName);
    
    if (!countryData || countryData.count === 0) return NO_DATA_COLOR;
    
    const ratio = countryData.count / maxCount;
    if (ratio < 0.2) return COLOR_SCALE[0];
    if (ratio < 0.4) return COLOR_SCALE[1];
    if (ratio < 0.6) return COLOR_SCALE[2];
    if (ratio < 0.8) return COLOR_SCALE[3];
    return COLOR_SCALE[4];
  };

  // Get country data for tooltip
  const getCountryData = (countryName: string) => {
    const normalizedName = COUNTRY_NAME_MAP[countryName] || countryName;
    return data.find(d => d.name === normalizedName || d.name === countryName);
  };

  // Check if country has children (drillable)
  const hasChildren = (countryName: string): boolean => {
    const countryData = getCountryData(countryName);
    return !!(countryData?.children && countryData.children.length > 0);
  };

  // Handle mouse enter
  const handleMouseEnter = (e: React.MouseEvent, countryName: string) => {
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
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoveredId(null);
    setTooltip(null);
  };

  // Handle click
  const handleClick = (countryName: string) => {
    const countryData = getCountryData(countryName);
    if (!countryData) return;
    
    if (countryData.children && canDrillDeeper('continent')) {
      onDrillDown(countryData);
    } else if (countryData.children && !canDrillDeeper('continent')) {
      const upgradeMsg = getUpgradeMessage('countries');
      alert(upgradeMsg);
    }
  };

  // Get country style
  const getCountryStyle = (countryName: string) => {
    const isHovered = hoveredId === countryName;
    const hasData = data.some(d => d.name === countryName || d.name === COUNTRY_NAME_MAP[countryName]);
    
    return {
      fill: getCountryColor(countryName),
      stroke: isHovered ? '#f59e0b' : '#ffffff',
      strokeWidth: isHovered ? 2 : 0.5,
      opacity: isHovered ? 1 : (hasData ? 0.9 : 0.6),
      cursor: hasChildren(countryName) ? 'pointer' : 'default',
      transition: 'all 0.15s ease'
    };
  };

  // Chart click handler
  const handleChartClick = (item: any) => {
    if (item.children && canDrillDeeper('continent')) {
      onDrillDown(item);
    } else if (item.children && !canDrillDeeper('continent')) {
      const upgradeMsg = getUpgradeMessage('countries');
      alert(upgradeMsg);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{item.name}</p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{item.count.toLocaleString()}</span> visitors
          </p>
          <p className="text-sm text-orange-600 font-medium">
            {item.percentage.toFixed(1)}%
          </p>
          {item.children && canDrillDeeper('continent') && (
            <p className="text-xs text-stone-400 mt-1">Click to explore</p>
          )}
          {item.children && !canDrillDeeper('continent') && (
            <p className="text-xs text-amber-500 mt-1">🔒 Upgrade to explore</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Color scale legend items
  const colorScaleLegend = [
    { color: '#fef3c7', label: 'Low (0-20%)' },
    { color: '#fde68a', label: 'Low-Mid (20-40%)' },
    { color: '#fcd34d', label: 'Medium (40-60%)' },
    { color: '#f59e0b', label: 'High (60-80%)' },
    { color: '#d97706', label: 'Very High (80-100%)' }
  ];

  // Prepare data with color for charts
  const enhancedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      color: getCountryColor(item.name)
    }));
  }, [data, maxCount]);

  // Loading state
  if (isLoading || loadingGeo) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-stone-400">{loadingGeo ? 'Loading map data...' : 'Loading visitor data...'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
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
              <g transform="scale(0.85) translate(70, 30)">
                {geoData?.features?.map((feature: any, index: number) => {
                  const countryName = feature.properties?.name;
                  if (!countryName) return null;
                  
                  const style = getCountryStyle(countryName);
                  
                  // Generate path for this country
                  // In production, you'd use geoPath() to generate the actual path
                  // This is a placeholder - the actual path would be generated from the GeoJSON
                  const path = geoPath()
                    .projection(geoMercator().fitSize([800, 450], feature))
                    (feature);
                  
                  return (
                    <path
                      key={index}
                      d={path || `M ${10 + Math.random() * 780} ${10 + Math.random() * 430}`}
                      fill={style.fill}
                      stroke={style.stroke}
                      strokeWidth={style.strokeWidth}
                      opacity={style.opacity}
                      style={{ 
                        cursor: style.cursor,
                        transition: style.transition
                      }}
                      onMouseEnter={(e) => handleMouseEnter(e, countryName)}
                      onMouseLeave={handleMouseLeave}
                      onClick={() => handleClick(countryName)}
                    />
                  );
                })}
              </g>
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
                  {tooltip.data.count.toLocaleString()} visitors
                  <span className="ml-2 text-orange-500">
                    ({tooltip.data.percentage.toFixed(1)}%)
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
                  formatter: (value: number) => value.toLocaleString(),
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
