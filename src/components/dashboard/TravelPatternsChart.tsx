// src/components/dashboard/TravelPatternsChart.tsx
import { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { findClosestCity } from '../../services/cityAutocompleteService';

interface TravelPatternsChartProps {
  bookings: any[];
}

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];

export function TravelPatternsChart({ bookings }: TravelPatternsChartProps) {
  const [view, setView] = useState<'comingFrom' | 'goingTo'>('comingFrom');

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Guest Travel Patterns</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          No data available for selected period
        </div>
      </div>
    );
  }

  // Process travel data with spelling correction
  const travelData = useMemo(() => {
    const comingFromMap: Record<string, { count: number; originalInputs: string[]; country: string }> = {};
    const goingToMap: Record<string, { count: number; originalInputs: string[]; country: string }> = {};

    bookings.forEach(booking => {
      // Coming From (arriving_from field)
      if (booking.arriving_from) {
        const input = booking.arriving_from.trim();
        if (input) {
          const suggestion = findClosestCity(input, booking.guest_country || 'South Africa');
          const cityName = suggestion?.name || input;
          const country = booking.guest_country || 'South Africa';
          
          const key = `${cityName}|${country}`;
          if (!comingFromMap[key]) {
            comingFromMap[key] = { count: 0, originalInputs: [], country };
          }
          comingFromMap[key].count++;
          if (suggestion?.isCorrection) {
            comingFromMap[key].originalInputs.push(input);
          }
        }
      }

      // Going To (next_destination field)
      if (booking.next_destination) {
        const input = booking.next_destination.trim();
        if (input) {
          const suggestion = findClosestCity(input, booking.guest_country || 'South Africa');
          const cityName = suggestion?.name || input;
          const country = booking.guest_country || 'South Africa';
          
          const key = `${cityName}|${country}`;
          if (!goingToMap[key]) {
            goingToMap[key] = { count: 0, originalInputs: [], country };
          }
          goingToMap[key].count++;
          if (suggestion?.isCorrection) {
            goingToMap[key].originalInputs.push(input);
          }
        }
      }
    });

    const comingFrom = Object.entries(comingFromMap)
      .map(([key, data]) => {
        const [city, country] = key.split('|');
        return {
          city,
          country,
          count: data.count,
          originalInputs: data.originalInputs,
          hasCorrections: data.originalInputs.length > 0
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const goingTo = Object.entries(goingToMap)
      .map(([key, data]) => {
        const [city, country] = key.split('|');
        return {
          city,
          country,
          count: data.count,
          originalInputs: data.originalInputs,
          hasCorrections: data.originalInputs.length > 0
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { comingFrom, goingTo };
  }, [bookings]);

  const currentData = view === 'comingFrom' ? travelData.comingFrom : travelData.goingTo;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-sm">
          <p className="font-semibold text-gray-900">{data.city}</p>
          <p className="text-sm text-gray-600">{data.country}</p>
          <p className="text-sm text-orange-600 font-medium">
            {data.count} guest{data.count !== 1 ? 's' : ''}
          </p>
          {data.hasCorrections && (
            <p className="text-xs text-blue-500 mt-1">
              ✨ Spelling corrected from: {data.originalInputs.join(', ')}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Guest Travel Patterns</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setView('comingFrom')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              view === 'comingFrom'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Coming From
          </button>
          <button
            onClick={() => setView('goingTo')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              view === 'goingTo'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Going To
          </button>
        </div>
      </div>

      {currentData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-400">
          No travel data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={currentData}
            layout="vertical"
            margin={{ left: 120, right: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" />
            <YAxis 
              type="category" 
              dataKey="city" 
              width={120} 
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="count" 
              fill="#f59e0b" 
              radius={[0, 8, 8, 0]}
              label={{ 
                position: 'right', 
                formatter: (value: number) => value,
                fontSize: 12
              }}
            >
              {currentData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.hasCorrections ? COLORS[index % COLORS.length] : '#f59e0b'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {currentData.some(d => d.hasCorrections) && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            ✨ Spelling corrections applied: Some city names were automatically corrected for accurate reporting.
          </p>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-400 text-center">
        {view === 'comingFrom' ? 'Where guests traveled from' : 'Where guests are going next'}
        {currentData.some(d => d.hasCorrections) && ' • ✨ = Auto-corrected spelling'}
      </div>
    </div>
  );
}
