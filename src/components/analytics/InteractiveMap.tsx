// src/components/analytics/InteractiveMap.tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { loadGeoData } from '../../services/geoLoader';
import { VisitorData, MapState, MapPermissions } from '../../types/map';
import { COUNTRY_TO_CONTINENT } from '../../data/mappings/countryToContinent';

interface InteractiveMapProps {
  data: VisitorData[];
  state: MapState;
  permissions: MapPermissions;
  onDrillDown: (id: string, name: string) => void;
  onDrillUp: () => void;
  isLoading: boolean;
}

const COLOR_SCALE = ['#fef3c7', '#fde68a', '#fcd34d', '#f59e0b', '#d97706'];
const NO_DATA_COLOR = '#e5e7eb';

export function InteractiveMap({
  data,
  state,
  permissions,
  onDrillDown,
  onDrillUp,
  isLoading
}: InteractiveMapProps) {
  const [geoFeatures, setGeoFeatures] = useState<any[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: VisitorData } | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  // Load GeoJSON data based on current level
  useEffect(() => {
    const loadGeo = async () => {
      setLoadingGeo(true);
      try {
        let level = state.level;
        let id: string | undefined;
        
        switch (state.level) {
          case 'world':
            level = 'world';
            break;
          case 'continent':
            id = state.selectedContinent?.toLowerCase();
            break;
          case 'country':
            id = state.selectedCountry?.toUpperCase();
            break;
          case 'province':
            id = state.selectedProvince?.toUpperCase();
            break;
        }
        
        const result = await loadGeoData(level, id);
        setGeoFeatures(result.features || []);
      } catch (error) {
        console.error('Error loading GeoJSON:', error);
        setGeoFeatures([]);
      } finally {
        setLoadingGeo(false);
      }
    };
    
    loadGeo();
  }, [state]);

  // Calculate max count for color scaling
  const maxCount = useMemo(() => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map(d => d.count));
  }, [data]);

  // Get color for a feature
  const getFeatureColor = (featureId: string): string => {
    if (!data || data.length === 0) return NO_DATA_COLOR;
    
    const item = data.find(d => d.id === featureId || d.name === featureId);
    if (!item || item.count === 0) return NO_DATA_COLOR;
    
    const ratio = item.count / maxCount;
    if (ratio < 0.2) return COLOR_SCALE[0];
    if (ratio < 0.4) return COLOR_SCALE[1];
    if (ratio < 0.6) return COLOR_SCALE[2];
    if (ratio < 0.8) return COLOR_SCALE[3];
    return COLOR_SCALE[4];
  };

  // Get feature data
  const getFeatureData = (featureId: string): VisitorData | undefined => {
    return data.find(d => d.id === featureId || d.name === featureId);
  };

  // Handle hover
  const handleMouseEnter = (e: React.MouseEvent, feature: any) => {
    const id = feature.id || feature.properties?.code;
    setHoveredId(id);
    
    const featureData = getFeatureData(id);
    if (featureData) {
      const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
      setTooltip({
        x: e.clientX + 15,
        y: e.clientY - 10,
        data: featureData
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredId(null);
    setTooltip(null);
  };

  // Handle click
  const handleClick = (feature: any) => {
    const id = feature.id || feature.properties?.code;
    const name = feature.properties?.name || id;
    
    const featureData = getFeatureData(id);
    if (!featureData) return;
    
    if (featureData.children && featureData.children.length > 0) {
      onDrillDown(id, name);
    }
  };

  // Check if feature has children (drillable)
  const hasChildren = (featureId: string): boolean => {
    const item = data.find(d => d.id === featureId || d.name === featureId);
    return !!(item?.children && item.children.length > 0);
  };

  // Get cursor style
  const getCursor = (featureId: string): string => {
    if (hasChildren(featureId)) return 'pointer';
    return 'default';
  };

  if (isLoading || loadingGeo) {
    return (
      <div className="flex items-center justify-center h-[450px] bg-slate-50 rounded-xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-stone-400 text-sm">
            {loadingGeo ? 'Loading map data...' : 'Loading visitor data...'}
          </p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[450px] bg-slate-50 rounded-xl">
        <div className="text-center max-w-md px-6">
          <div className="text-5xl mb-4">🌍</div>
          <h3 className="text-lg font-semibold text-stone-900 mb-2">No visitor origin data available yet</h3>
          <p className="text-stone-400 text-sm">
            As guests check in, this map will highlight where they come from around the world.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* SVG Map */}
      <svg
        ref={svgRef}
        viewBox="0 0 800 450"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-[450px] bg-slate-50 rounded-xl"
      >
        {geoFeatures.map((feature, index) => {
          const id = feature.id || feature.properties?.code || `feature-${index}`;
          const color = getFeatureColor(id);
          const isHovered = hoveredId === id;
          const hasData = data.some(d => d.id === id || d.name === id);
          const cursor = getCursor(id);
          
          // In production, you'd use geoPath() to generate the actual path
          // This is a simplified placeholder
          return (
            <path
              key={index}
              d={`M ${10 + Math.random() * 780} ${10 + Math.random() * 430}`}
              fill={color}
              stroke={isHovered ? '#f59e0b' : '#ffffff'}
              strokeWidth={isHovered ? 2 : 0.5}
              opacity={isHovered ? 1 : hasData ? 0.9 : 0.6}
              style={{ cursor }}
              onMouseEnter={(e) => handleMouseEnter(e, feature)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleClick(feature)}
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-white/90 px-3 py-2 rounded-lg shadow-sm border border-stone-200">
        <span className="text-[10px] text-stone-500">Low</span>
        <div className="flex gap-0.5">
          {COLOR_SCALE.map((color, i) => (
            <div key={i} className="w-5 h-3 rounded-sm" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span className="text-[10px] text-stone-500">High</span>
        <span className="text-[10px] text-stone-400 mx-1">|</span>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: NO_DATA_COLOR }} />
          <span className="text-[10px] text-stone-400">No Data</span>
        </div>
      </div>

      {/* Top Contributors */}
      {data.length > 0 && (
        <div className="absolute top-4 right-4 bg-white/90 px-3 py-2 rounded-lg shadow-sm border border-stone-200 max-w-[180px]">
          <p className="text-[10px] text-stone-500 font-medium mb-1">Top Contributors</p>
          {data.slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-0.5">
              <span className="text-stone-700">{item.name}</span>
              <span className="text-orange-500 font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      )}

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
  );
}
