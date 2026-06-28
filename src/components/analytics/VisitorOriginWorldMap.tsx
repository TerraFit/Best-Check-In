import { useState, useRef } from 'react';

interface VisitorOriginWorldMapProps {
  totalVisitors: number;
  onExplore: () => void;
  isLoading: boolean;
}

export function VisitorOriginWorldMap({
  totalVisitors,
  onExplore,
  isLoading
}: VisitorOriginWorldMapProps) {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[450px] bg-gradient-to-b from-stone-50 to-stone-100/50 rounded-2xl border border-stone-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-stone-400 text-sm font-medium">Loading world data...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[450px] bg-gradient-to-b from-stone-50 to-stone-100/50 rounded-2xl border border-stone-200/80 overflow-hidden cursor-pointer group transition-all duration-300 hover:border-orange-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onExplore}
    >
      {/* Background: Map outline visual grids */}
      <svg
        viewBox="0 0 800 450"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        style={{ background: 'transparent' }}
      >
        {/* Subtle coordinate grid lines for a technical look */}
        <g opacity="0.04" stroke="#78716c" strokeWidth={1}>
          <line x1="0" y1="112.5" x2="800" y2="112.5" />
          <line x1="0" y1="225" x2="800" y2="225" strokeDasharray="4 4" />
          <line x1="0" y1="337.5" x2="800" y2="337.5" />
          <line x1="200" y1="0" x2="200" y2="450" />
          <line x1="400" y1="0" x2="400" y2="450" strokeDasharray="4 4" />
          <line x1="600" y1="0" x2="600" y2="450" />
        </g>

        {/* Beautiful artistic low-poly representation of continent bubbles in background */}
        <g opacity="0.08" fill="#78716c">
          {/* North America */}
          <circle cx="200" cy="160" r="50" />
          <circle cx="230" cy="180" r="30" />
          <circle cx="160" cy="140" r="35" />
          
          {/* South America */}
          <circle cx="290" cy="310" r="40" />
          <circle cx="270" cy="270" r="30" />
          <circle cx="310" cy="350" r="25" />

          {/* Africa */}
          <circle cx="410" cy="280" r="45" />
          <circle cx="430" cy="240" r="35" />
          <circle cx="390" cy="290" r="30" />

          {/* Europe */}
          <circle cx="410" cy="150" r="35" />
          <circle cx="430" cy="130" r="30" />
          <circle cx="380" cy="160" r="25" />

          {/* Asia */}
          <circle cx="530" cy="160" r="60" />
          <circle cx="580" cy="180" r="45" />
          <circle cx="490" cy="140" r="40" />

          {/* Australia/Oceania */}
          <circle cx="580" cy="330" r="35" />
          <circle cx="610" cy="340" r="25" />
        </g>

        {/* Text descriptions matching our coordinates */}
        <g opacity="0.3" className="text-[10px] font-mono tracking-widest fill-stone-400">
          <text x="140" y="210">AMER_NORTH</text>
          <text x="250" y="380">AMER_SOUTH</text>
          <text x="430" y="340">AFRICA_SUB</text>
          <text x="360" y="100">EURO_ZONE</text>
          <text x="560" y="110">ASIA_EAST</text>
          <text x="610" y="380">OCEANIA</text>
        </g>

        {/* Central Orange Bubble - BRAND COLOR OF FastCheckin */}
        <g className="transition-all duration-300">
          {/* Pulsating outer glowing waves */}
          <circle
            cx="400"
            cy="225"
            r={isHovered ? 140 : 120}
            fill="#f97316"
            opacity={isHovered ? 0.09 : 0.04}
            className="transition-all duration-300"
          />

          <circle
            cx="400"
            cy="225"
            r={isHovered ? 115 : 100}
            fill="none"
            stroke="#f97316"
            strokeWidth={isHovered ? 6 : 4}
            opacity={isHovered ? 0.3 : 0.15}
            className="transition-all duration-300"
          />

          {/* Main bubble */}
          <circle
            cx="400"
            cy="225"
            r={isHovered ? 95 : 82}
            fill="#f97316"
            opacity={isHovered ? 1 : 0.95}
            className="transition-all duration-300 drop-shadow-md"
            style={{
              filter: isHovered 
                ? 'drop-shadow(0 12px 28px rgba(249, 115, 22, 0.45)) drop-shadow(0 0 45px rgba(249, 115, 22, 0.25))' 
                : 'drop-shadow(0 6px 16px rgba(249, 115, 22, 0.3))'
            }}
          />

          {/* Glossy overlay effect for visual polish */}
          <ellipse
            cx={400 - (isHovered ? 24 : 18)}
            cy={225 - (isHovered ? 28 : 22)}
            rx={isHovered ? 32 : 24}
            ry={isHovered ? 22 : 16}
            fill="white"
            opacity={isHovered ? 0.25 : 0.15}
            className="transition-all duration-300"
          />

          {/* Visitor count */}
          <text
            x="400"
            y="225"
            textAnchor="middle"
            dominantBaseline="middle"
            className="font-extrabold fill-white font-sans text-shadow"
            style={{
              fontSize: isHovered ? '42px' : '34px',
              transition: 'all 0.3s ease',
              fontWeight: 900,
            }}
          >
            {totalVisitors.toLocaleString()}
          </text>

          {/* Bubble Title */}
          <text
            x="400"
            y={isHovered ? 355 : 340}
            textAnchor="middle"
            className="font-bold fill-stone-800 tracking-tight"
            style={{
              fontSize: isHovered ? '20px' : '17px',
              transition: 'all 0.3s ease'
            }}
          >
            Total Check-ins
          </text>

          {/* Subtitle / CTA instruction */}
          <text
            x="400"
            y={isHovered ? 385 : 368}
            textAnchor="middle"
            className="fill-orange-600 font-semibold"
            style={{
              fontSize: '13px',
              opacity: isHovered ? 1 : 0.7,
              transition: 'all 0.3s ease',
            }}
          >
            {isHovered ? '👉 Click to drill down by continent 🌍' : '👆 Click anywhere to explore'}
          </text>
        </g>

        {/* Footer brand credit */}
        <text
          x="400"
          y="430"
          textAnchor="middle"
          className="fill-stone-300 font-mono text-[9px] tracking-widest"
        >
          POWERED BY WWW.FASTCHECKIN.CO.ZA
        </text>
      </svg>

      {/* Hover Floating Tooltip info */}
      <div className="absolute top-4 right-4 bg-stone-900/90 text-white px-3 py-1.5 rounded-lg text-xs font-mono shadow-md border border-stone-800">
        REGION_LEVEL: <span className="text-orange-400 font-bold">WORLD_TOTAL</span>
      </div>

      <div className="absolute bottom-4 left-6 flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
        </span>
        <span className="text-[11px] font-medium text-stone-500 font-mono uppercase tracking-wider">
          LIVE DEMO VISITOR DATASTREAM
        </span>
      </div>
    </div>
  );
}

export default VisitorOriginWorldMap;
