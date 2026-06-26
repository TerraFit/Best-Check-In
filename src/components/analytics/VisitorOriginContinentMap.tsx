import { useState, useMemo } from 'react';
import { ContinentData } from '../../types';
import { Compass, HelpCircle } from 'lucide-react';

interface VisitorOriginContinentMapProps {
  data: ContinentData[];
  onContinentClick: (continent: string) => void;
  onBack: () => void;
  isLoading: boolean;
}

// Continent visual anchor positions on our 800x450 canvas
const CONTINENT_COORDS: Record<string, { x: number; y: number }> = {
  'Africa': { x: 420, y: 260 },
  'Europe': { x: 390, y: 140 },
  'Asia': { x: 570, y: 150 },
  'North America': { x: 210, y: 140 },
  'South America': { x: 270, y: 310 },
  'Oceania': { x: 620, y: 320 },
};

export function VisitorOriginContinentMap({
  data,
  onContinentClick,
  onBack,
  isLoading
}: VisitorOriginContinentMapProps) {
  const [hoveredContinent, setHoveredContinent] = useState<string | null>(null);

  const maxCount = useMemo(() => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map(d => d.count || 0), 1);
  }, [data]);

  const getBubbleRadius = (count: number): number => {
    const minRadius = 26;
    const maxRadius = 60;
    const ratio = count / maxCount;
    return minRadius + (maxRadius - minRadius) * Math.pow(ratio, 0.55);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[450px] bg-gradient-to-b from-stone-50 to-stone-100/50 rounded-2xl border border-stone-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-stone-400 text-sm font-medium">Loading continent analytics...</p>
        </div>
      </div>
    );
  }

  // Ensure all standard continents exist in presentation
  const normalizedData = useMemo(() => {
    const baseContinents = ['Africa', 'Europe', 'Asia', 'North America', 'South America', 'Oceania'];
    const total = data.reduce((sum, d) => sum + d.count, 0) || 1;
    
    return baseContinents.map(name => {
      const match = data.find(d => d.name.toLowerCase() === name.toLowerCase());
      const count = match ? match.count : 0;
      return {
        name,
        count,
        percentage: (count / total) * 100
      };
    }).sort((a, b) => b.count - a.count);
  }, [data]);

  const grandTotal = normalizedData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="relative w-full h-[450px] bg-gradient-to-b from-stone-50 to-stone-100/50 rounded-2xl border border-stone-200 overflow-hidden">
      {/* Top action bar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 rounded-lg text-xs font-semibold shadow-sm border border-stone-200 transition-all"
        >
          ← Back to World
        </button>
      </div>

      <div className="absolute top-4 right-4 z-10 bg-stone-900/90 text-white px-3 py-1.5 rounded-lg text-xs font-mono shadow-md border border-stone-800">
        REGION_LEVEL: <span className="text-orange-400 font-bold">CONTINENTS</span>
      </div>

      <svg
        viewBox="0 0 800 450"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        {/* Visual Map Gridlines */}
        <g opacity="0.03" stroke="#78716c" strokeWidth={1}>
          <line x1="0" y1="225" x2="800" y2="225" />
          <line x1="400" y1="0" x2="400" y2="450" />
        </g>

        {/* Custom Connector lines between continent hubs to look scientific */}
        <g opacity="0.1" stroke="#f97316" strokeWidth={1.5} strokeDasharray="3 3">
          <line x1={CONTINENT_COORDS['North America'].x} y1={CONTINENT_COORDS['North America'].y} x2={CONTINENT_COORDS['Europe'].x} y2={CONTINENT_COORDS['Europe'].y} />
          <line x1={CONTINENT_COORDS['North America'].x} y1={CONTINENT_COORDS['North America'].y} x2={CONTINENT_COORDS['South America'].x} y2={CONTINENT_COORDS['South America'].y} />
          <line x1={CONTINENT_COORDS['Europe'].x} y1={CONTINENT_COORDS['Europe'].y} x2={CONTINENT_COORDS['Africa'].x} y2={CONTINENT_COORDS['Africa'].y} />
          <line x1={CONTINENT_COORDS['Europe'].x} y1={CONTINENT_COORDS['Europe'].y} x2={CONTINENT_COORDS['Asia'].x} y2={CONTINENT_COORDS['Asia'].y} />
          <line x1={CONTINENT_COORDS['Asia'].x} y1={CONTINENT_COORDS['Asia'].y} x2={CONTINENT_COORDS['Oceania'].x} y2={CONTINENT_COORDS['Oceania'].y} />
          <line x1={CONTINENT_COORDS['Africa'].x} y1={CONTINENT_COORDS['Africa'].y} x2={CONTINENT_COORDS['South America'].x} y2={CONTINENT_COORDS['South America'].y} />
        </g>

        {/* Continent Labels (underlay) */}
        <g opacity="0.25" className="text-[11px] font-mono tracking-widest font-bold fill-stone-400">
          {Object.entries(CONTINENT_COORDS).map(([name, coords]) => (
            <text
              key={name}
              x={coords.x}
              y={coords.y - 45}
              textAnchor="middle"
            >
              {name.toUpperCase()}
            </text>
          ))}
        </g>

        {/* Interactive Continent Bubbles */}
        {normalizedData.map((continent) => {
          const coords = CONTINENT_COORDS[continent.name];
          if (!coords) return null;

          const radius = getBubbleRadius(continent.count);
          const isHovered = hoveredContinent === continent.name;

          return (
            <g
              key={continent.name}
              onClick={() => onContinentClick(continent.name)}
              onMouseEnter={() => setHoveredContinent(continent.name)}
              onMouseLeave={() => setHoveredContinent(null)}
              className="cursor-pointer"
            >
              {/* Outer pulsing ring for active continents with count > 0 */}
              {continent.count > 0 && (
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r={radius + (isHovered ? 20 : 10)}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth={1.5}
                  opacity={isHovered ? 0.35 : 0.1}
                  className={`${isHovered ? 'animate-none' : 'animate-pulse'}`}
                  style={{ transition: 'all 0.3s ease' }}
                />
              )}

              {/* Main orange bubble or gray placeholder if 0 checkins */}
              <circle
                cx={coords.x}
                cy={coords.y}
                r={radius}
                fill={continent.count > 0 ? '#f97316' : '#d6d3d1'}
                opacity={isHovered ? 1 : 0.9}
                className="transition-all duration-300"
                style={{
                  filter: isHovered 
                    ? 'drop-shadow(0 8px 20px rgba(249, 115, 22, 0.4))' 
                    : 'drop-shadow(0 4px 10px rgba(249, 115, 22, 0.15))'
                }}
              />

              {/* Inner highlight gloss */}
              {continent.count > 0 && (
                <ellipse
                  cx={coords.x - radius * 0.22}
                  cy={coords.y - radius * 0.28}
                  rx={radius * 0.32}
                  ry={radius * 0.22}
                  fill="white"
                  opacity={isHovered ? 0.28 : 0.16}
                  className="transition-all duration-300"
                />
              )}

              {/* Count Text */}
              <text
                x={coords.x}
                y={coords.y + (continent.count > 0 ? 1 : 4)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-extrabold fill-white font-sans"
                style={{
                  fontSize: `${Math.max(11, radius * 0.45)}px`,
                  fontWeight: 800,
                  pointerEvents: 'none'
                }}
              >
                {continent.count}
              </text>

              {/* Percentage tag underneath if count > 0 */}
              {continent.count > 0 && (
                <g opacity={isHovered ? 1 : 0.8} className="transition-all duration-300">
                  <rect
                    x={coords.x - 24}
                    y={coords.y + radius + 6}
                    width={48}
                    height={16}
                    rx={4}
                    fill={isHovered ? '#1c1917' : '#78716c'}
                  />
                  <text
                    x={coords.x}
                    y={coords.y + radius + 17}
                    textAnchor="middle"
                    className="fill-white font-mono font-bold"
                    style={{ fontSize: '9px', pointerEvents: 'none' }}
                  >
                    {continent.percentage.toFixed(1)}%
                  </text>
                </g>
              )}

              {/* Interactive CTA helper indicator */}
              {isHovered && continent.count > 0 && (
                <g>
                  <rect
                    x={coords.x - 60}
                    y={coords.y - radius - 34}
                    width={120}
                    height={22}
                    rx={6}
                    fill="#1c1917"
                  />
                  <text
                    x={coords.x}
                    y={coords.y - radius - 20}
                    textAnchor="middle"
                    className="fill-white font-sans font-semibold"
                    style={{ fontSize: '10px' }}
                  >
                    👉 Drill country view
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Static list overlay sidebar for reference */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/95 px-4 py-3 rounded-xl shadow-lg border border-stone-200 max-w-[220px]">
        <div className="flex items-center gap-1 mb-2">
          <Compass size={12} className="text-orange-500" />
          <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Top Continents</h4>
        </div>
        <div className="space-y-1.5">
          {normalizedData.slice(0, 4).map((item, index) => (
            <div key={item.name} className="flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-stone-400 text-[10px] font-mono">#{index + 1}</span>
                <span className="text-stone-700 truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-stone-900 font-bold">{item.count}</span>
                <span className="text-stone-400 text-[10px] font-mono">({item.percentage.toFixed(0)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating prompt box at bottom-right */}
      <div className="absolute bottom-4 right-4 z-10 bg-white/95 px-4 py-2 rounded-xl shadow-lg border border-stone-200 flex items-center gap-3">
        <div>
          <span className="text-[10px] text-stone-400 block font-medium uppercase tracking-wider">World Total Check-ins</span>
          <span className="text-base font-extrabold text-stone-900">{grandTotal.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
