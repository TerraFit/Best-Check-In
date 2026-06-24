// src/components/analytics/VisitorOriginContinentMap.tsx
import { useState, useMemo, useRef, useEffect } from 'react';

interface ContinentData {
  name: string;
  count: number;
  percentage: number;
  color?: string;
}

interface VisitorOriginContinentMapProps {
  data: ContinentData[];
  onContinentClick: (continent: string) => void;
  onContinentHover?: (continent: string | null) => void;
  isLoading: boolean;
  highlightedContinent?: string | null;
}

const CONTINENT_COLORS: Record<string, string> = {
  'Africa': '#f59e0b',
  'Europe': '#3b82f6',
  'Asia': '#8b5cf6',
  'North America': '#10b981',
  'South America': '#ef4444',
  'Oceania': '#ec4899',
  'Antarctica': '#94a3b8',
  'Other': '#94a3b8'
};

const CONTINENT_COORDS: Record<string, { x: number; y: number }> = {
  'Africa': { x: 400, y: 280 },
  'Europe': { x: 400, y: 180 },
  'Asia': { x: 480, y: 180 },
  'North America': { x: 250, y: 150 },
  'South America': { x: 300, y: 320 },
  'Oceania': { x: 550, y: 340 },
  'Antarctica': { x: 400, y: 430 },
  'Other': { x: 400, y: 400 }
};

export function VisitorOriginContinentMap({
  data,
  onContinentClick,
  onContinentHover = () => {},
  isLoading,
  highlightedContinent
}: VisitorOriginContinentMapProps) {
  const [hoveredContinent, setHoveredContinent] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: ContinentData } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debug: Log data
  console.log('🌍 ContinentMap received data:', data);

  const maxCount = useMemo(() => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map(d => d.count || 0), 1);
  }, [data]);

  const getBubbleRadius = (count: number): number => {
    if (count === 0) return 8;
    const minRadius = 20;
    const maxRadius = 80;
    const ratio = count / maxCount;
    return minRadius + (maxRadius - minRadius) * Math.min(1, ratio * 1.2);
  };

  const getBubbleOpacity = (continentName: string): number => {
    if (!highlightedContinent) return 0.85;
    if (highlightedContinent === continentName) return 1;
    return 0.3;
  };

  const getBubbleScale = (continentName: string): number => {
    if (hoveredContinent === continentName || highlightedContinent === continentName) {
      return 1.15;
    }
    return 1;
  };

  const handleMouseEnter = (e: React.MouseEvent, continent: ContinentData) => {
    setHoveredContinent(continent.name);
    onContinentHover(continent.name);
    
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    setTooltip({
      x: e.clientX + 15,
      y: e.clientY - 10,
      data: continent
    });
  };

  const handleMouseLeave = () => {
    setHoveredContinent(null);
    onContinentHover(null);
    setTooltip(null);
  };

  const handleClick = (continent: ContinentData) => {
    console.log('🖱️ Clicked continent:', continent.name);
    onContinentClick(continent.name);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[450px] bg-slate-50 rounded-xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-stone-400 text-sm">Loading continent data...</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[450px] bg-slate-50 rounded-xl">
        <div className="text-center max-w-md px-6">
          <div className="text-5xl mb-4">🌍</div>
          <h3 className="text-lg font-semibold text-stone-900 mb-2">No visitor data available yet</h3>
          <p className="text-stone-400 text-sm">
            As guests check in, bubbles will appear showing visitor origins by continent.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-[450px] bg-slate-50 rounded-xl overflow-hidden">
      <svg
        viewBox="0 0 800 450"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        style={{ background: 'transparent' }}
      >
        {/* Simple world map background - just a subtle outline */}
        <g opacity="0.1">
          <circle cx="400" cy="225" r="200" fill="none" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" />
          <line x1="0" y1="225" x2="800" y2="225" stroke="#94a3b8" strokeWidth={0.5} opacity="0.3" />
          <line x1="400" y1="0" x2="400" y2="450" stroke="#94a3b8" strokeWidth={0.5} opacity="0.3" />
        </g>

        {/* Continent Bubbles */}
        {data.map((continent) => {
          const coords = CONTINENT_COORDS[continent.name];
          if (!coords) {
            console.warn(`⚠️ No coordinates for continent: ${continent.name}`);
            return null;
          }

          const radius = getBubbleRadius(continent.count);
          const color = CONTINENT_COLORS[continent.name] || CONTINENT_COLORS['Other'];
          const opacity = getBubbleOpacity(continent.name);
          const scale = getBubbleScale(continent.name);
          const isHovered = hoveredContinent === continent.name;

          return (
            <g
              key={continent.name}
              onClick={() => handleClick(continent)}
              onMouseEnter={(e) => handleMouseEnter(e, continent)}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: 'pointer' }}
            >
              {/* Glow effect */}
              <circle
                cx={coords.x}
                cy={coords.y}
                r={radius * 1.4}
                fill={color}
                opacity={isHovered ? 0.15 : 0.05}
                style={{ transition: 'all 0.3s ease' }}
              />
              
              {/* Main bubble */}
              <circle
                cx={coords.x}
                cy={coords.y}
                r={radius}
                fill={color}
                opacity={opacity}
                stroke={isHovered ? '#ffffff' : 'rgba(255,255,255,0.3)'}
                strokeWidth={isHovered ? 3 : 1}
                style={{
                  transition: 'all 0.3s ease',
                  transform: `scale(${scale})`,
                  transformOrigin: `${coords.x}px ${coords.y}px`,
                  filter: isHovered ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.2))' : 'none'
                }}
              />

              {/* Inner highlight */}
              <circle
                cx={coords.x - radius * 0.2}
                cy={coords.y - radius * 0.3}
                r={radius * 0.3}
                fill="white"
                opacity={isHovered ? 0.3 : 0.15}
                style={{ transition: 'all 0.3s ease' }}
              />

              {/* Visitor count label */}
              <text
                x={coords.x}
                y={coords.y + 5}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-white font-bold"
                style={{
                  fontSize: Math.max(12, Math.min(28, radius * 0.5)),
                  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  pointerEvents: 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                {continent.count}
              </text>

              {/* Continent name label */}
              <text
                x={coords.x}
                y={coords.y + radius + 24}
                textAnchor="middle"
                className="text-stone-700 font-medium"
                style={{
                  fontSize: '13px',
                  pointerEvents: 'none',
                  opacity: isHovered ? 1 : 0.7,
                  transition: 'all 0.3s ease'
                }}
              >
                {continent.name}
              </text>

              {/* Percentage label */}
              <text
                x={coords.x}
                y={coords.y + radius + 44}
                textAnchor="middle"
                className="text-stone-400"
                style={{
                  fontSize: '11px',
                  pointerEvents: 'none',
                  opacity: isHovered ? 1 : 0.5,
                  transition: 'all 0.3s ease'
                }}
              >
                {continent.percentage.toFixed(1)}%
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(20, 20)">
          <rect x="0" y="0" width="180" height="100" rx="8" fill="white" opacity="0.9" />
          <text x="12" y="20" className="text-xs font-semibold text-stone-700">Visitor Origins</text>
          <text x="12" y="38" className="text-[10px] text-stone-400">Hover for details · Click to explore</text>
          
          {/* Color legend - show top 3 */}
          {data.slice(0, 3).map((item, i) => (
            <g key={i} transform={`translate(12, ${48 + i * 16})`}>
              <circle cx="6" cy="6" r="5" fill={CONTINENT_COLORS[item.name] || CONTINENT_COLORS['Other']} />
              <text x="16" y="9" className="text-[10px] text-stone-600">{item.name}</text>
              <text x="120" y="9" className="text-[10px] text-stone-400 text-right">{item.count}</text>
            </g>
          ))}
          {data.length > 3 && (
            <text x="12" y="100" className="text-[10px] text-stone-400">+{data.length - 3} more</text>
          )}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed bg-white p-4 rounded-xl shadow-xl border border-stone-200 max-w-[220px] pointer-events-none z-50"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translateY(-8px)'
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: CONTINENT_COLORS[tooltip.data.name] || CONTINENT_COLORS['Other'] }}
            />
            <p className="font-semibold text-stone-900 text-sm">{tooltip.data.name}</p>
          </div>
          <p className="text-sm text-stone-600">
            <span className="font-medium">{tooltip.data.count.toLocaleString()}</span> visitors
            <span className="ml-2 text-orange-500">
              ({tooltip.data.percentage.toFixed(1)}%)
            </span>
          </p>
          <p className="text-xs text-stone-400 mt-1 border-t border-stone-100 pt-1">
            👆 Click to explore further
          </p>
        </div>
      )}
    </div>
  );
}
