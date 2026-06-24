// src/components/analytics/VisitorOriginCountryMap.tsx
import { useState, useMemo, useCallback } from 'react';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';

interface CountryData {
  name: string;
  count: number;
  percentage: number;
}

interface VisitorOriginCountryMapProps {
  data: CountryData[];
  continentName: string;
  onCountryClick: (country: string) => void;
  onCountryHover: (country: string | null) => void;
  onBack: () => void;
  isLoading: boolean;
  geoData: any;
}

const COUNTRY_COLORS = ['#fef3c7', '#fde68a', '#fcd34d', '#f59e0b', '#d97706'];

export function VisitorOriginCountryMap({
  data,
  continentName,
  onCountryClick,
  onCountryHover,
  onBack,
  isLoading,
  geoData
}: VisitorOriginCountryMapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: CountryData } | null>(null);

  const maxCount = useMemo(() => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map(d => d.count || 0), 1);
  }, [data]);

  const getCountryColor = useCallback((countryName: string): string => {
    const countryData = data.find(d => d.name === countryName);
    if (!countryData || countryData.count === 0) return '#e5e7eb';
    
    const ratio = countryData.count / maxCount;
    if (ratio < 0.2) return COUNTRY_COLORS[0];
    if (ratio < 0.4) return COUNTRY_COLORS[1];
    if (ratio < 0.6) return COUNTRY_COLORS[2];
    if (ratio < 0.8) return COUNTRY_COLORS[3];
    return COUNTRY_COLORS[4];
  }, [data, maxCount]);

  const projection = useMemo(() => {
    return geoEquirectangular()
      .fitSize([800, 450], { type: 'Sphere' })
      .translate([400, 225])
      .scale(100);
  }, []);

  const pathGenerator = useMemo(() => {
    return geoPath().projection(projection);
  }, [projection]);

  const handleMouseEnter = (e: React.MouseEvent, countryName: string) => {
    setHoveredCountry(countryName);
    onCountryHover(countryName);
    
    const countryData = data.find(d => d.name === countryName);
    if (countryData) {
      const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
      setTooltip({
        x: e.clientX + 15,
        y: e.clientY - 10,
        data: countryData
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredCountry(null);
    onCountryHover(null);
    setTooltip(null);
  };

  if (isLoading || !geoData) {
    return (
      <div className="flex items-center justify-center h-[450px] bg-slate-50 rounded-xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-stone-400 text-sm">Loading country data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[450px] bg-slate-50 rounded-xl overflow-hidden">
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-10 flex items-center gap-1 px-3 py-1.5 bg-white/90 hover:bg-white rounded-lg text-sm text-stone-600 shadow-sm border border-stone-200 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Continents
      </button>

      {/* Title */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white/90 px-4 py-1.5 rounded-lg shadow-sm border border-stone-200">
        <span className="text-sm font-medium text-stone-700">
          🌍 {continentName} — Countries
        </span>
      </div>

      <svg
        viewBox="0 0 800 450"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        style={{ background: 'transparent' }}
      >
        <g transform="translate(0, 0) scale(1)">
          {geoData.features?.map((feature: any, index: number) => {
            const countryName = feature.properties?.name || feature.properties?.ADMIN;
            if (!countryName) return null;
            
            const color = getCountryColor(countryName);
            const isHovered = hoveredCountry === countryName;
            const hasData = data.some(d => d.name === countryName);
            
            let path = '';
            try {
              path = pathGenerator(feature) || '';
            } catch (e) {
              return null;
            }
            
            if (!path) return null;
            
            return (
              <path
                key={index}
                d={path}
                fill={color}
                stroke={isHovered ? '#f59e0b' : '#ffffff'}
                strokeWidth={isHovered ? 2 : 0.5}
                opacity={isHovered ? 1 : (hasData ? 0.9 : 0.4)}
                style={{
                  cursor: hasData ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => hasData && handleMouseEnter(e, countryName)}
                onMouseLeave={handleMouseLeave}
                onClick={() => hasData && onCountryClick(countryName)}
              />
            );
          })}
        </g>
      </svg>

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
            <span className="font-medium">{tooltip.data.count.toLocaleString()}</span> visitors
            <span className="ml-2 text-orange-500">
              ({tooltip.data.percentage.toFixed(1)}%)
            </span>
          </p>
          <p className="text-xs text-stone-400 mt-1 border-t border-stone-100 pt-1">
            👆 Click to explore regions
          </p>
        </div>
      )}
    </div>
  );
}
