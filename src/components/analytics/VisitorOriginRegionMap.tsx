import { useState, useMemo } from 'react';
import { RegionData } from '../../types';
import { Compass, Users, MapPin } from 'lucide-react';

interface VisitorOriginRegionMapProps {
  data: any[];
  countryName: string;
  onRegionClick: (region: string) => void;
  onBack: () => void;
  isLoading: boolean;
  geoData?: any;
}

// Predefined relative coordinates for provinces/states/regions within specific countries
const REGION_COORDS: Record<string, Record<string, { x: number; y: number }>> = {
  'South Africa': {
    'Western Cape': { x: 300, y: 310 },
    'Gauteng': { x: 480, y: 160 },
    'KwaZulu-Natal': { x: 540, y: 240 },
    'Eastern Cape': { x: 410, y: 330 },
    'Mpumalanga': { x: 540, y: 140 },
    'Free State': { x: 430, y: 230 },
  },
  'Germany': {
    'Bavaria': { x: 480, y: 290 },
    'Berlin': { x: 510, y: 140 },
    'Hesse': { x: 350, y: 210 },
  },
  'United States': {
    'California': { x: 260, y: 240 },
    'New York': { x: 550, y: 160 },
    'Texas': { x: 420, y: 320 },
  },
  'United Kingdom': {
    'Greater London': { x: 410, y: 280 },
    'Scotland': { x: 380, y: 130 },
  },
  'France': {
    'Île-de-France': { x: 380, y: 180 },
    'Provence-Alpes-Côte d\'Azur': { x: 450, y: 300 },
  }
};

export function VisitorOriginRegionMap({
  data,
  countryName,
  onRegionClick,
  onBack,
  isLoading
}: VisitorOriginRegionMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Group filtered records to count visitors per region
  const regionList = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const regionMap: Record<string, number> = {};
    data.forEach(item => {
      const region = item.region || item.state || item.province;
      if (region) {
        regionMap[region] = (regionMap[region] || 0) + (item.count || 1);
      }
    });

    const total = Object.values(regionMap).reduce((sum, r) => sum + r, 0) || 1;

    return Object.entries(regionMap).map(([name, count]) => ({
      name,
      count,
      percentage: (count / total) * 100,
      country: countryName
    })).sort((a, b) => b.count - a.count);
  }, [data, countryName]);

  const maxCount = useMemo(() => {
    if (regionList.length === 0) return 1;
    return Math.max(...regionList.map(r => r.count), 1);
  }, [regionList]);

  const countryTotal = useMemo(() => {
    return regionList.reduce((sum, r) => sum + r.count, 0);
  }, [regionList]);

  // Compute bubble positions with fallback
  const positionedRegions = useMemo(() => {
    const coordsPool = REGION_COORDS[countryName] || {};
    
    return regionList.map((region, idx) => {
      let coords = coordsPool[region.name];
      
      // Fallback: arrange them in an orbital pattern if coordinates are missing
      if (!coords) {
        const total = regionList.length;
        const angle = (idx / total) * 2 * Math.PI;
        const radius = 120;
        coords = {
          x: 400 + Math.cos(angle) * radius,
          y: 225 + Math.sin(angle) * radius
        };
      }
      
      return {
        ...region,
        x: coords.x,
        y: coords.y
      };
    });
  }, [regionList, countryName]);

  const getBubbleRadius = (count: number): number => {
    const minRadius = 24;
    const maxRadius = 52;
    const ratio = count / maxCount;
    return minRadius + (maxRadius - minRadius) * Math.pow(ratio, 0.5);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[450px] bg-gradient-to-b from-stone-50 to-stone-100/50 rounded-2xl border border-stone-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-stone-400 text-sm font-medium">Loading regions within {countryName}...</p>
        </div>
      </div>
    );
  }

  if (regionList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[450px] bg-gradient-to-b from-stone-50 to-stone-100/50 rounded-2xl border border-stone-200 p-8 text-center">
        <MapPin size={48} className="text-stone-300 mb-3" />
        <h3 className="text-base font-bold text-stone-700">No regional details available</h3>
        <p className="text-stone-400 text-xs mt-1 max-w-sm">
          No region records matched for {countryName}. Try adjusting filters or selecting another country.
        </p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-all border border-stone-200"
        >
          ← Back to Countries
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[450px] bg-gradient-to-b from-stone-50 to-stone-100/50 rounded-2xl border border-stone-200 overflow-hidden">
      {/* Top action header */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 rounded-lg text-xs font-semibold shadow-sm border border-stone-200 transition-all"
        >
          ← Back to Countries
        </button>
      </div>

      <div className="absolute top-4 right-4 z-10 bg-stone-900/90 text-white px-3 py-1.5 rounded-lg text-xs font-mono shadow-md border border-stone-800">
        REGION_LEVEL: <span className="text-orange-400 font-bold">REGIONS ({countryName.toUpperCase()})</span>
      </div>

      <svg
        viewBox="0 0 800 450"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        {/* Subtle grids */}
        <g opacity="0.02" stroke="#78716c" strokeWidth={1}>
          <line x1="0" y1="225" x2="800" y2="225" />
          <line x1="400" y1="0" x2="400" y2="450" />
        </g>

        {/* Orbit track */}
        <circle cx="400" cy="225" r="130" fill="none" stroke="#f97316" strokeWidth={1.2} strokeDasharray="4 8" opacity="0.08" />

        {/* Dynamic province / state bubbles */}
        {positionedRegions.map((region) => {
          const radius = getBubbleRadius(region.count);
          const isHovered = hoveredRegion === region.name;

          return (
            <g
              key={region.name}
              onClick={() => onRegionClick(region.name)}
              onMouseEnter={() => setHoveredRegion(region.name)}
              onMouseLeave={() => setHoveredRegion(null)}
              className="cursor-pointer"
            >
              {/* Pulsating outer rim */}
              <circle
                cx={region.x}
                cy={region.y}
                r={radius + (isHovered ? 12 : 6)}
                fill="none"
                stroke="#f97316"
                strokeWidth={1}
                opacity={isHovered ? 0.35 : 0.08}
                className="transition-all duration-300"
              />

              {/* Link line to core hub */}
              <line
                x1="400"
                y1="225"
                x2={region.x}
                y2={region.y}
                stroke="#f97316"
                strokeWidth={isHovered ? 1.5 : 0.6}
                opacity={isHovered ? 0.3 : 0.05}
                strokeDasharray={isHovered ? "none" : "2 2"}
              />

              {/* Core Orange Bubble */}
              <circle
                cx={region.x}
                cy={region.y}
                r={radius}
                fill="#f97316"
                opacity={isHovered ? 1 : 0.9}
                className="transition-all duration-300"
                style={{
                  filter: isHovered 
                    ? 'drop-shadow(0 6px 14px rgba(249, 115, 22, 0.35))' 
                    : 'drop-shadow(0 2px 5px rgba(249, 115, 22, 0.15))'
                }}
              />

              {/* Gloss highlight */}
              <ellipse
                cx={region.x - radius * 0.2}
                cy={region.y - radius * 0.25}
                rx={radius * 0.28}
                ry={radius * 0.18}
                fill="white"
                opacity={isHovered ? 0.25 : 0.15}
                className="transition-all duration-300"
              />

              {/* Count text */}
              <text
                x={region.x}
                y={region.y + 4}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-extrabold fill-white font-sans text-[11px]"
                style={{
                  fontSize: `${Math.max(10, radius * 0.45)}px`,
                  fontWeight: 800,
                  pointerEvents: 'none'
                }}
              >
                {region.count}
              </text>

              {/* Label */}
              <text
                x={region.x}
                y={region.y + radius + 15}
                textAnchor="middle"
                className="font-semibold fill-stone-700 select-none"
                style={{ fontSize: '11px', transition: 'all 0.3s' }}
              >
                {region.name}
              </text>

              {/* Percentage */}
              <text
                x={region.x}
                y={region.y + radius + 27}
                textAnchor="middle"
                className="fill-stone-400 font-mono select-none"
                style={{ fontSize: '9px', transition: 'all 0.3s' }}
              >
                {region.percentage.toFixed(1)}%
              </text>

              {/* CTA prompt */}
              {isHovered && (
                <g>
                  <rect
                    x={region.x - 60}
                    y={region.y - radius - 30}
                    width={120}
                    height={20}
                    rx={5}
                    fill="#1c1917"
                  />
                  <text
                    x={region.x}
                    y={region.y - radius - 17}
                    textAnchor="middle"
                    className="fill-white font-sans font-medium"
                    style={{ fontSize: '9px' }}
                  >
                    👉 City Grid Breakdown
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Central Core Hub representing the country */}
        <g opacity="0.95">
          <circle cx="400" cy="225" r="32" fill="#1c1917" />
          <circle cx="400" cy="225" r="30" fill="none" stroke="#f97316" strokeWidth={1} />
          <text
            x="400"
            y="222"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-orange-400 font-bold font-sans text-[9px] tracking-wide"
          >
            {countryName.toUpperCase().slice(0, 5)}
          </text>
          <text
            x="400"
            y="234"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-white/80 font-mono font-bold text-[8px]"
          >
            {countryTotal}
          </text>
        </g>
      </svg>

      {/* Region list overlay panel */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/95 px-4 py-3 rounded-xl shadow-lg border border-stone-200 max-w-[200px]">
        <div className="flex items-center gap-1.5 mb-2">
          <Compass size={12} className="text-orange-500" />
          <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Top Regions</h4>
        </div>
        <div className="space-y-1">
          {regionList.slice(0, 4).map((region) => (
            <div key={region.name} className="flex items-center justify-between text-xs font-semibold">
              <span className="text-stone-600 truncate mr-2">{region.name}</span>
              <span className="text-stone-900 font-extrabold">{region.count}</span>
            </div>
          ))}
          {regionList.length > 4 && (
            <p className="text-[9px] text-stone-400 pt-1 border-t border-stone-100">
              +{regionList.length - 4} other regions
            </p>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-10 bg-white/95 px-4 py-2 rounded-xl shadow-lg border border-stone-200">
        <span className="text-[10px] text-stone-400 block font-medium uppercase tracking-wider">Country Total</span>
        <span className="text-sm font-extrabold text-stone-900">{countryTotal.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default VisitorOriginRegionMap;
