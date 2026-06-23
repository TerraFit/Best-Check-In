// src/components/analytics/TravelPatternsCard.tsx
import { useState } from 'react';
import { TravelPattern } from '../../types/analytics';

interface TravelPatternsCardProps {
  arrivingFrom: TravelPattern[];
  goingTo: TravelPattern[];
  isLoading: boolean;
  title: string;
}

export function TravelPatternsCard({ arrivingFrom, goingTo, isLoading, title }: TravelPatternsCardProps) {
  const [view, setView] = useState<'arrivingFrom' | 'goingTo'>('arrivingFrom');

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-stone-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 bg-stone-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentData = view === 'arrivingFrom' ? arrivingFrom : goingTo;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setView('arrivingFrom')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                view === 'arrivingFrom'
                  ? 'bg-orange-500 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Arriving From
            </button>
            <button
              onClick={() => setView('goingTo')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                view === 'goingTo'
                  ? 'bg-orange-500 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Going To
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {currentData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-stone-400">
            No travel data available
          </div>
        ) : (
          <div className="space-y-3">
            {currentData.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-8 text-center">
                  <span className="text-sm font-semibold text-stone-400">#{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-stone-900 text-sm truncate">
                        {item.location}
                        {item.isCorrection && (
                          <span className="ml-2 text-xs text-blue-500">✨</span>
                        )}
                      </p>
                      <p className="text-xs text-stone-400">{item.country}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-stone-900">{item.count}</span>
                      <span className="text-xs text-stone-400 ml-1">({item.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="mt-1 w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-500"
                      style={{ width: `${Math.min(100, item.percentage * 2)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {currentData.some(d => d.isCorrection) && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              ✨ Spelling corrections applied: Some city names were automatically corrected for accurate reporting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
