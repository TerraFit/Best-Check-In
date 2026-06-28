import { useState, useMemo } from 'react';
import { CountryData } from '../../types';
import { Map, Users, Globe2 } from 'lucide-react';

interface VisitorOriginCountryMapProps {
  data: any[];
  continentName: string;
  onCountryClick: (country: string) => void;
  onBack: () => void;
  isLoading: boolean;
  geoData?: any;
}

// Predefined relative coordinates for key countries within their continents
const COUNTRY_COORDS: Record<string, Record<string, { x: number; y: number }>> = {
  'Africa': {
    'South Africa': { x: 400, y: 310 },
    'Namibia': { x: 290, y: 250 },
    'Botswana': { x: 390, y: 220 },
    'Zimbabwe': { x: 470, y: 200 },
    'Mozambique': { x: 530, y: 240 },
    'Harare': { x: 470, y: 150 },
    'Gaborone': { x: 390, y: 180 },
  },
  'Europe': {
    'Germany': { x: 420, y: 190 },
    'United Kingdom': { x: 280, y: 160 },
    'France': { x: 320, y: 250 },
    'Netherlands': { x: 370, y: 140 },
    'Italy': { x: 460, y: 290 },
    'Spain': { x: 250, y: 310 },
  },
  'North America': {
    'United States': { x: 400, y: 210 },
    'Canada': { x: 390, y: 110 },
    'Mexico': { x: 320, y: 320 },
  },
  'Asia': {
    'India': { x: 330, y: 260 },
    'China': { x: 440, y: 170 },
    'Japan': { x: 570, y: 160 },
    'Singapore': { x: 420, y: 330 },
  },
  'Oceania': {
    'Australia': { x: 360, y: 220 },
    'New Zealand': { x: 510, y: 310 },
  },
  'South America': {
    'Brazil': { x: 430, y: 200 },
    'Argentina': { x: 360, y: 320 },
  }
};

export function VisitorOriginCountryMap({
  data,
  continentName,
  onCountryClick,
  onBack,
  isLoading
}: VisitorOriginCountryMapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  // Group filtered records to count visitors per country
  const countryList = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const countryMap: Record<string, number> = {};
    data.forEach(item => {
      const country = item.guest_country || item.country;
      if (country) {
        countryMap[country] = (countryMap[country] || 0) + (item.count || 1);
      }
    });

    const total = Object.values(countryMap).reduce((sum, c) => sum + c, 0) || 1;

    return Object.entries(countryMap).map(([name, count]) => ({
      name,
      count,
      percentage: (count / total) * 100,
      continent: continentName
    })).sort((a, b) => b.count - a.count);
  }, [data, continentName]);

  const maxCount = useMemo(() => {
    if (countryList.length === 0) return 1;
    return Math.max(...countryList.map(c => c.count), 1);
  }, [countryList]);

  const continentTotal = useMemo(() => {
    return countryList.reduce((sum, c) => sum + c.count, 0);
  }, [countryList]);

  // Compute bubble visual nodes with positioning fallback
  const positionedCountries = useMemo(() => {
    const coordsPool = COUNTRY_COORDS[continentName] || {};
    
    return countryList.map((country, idx) => {
      let coords = coordsPool[country.name];
      
      // Fallback: arrange them in a circular pattern if coordinates are missing
      if (!coords) {
        const total = countryList.length;
        const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
        const radius = 130;
        coords = {
          x: 400 + Math.cos(angle) * radius,
          y: 225 + Math.sin(angle) * radius
        };
      }
      
      return {
        ...country,
        x: coords.x,
        y: coords.y
      };
    });
  }, [countryList, continentName]);

  const getBubbleRadius = (count: number): number => {
    const minRadius = 24;
    const maxRadius = 55;
    const ratio = count / maxCount;
    return minRadius + (maxRadius - minRadius) * Math.pow(ratio, 0.5);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[450px] bg-gradient-to-b from-stone-50 to-stone-100/50 rounded-2xl border border-stone-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-stone-400 text-sm font-medium">Loading countries within {continentName}...</p>
        </div>
      </div>
    );
  }

  if (countryList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[450px] bg-gradient-to-b from-stone-50 to-stone-100/50 rounded-2xl border border-stone-200 p-8 text-center">
        <Globe2 size={48} className="text-stone-300 mb-3" />
        <h3 className="text-base font-bold text-stone-700">No country-level details loaded</h3>
        <p className="text-stone-400 text-xs mt-1 max-w-sm">
          No records associated with {continentName} were found in the selected filter period.
        </p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-all border border-stone-200"
        >
          ← Back to Continents
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
          ← Back to Continents
        </button>
      </div>

      <div className="absolute top-4 right-4 z-10 bg-stone-900/90 text-white px-3 py-1.5 rounded-lg text-xs font-mono shadow-md border border-stone-800">
        REGION_LEVEL: <span className="text-orange-400 font-bold">COUNTRIES ({continentName.toUpperCase()})</span>
      </div>

      <svg
        viewBox="0 0 800 450"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        {/* Subtle coordinate grids */}
        <g opacity="0.02" stroke="#78716c" strokeWidth={1}>
          <line x1="0" y1="225" x2="800" y2="225" />
          <line x1="400" y1="0" x2="400" y2="450" />
        </g>

        {/* Orbit path circles for futuristic visual elegance */}
        <circle cx="400" cy="225" r="140" fill="none" stroke="#f97316" strokeWidth={1} strokeDasharray="2 6" opacity="0.1" />
        <circle cx="400" cy="225" r="210" fill="none" stroke="#78716c" strokeWidth={1} strokeDasharray="1 10" opacity="0.08" />

        {/* Dynamic Nodes */}
        {positionedCountries.map((country) => {
          const radius = getBubbleRadius(country.count);
          const isHovered = hoveredCountry === country.name;

          return (
            <g
              key={country.name}
              onClick={() => onCountryClick(country.name)}
              onMouseEnter={() => setHoveredCountry(country.name)}
              onMouseLeave={() => setHoveredCountry(null)}
              className="cursor-pointer"
            >
              {/* Outer halo */}
              <circle
                cx={country.x}
                cy={country.y}
                r={radius + (isHovered ? 14 : 7)}
                fill="none"
                stroke="#f97316"
                strokeWidth={1}
                opacity={isHovered ? 0.3 : 0.08}
                className="transition-all duration-300"
              />

              {/* Connector from center of canvas to country center */}
              <line
                x1="400"
                y1="225"
                x2={country.x}
                y2={country.y}
                stroke="#f97316"
                strokeWidth={isHovered ? 1.5 : 0.5}
                opacity={isHovered ? 0.25 : 0.04}
                strokeDasharray={isHovered ? "none" : "3 3"}
                className="transition-all duration-300"
              />

              {/* Base Bubble */}
              <circle
                cx={country.x}
                cy={country.y}
                r={radius}
                fill="#f97316"
                opacity={isHovered ? 1 : 0.9}
                className="transition-all duration-300"
                style={{
                  filter: isHovered 
                    ? 'drop-shadow(0 6px 14px rgba(249, 115, 22, 0.35))' 
                    : 'drop-shadow(0 2px 6px rgba(249, 115, 22, 0.15))'
                }}
              />

              {/* Gloss highlight */}
              <ellipse
                cx={country.x - radius * 0.2}
                cy={country.y - radius * 0.25}
                rx={radius * 0.3}
                ry={radius * 0.2}
                fill="white"
                opacity={isHovered ? 0.25 : 0.15}
                className="transition-all duration-300"
              />

              {/* Count Text */}
              <text
                x={country.x}
                y={country.y + 4}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-extrabold fill-white font-sans text-[11px]"
                style={{
                  fontSize: `${Math.max(10, radius * 0.45)}px`,
                  fontWeight: 800,
                  pointerEvents: 'none'
                }}
              >
                {country.count}
              </text>

              {/* Country Name label */}
              <text
                x={country.x}
                y={country.y + radius + 15}
                textAnchor="middle"
                className="font-semibold fill-stone-700 select-none"
                style={{ fontSize: '11px', transition: 'all 0.3s' }}
              >
                {country.name}
              </text>

              {/* Percentage label */}
              <text
                x={country.x}
                y={country.y + radius + 27}
                textAnchor="middle"
                className="fill-stone-400 font-mono select-none"
                style={{ fontSize: '9px', transition: 'all 0.3s' }}
              >
                {country.percentage.toFixed(1)}%
              </text>

              {/* Prompt box */}
              {isHovered && (
                <g>
                  <rect
                    x={country.x - 65}
                    y={country.y - radius - 30}
                    width={130}
                    height={20}
                    rx={5}
                    fill="#1c1917"
                  />
                  <text
                    x={country.x}
                    y={country.y - radius - 17}
                    textAnchor="middle"
                    className="fill-white font-sans font-medium"
                    style={{ fontSize: '9px' }}
                  >
                    👉 Explore Regions/States
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Center Pivot Point representing the selected continent anchor */}
        <g opacity="0.95">
          <circle cx="400" cy="225" r="28" fill="#1c1917" />
          <circle cx="400" cy="225" r="26" fill="none" stroke="#f97316" strokeWidth={1} />
          <text
            x="400"
            y="222"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-orange-400 font-bold font-sans text-[9px] tracking-wider"
          >
            {continentName.toUpperCase().slice(0, 4)}
          </text>
          <text
            x="400"
            y="233"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-white/80 font-mono font-bold text-[8px]"
          >
            {continentTotal}
          </text>
        </g>
      </svg>

      {/* Floating side summary lists */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/95 px-4 py-3 rounded-xl shadow-lg border border-stone-200 max-w-[200px]">
        <div className="flex items-center gap-1.5 mb-2">
          <Users size={12} className="text-orange-500" />
          <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Top Markets</h4>
        </div>
        <div className="space-y-1">
          {countryList.slice(0, 4).map((country) => (
            <div key={country.name} className="flex items-center justify-between text-xs font-semibold">
              <span className="text-stone-600 truncate mr-2">{country.name}</span>
              <span className="text-stone-900 font-extrabold">{country.count}</span>
            </div>
          ))}
          {countryList.length > 4 && (
            <p className="text-[9px] text-stone-400 pt-1 border-t border-stone-100">
              +{countryList.length - 4} other countries
            </p>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-10 bg-white/95 px-4 py-2 rounded-xl shadow-lg border border-stone-200">
        <span className="text-[10px] text-stone-400 block font-medium uppercase tracking-wider">Continent Total</span>
        <span className="text-sm font-extrabold text-stone-900">{continentTotal.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default VisitorOriginCountryMap;
