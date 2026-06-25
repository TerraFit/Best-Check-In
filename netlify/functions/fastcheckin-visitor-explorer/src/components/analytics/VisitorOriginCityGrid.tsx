import { useState, useMemo } from 'react';
import { Award, Compass, HelpCircle, ArrowLeft, Building2 } from 'lucide-react';

interface CityData {
  name: string;
  count: number;
  percentage: number;
}

interface VisitorOriginCityGridProps {
  data: any[];
  regionName: string;
  onBack: () => void;
  isLoading: boolean;
}

export function VisitorOriginCityGrid({
  data,
  regionName,
  onBack,
  isLoading
}: VisitorOriginCityGridProps) {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  // Group filtered records to count visitors per city
  const cityList = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const cityMap: Record<string, number> = {};
    data.forEach(item => {
      const city = item.city || item.town;
      if (city) {
        cityMap[city] = (cityMap[city] || 0) + (item.count || 1);
      }
    });

    const total = Object.values(cityMap).reduce((sum, c) => sum + c, 0) || 1;

    return Object.entries(cityMap).map(([name, count]) => ({
      name,
      count,
      percentage: (count / total) * 100,
    })).sort((a, b) => b.count - a.count);
  }, [data]);

  const total = useMemo(() => {
    return cityList.reduce((sum, c) => sum + c.count, 0);
  }, [cityList]);

  const maxCount = useMemo(() => {
    if (cityList.length === 0) return 1;
    return Math.max(...cityList.map(c => c.count), 1);
  }, [cityList]);

  const getBarWidth = (count: number): string => {
    return `${Math.max(4, (count / maxCount) * 100)}%`;
  };

  const getBarColor = (index: number): string => {
    if (index === 0) return 'from-orange-500 to-amber-500'; // Brand hero color
    if (index === 1) return 'from-orange-400 to-amber-400';
    if (index === 2) return 'from-orange-300 to-amber-300';
    return 'from-stone-400 to-stone-500'; // Minor levels
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[450px] bg-gradient-to-b from-stone-50 to-stone-100/50 rounded-2xl border border-stone-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-stone-400 text-sm font-medium">Loading city breakdown...</p>
        </div>
      </div>
    );
  }

  if (cityList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[450px] bg-gradient-to-b from-stone-50 to-stone-100/50 rounded-2xl border border-stone-200 p-8 text-center">
        <Building2 size={48} className="text-stone-300 mb-3" />
        <h3 className="text-base font-bold text-stone-700">No city details loaded</h3>
        <p className="text-stone-400 text-xs mt-1 max-w-sm">
          No city records were linked to {regionName} in this dataset.
        </p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-all border border-stone-200"
        >
          ← Back to Regions
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-[450px] bg-gradient-to-b from-stone-50 to-stone-100/50 rounded-2xl border border-stone-200 p-6">
      {/* Navigation action */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-200/60">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 rounded-lg text-xs font-semibold shadow-sm border border-stone-200 transition-all"
        >
          <ArrowLeft size={14} /> Back to Regions
        </button>
        
        <div className="bg-stone-900 text-white px-3 py-1 rounded-lg text-xs font-mono shadow-md">
          REGION_LEVEL: <span className="text-orange-400 font-bold">CITIES ({regionName.toUpperCase()})</span>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-2 bg-orange-100 rounded-xl text-orange-600 mb-2">
          <Building2 size={20} />
        </div>
        <h3 className="text-lg font-bold text-stone-900 tracking-tight">
          Cities in {regionName}
        </h3>
        <p className="text-xs text-stone-500 max-w-md mx-auto mt-0.5">
          Dynamic rank chart showing exact check-in volume. Select coordinates and explore the geographic density of your check-ins.
        </p>
      </div>

      {/* Main Bar Grid */}
      <div className="space-y-4 max-w-2xl mx-auto">
        {cityList.map((city, index) => {
          const isHovered = hoveredCity === city.name;
          const barWidth = getBarWidth(city.count);
          const barColor = getBarColor(index);

          return (
            <div
              key={city.name}
              className="relative"
              onMouseEnter={() => setHoveredCity(city.name)}
              onMouseLeave={() => setHoveredCity(null)}
            >
              <div className="flex items-center gap-3">
                {/* Ranking Tag */}
                <div className="w-8 flex items-center justify-center">
                  {index < 3 ? (
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600">
                      <Award size={12} className="stroke-[3]" />
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-stone-400 font-mono">
                      #{index + 1}
                    </span>
                  )}
                </div>

                {/* City name */}
                <div className="w-28 text-right truncate">
                  <span className={`text-xs font-semibold ${isHovered ? 'text-orange-600 font-bold' : 'text-stone-700'}`}>
                    {city.name}
                  </span>
                </div>

                {/* Dynamic animated progress bar */}
                <div className="flex-1 h-7 bg-stone-200/60 rounded-lg overflow-hidden shadow-inner relative flex items-center">
                  <div
                    className={`h-full bg-gradient-to-r ${barColor} rounded-r-md transition-all duration-700 ease-out flex items-center justify-end px-3`}
                    style={{ width: barWidth }}
                  >
                    <span className="text-[10px] font-extrabold text-white font-mono text-shadow select-none">
                      {city.count}
                    </span>
                  </div>
                </div>

                {/* Percentage distribution */}
                <div className="w-14 text-left">
                  <span className="text-[11px] font-bold text-stone-400 font-mono">
                    {city.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Tooltip hint showing checked-in guests */}
              {isHovered && (
                <div className="absolute left-1/2 -top-10 transform -translate-x-1/2 bg-stone-900 text-white px-3 py-1.5 rounded-lg shadow-xl text-[11px] font-medium border border-stone-800 z-10 whitespace-nowrap pointer-events-none">
                  📍 <strong className="text-orange-400">{city.name}</strong> has <strong className="font-mono text-white">{city.count}</strong> visitors ({city.percentage.toFixed(1)}% of province)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Metrics */}
      <div className="mt-8 pt-4 border-t border-stone-200/60 max-w-2xl mx-auto flex items-center justify-between text-xs text-stone-400 font-mono">
        <span>TOTAL_CHECKINS: <strong className="text-stone-700 font-bold">{total}</strong></span>
        <span>CITIES_FOUND: <strong className="text-stone-700 font-bold">{cityList.length}</strong></span>
        <span className="truncate max-w-[160px]">LEADER: <strong className="text-orange-600 font-bold font-sans">{cityList[0]?.name || 'N/A'}</strong></span>
      </div>
    </div>
  );
}
