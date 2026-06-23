// src/components/analytics/VisitorOriginMap.tsx
import { useState, useMemo } from 'react';
import { OriginData, DrillLevel, SubscriptionLimits } from '../../types/analytics';

interface VisitorOriginMapProps {
  data: OriginData[];
  drillLevel: DrillLevel;
  limits: SubscriptionLimits;
  onDrillDown: (item: OriginData) => void;
  onDrillUp: () => void;
  canDrillDeeper: (level: DrillLevel) => boolean;
  getUpgradeMessage: (feature: string) => string;
}

export function VisitorOriginMap({
  data,
  drillLevel,
  limits,
  onDrillDown,
  onDrillUp,
  canDrillDeeper,
  getUpgradeMessage
}: VisitorOriginMapProps) {
  const [hoveredItem, setHoveredItem] = useState<OriginData | null>(null);

  // Calculate max count for color scaling
  const maxCount = useMemo(() => {
    return Math.max(...data.map(d => d.count), 1);
  }, [data]);

  // Get color based on count
  const getColor = (count: number): string => {
    const intensity = Math.min(1, count / maxCount);
    if (intensity < 0.25) return '#fef3c7';
    if (intensity < 0.5) return '#fcd34d';
    if (intensity < 0.75) return '#f59e0b';
    return '#d97706';
  };

  // Get tooltip content
  const getTooltipContent = (item: OriginData): string => {
    if (drillLevel === 'world') {
      return `${item.name}: ${item.count} visitors (${item.percentage.toFixed(1)}%) - Click to view countries`;
    }
    return `${item.name}: ${item.count} visitors (${item.percentage.toFixed(1)}%)`;
  };

  // Handle click with subscription check
  const handleClick = (item: OriginData) => {
    if (item.children && canDrillDeeper('continent')) {
      onDrillDown(item);
    } else if (item.children && !canDrillDeeper('continent')) {
      // Show upgrade prompt
      const upgradeMsg = getUpgradeMessage('countries');
      alert(upgradeMsg);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
      {/* Map Header */}
      <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-stone-900">Visitor Origin Explorer</h3>
          <p className="text-xs text-stone-400">
            {drillLevel === 'world' && 'World overview'}
            {drillLevel === 'continent' && 'Continent view'}
            {drillLevel === 'country' && 'Country view'}
            {drillLevel === 'region' && 'Region view'}
            {drillLevel === 'city' && 'City view'}
          </p>
        </div>
        
        {/* Breadcrumb Navigation */}
        {(drillLevel !== 'world') && (
          <button
            onClick={onDrillUp}
            className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        )}
      </div>

      {/* Map Grid */}
      <div className="p-6">
        {data.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-stone-400">
            No data available for the selected period
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.map((item) => {
              const color = getColor(item.count);
              const isClickable = item.children && item.children.length > 0;
              
              return (
                <div
                  key={item.name}
                  className={`
                    relative p-4 rounded-xl border-2 transition-all cursor-pointer
                    ${isClickable ? 'hover:shadow-lg hover:scale-105' : ''}
                    ${hoveredItem?.name === item.name ? 'shadow-lg scale-105 border-orange-400' : 'border-stone-200'}
                  `}
                  style={{ backgroundColor: color + '30' }}
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => handleClick(item)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-900 text-sm truncate" title={item.name}>
                        {item.name}
                      </p>
                      {item.code && (
                        <p className="text-xs text-stone-500">{item.code}</p>
                      )}
                    </div>
                    {item.children && item.children.length > 0 && (
                      <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                  
                  <div className="mt-3 flex items-end justify-between">
                    <span className="text-2xl font-bold text-stone-900">{item.count}</span>
                    <span className="text-sm text-stone-500">{item.percentage.toFixed(1)}%</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-2 w-full h-1 bg-stone-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${(item.count / maxCount) * 100}%`,
                        backgroundColor: color 
                      }}
                    />
                  </div>

                  {/* Tooltip on hover */}
                  {hoveredItem?.name === item.name && (
                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-stone-900 text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap z-10 shadow-lg">
                      {getTooltipContent(item)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <span>Visitor density:</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 rounded bg-amber-100"></div>
              <div className="w-4 h-2 rounded bg-amber-300"></div>
              <div className="w-4 h-2 rounded bg-amber-500"></div>
              <div className="w-4 h-2 rounded bg-amber-700"></div>
            </div>
            <span>Low → High</span>
          </div>
          
          {data.length > 0 && (
            <span>{data.length} regions displayed</span>
          )}
        </div>

        {/* Upgrade preview for locked drill-down */}
        {drillLevel === 'world' && !limits.canViewCountries && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-sm text-amber-800">
                🔒 {getUpgradeMessage('countries')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
