// src/components/analytics/VisitorOriginMap.tsx
import { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface VisitorOriginMapProps {
  data: any[];
  drillLevel: string;
  limits: any;
  onDrillDown: (item: any) => void;
  onDrillUp: () => void;
  canDrillDeeper: (level: string) => boolean;
  getUpgradeMessage: (feature: string) => string;
  isLoading: boolean;
}

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];

// Country coordinates for the map
const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'South Africa': { lat: -30, lng: 25 },
  'Namibia': { lat: -22, lng: 17 },
  'Botswana': { lat: -22, lng: 24 },
  'Zimbabwe': { lat: -19, lng: 30 },
  'Mozambique': { lat: -18, lng: 35 },
  'Lesotho': { lat: -29, lng: 28 },
  'Eswatini': { lat: -26, lng: 31 },
  'Zambia': { lat: -15, lng: 28 },
  'Angola': { lat: -12, lng: 18 },
  'Malawi': { lat: -13, lng: 34 },
  'Tanzania': { lat: -6, lng: 35 },
  'Kenya': { lat: -1, lng: 38 },
  'Nigeria': { lat: 9, lng: 8 },
  'Ghana': { lat: 8, lng: -1 },
  'Egypt': { lat: 26, lng: 30 },
  'Morocco': { lat: 31, lng: -7 },
  'Germany': { lat: 51, lng: 10 },
  'France': { lat: 47, lng: 2 },
  'United Kingdom': { lat: 55, lng: -3 },
  'Italy': { lat: 42, lng: 12 },
  'Spain': { lat: 40, lng: -3 },
  'Netherlands': { lat: 52, lng: 5 },
  'Switzerland': { lat: 47, lng: 8 },
  'Austria': { lat: 47, lng: 13 },
  'Belgium': { lat: 50, lng: 4 },
  'Portugal': { lat: 39, lng: -8 },
  'Sweden': { lat: 60, lng: 18 },
  'Norway': { lat: 61, lng: 8 },
  'Denmark': { lat: 56, lng: 10 },
  'Finland': { lat: 64, lng: 26 },
  'Greece': { lat: 39, lng: 22 },
  'Ireland': { lat: 53, lng: -8 },
  'Poland': { lat: 52, lng: 19 },
  'Czech Republic': { lat: 49, lng: 15 },
  'Hungary': { lat: 47, lng: 19 },
  'Romania': { lat: 46, lng: 25 },
  'Bulgaria': { lat: 43, lng: 25 },
  'Croatia': { lat: 45, lng: 16 },
  'Russia': { lat: 64, lng: 100 },
  'Ukraine': { lat: 49, lng: 32 },
  'United States': { lat: 39, lng: -98 },
  'Canada': { lat: 56, lng: -106 },
  'Mexico': { lat: 23, lng: -102 },
  'Brazil': { lat: -15, lng: -47 },
  'Argentina': { lat: -35, lng: -64 },
  'Chile': { lat: -30, lng: -71 },
  'Colombia': { lat: 4, lng: -73 },
  'Peru': { lat: -9, lng: -75 },
  'Venezuela': { lat: 7, lng: -66 },
  'China': { lat: 35, lng: 104 },
  'India': { lat: 20, lng: 78 },
  'Japan': { lat: 36, lng: 138 },
  'South Korea': { lat: 36, lng: 128 },
  'Singapore': { lat: 1, lng: 104 },
  'Malaysia': { lat: 4, lng: 102 },
  'Indonesia': { lat: -5, lng: 120 },
  'Thailand': { lat: 15, lng: 101 },
  'Vietnam': { lat: 16, lng: 108 },
  'Philippines': { lat: 13, lng: 122 },
  'Saudi Arabia': { lat: 24, lng: 45 },
  'United Arab Emirates': { lat: 24, lng: 54 },
  'Israel': { lat: 31, lng: 35 },
  'Turkey': { lat: 39, lng: 35 },
  'Australia': { lat: -25, lng: 134 },
  'New Zealand': { lat: -40, lng: 174 },
  'Fiji': { lat: -17, lng: 179 }
};

export function VisitorOriginMap({
  data,
  drillLevel,
  limits,
  onDrillDown,
  onDrillUp,
  canDrillDeeper,
  getUpgradeMessage,
  isLoading
}: VisitorOriginMapProps) {
  const [chartType, setChartType] = useState<'map' | 'bar' | 'pie'>('map');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Prepare map data with coordinates
  const mapData = data
    .map(item => {
      const coords = COUNTRY_COORDINATES[item.name];
      if (!coords) return null;
      return {
        ...item,
        lat: coords.lat,
        lng: coords.lng
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.count - a.count);

  const maxCount = mapData[0]?.count || 1;

  const getColor = (count: number): string => {
    const ratio = count / maxCount;
    if (ratio < 0.2) return '#fef3c7';
    if (ratio < 0.4) return '#fde68a';
    if (ratio < 0.6) return '#fcd34d';
    if (ratio < 0.8) return '#f59e0b';
    return '#d97706';
  };

  const getRadius = (count: number): number => {
    return Math.max(8, Math.min(40, (count / maxCount) * 35));
  };

  const handleMapClick = (item: any) => {
    if (item.children && canDrillDeeper('continent')) {
      onDrillDown(item);
    } else if (item.children && !canDrillDeeper('continent')) {
      const upgradeMsg = getUpgradeMessage('countries');
      alert(upgradeMsg);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{item.name}</p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{item.count.toLocaleString()}</span> visitors
          </p>
          <p className="text-sm text-orange-600 font-medium">
            {item.percentage.toFixed(1)}%
          </p>
          {item.children && canDrillDeeper('continent') && (
            <p className="text-xs text-stone-400 mt-1">Click to explore</p>
          )}
          {item.children && !canDrillDeeper('continent') && (
            <p className="text-xs text-amber-500 mt-1">🔒 Upgrade to explore</p>
          )}
        </div>
      );
    }
    return null;
  };

  const handleChartClick = (item: any) => {
    if (item.children && canDrillDeeper('continent')) {
      onDrillDown(item);
    } else if (item.children && !canDrillDeeper('continent')) {
      const upgradeMsg = getUpgradeMessage('countries');
      alert(upgradeMsg);
    }
  };

  if (isLoading || !data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-stone-400">Loading visitor data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-stone-900 flex items-center gap-2">
            <span className="text-2xl">🌍</span>
            Visitor Origin Explorer
          </h3>
          <p className="text-xs text-stone-400">
            {drillLevel === 'world' && 'Global view - Click to drill down'}
            {drillLevel === 'continent' && 'Continent view'}
            {drillLevel === 'country' && 'Country view'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Chart Type Toggle */}
          <div className="flex bg-stone-100 rounded-lg p-0.5">
            <button
              onClick={() => setChartType('map')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                chartType === 'map' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Map
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                chartType === 'bar' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Bar
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                chartType === 'pie' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Pie
            </button>
          </div>

          {/* Drill Up Button */}
          {drillLevel !== 'world' && (
            <button
              onClick={onDrillUp}
              className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-sm text-stone-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          )}
        </div>
      </div>

      {/* Chart / Map */}
      <div className="p-6">
        {chartType === 'map' ? (
          <div className="relative w-full h-[450px] rounded-xl overflow-hidden shadow-inner">
            <MapContainer
              center={[20, 10]}
              zoom={2}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <ZoomControl position="bottomright" />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {mapData.map((item, index) => (
                <CircleMarker
                  key={index}
                  center={[item.lat, item.lng]}
                  radius={getRadius(item.count)}
                  fillColor={getColor(item.count)}
                  color="#fff"
                  weight={2}
                  opacity={1}
                  fillOpacity={0.8}
                  eventHandlers={{
                    click: () => handleMapClick(item),
                    mouseover: (e) => e.target.openPopup(),
                    mouseout: (e) => e.target.closePopup(),
                  }}
                >
                  <Popup>
                    <div className="text-center min-w-[120px]">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.count.toLocaleString()} visitors</p>
                      <p className="text-sm text-orange-600 font-medium">{item.percentage.toFixed(1)}%</p>
                      {item.children && canDrillDeeper('continent') && (
                        <p className="text-xs text-stone-400 mt-1">👆 Click to explore</p>
                      )}
                      {item.children && !canDrillDeeper('continent') && (
                        <p className="text-xs text-amber-500 mt-1">🔒 Upgrade to explore</p>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-white/90 px-3 py-1.5 rounded-lg shadow-sm text-xs">
              <span className="text-stone-500">Low</span>
              <div className="flex gap-0.5">
                <div className="w-5 h-2 rounded" style={{ backgroundColor: '#fef3c7' }} />
                <div className="w-5 h-2 rounded" style={{ backgroundColor: '#fde68a' }} />
                <div className="w-5 h-2 rounded" style={{ backgroundColor: '#fcd34d' }} />
                <div className="w-5 h-2 rounded" style={{ backgroundColor: '#f59e0b' }} />
                <div className="w-5 h-2 rounded" style={{ backgroundColor: '#d97706' }} />
              </div>
              <span className="text-stone-500">High</span>
            </div>

            {/* Country Count */}
            <div className="absolute bottom-4 right-4 bg-white/90 px-3 py-1.5 rounded-lg shadow-sm text-xs text-stone-500">
              {mapData.length} countries represented
            </div>
          </div>
        ) : chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height={450}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 120, right: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={120} 
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="count" 
                fill="#f59e0b" 
                radius={[0, 8, 8, 0]}
                onClick={handleChartClick}
                cursor="pointer"
                label={{ 
                  position: 'right', 
                  formatter: (value: number) => value.toLocaleString(),
                  fontSize: 11
                }}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    onMouseEnter={() => setHoveredItem(entry.name)}
                    onMouseLeave={() => setHoveredItem(null)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={450}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={140}
                paddingAngle={2}
                dataKey="count"
                label={({ name, percent }) => percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
                labelLine={false}
                onClick={handleChartClick}
                cursor="pointer"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    onMouseEnter={() => setHoveredItem(entry.name)}
                    onMouseLeave={() => setHoveredItem(null)}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}

        {/* Stats Footer */}
        <div className="mt-4 pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-6 text-sm">
            <span className="text-stone-500">
              Total: <span className="font-semibold text-stone-900">
                {data.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
              </span> visitors
            </span>
            <span className="text-stone-500">
              Regions: <span className="font-semibold text-stone-900">{data.length}</span>
            </span>
            <span className="text-stone-500">
              Top: <span className="font-semibold text-stone-900">{data[0]?.name || 'N/A'}</span>
            </span>
          </div>
          
          <div className="text-xs text-stone-400">
            {chartType === 'map' && '🌍 Click a circle to explore'}
            {chartType === 'bar' && '📊 Click a bar to explore'}
            {chartType === 'pie' && '🍩 Click a slice to explore'}
          </div>
        </div>

        {/* Subscription Upgrade Notice */}
        {drillLevel === 'world' && !limits.canViewCountries && data.some(d => d.children) && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Upgrade to Growth to explore continent-level data</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
