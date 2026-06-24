// src/components/analytics/WorldMapChart.tsx
import { useState, useMemo } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell } from 'recharts';

interface WorldMapChartProps {
  data: Array<{
    name: string;
    count: number;
    percentage: number;
    lat: number;
    lng: number;
  }>;
  onCountryClick: (country: string) => void;
  isLoading: boolean;
}

// Coordonnées approximatives des pays (simplifiées)
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

const COLORS = ['#fef3c7', '#fde68a', '#fcd34d', '#f59e0b', '#d97706'];

export function WorldMapChart({ data, onCountryClick, isLoading }: WorldMapChartProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  // Préparer les données avec les coordonnées
  const chartData = useMemo(() => {
    return data
      .map(item => {
        const coords = COUNTRY_COORDINATES[item.name];
        if (!coords) return null;
        return {
          ...item,
          lat: coords.lat,
          lng: coords.lng,
          // Normaliser la taille pour le scatter
          size: Math.max(5, Math.min(60, (item.count / (data[0]?.count || 1)) * 50))
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.count - a.count);
  }, [data]);

  if (isLoading || chartData.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-stone-400">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  // Trouver la valeur max pour l'échelle de couleur
  const maxCount = chartData[0]?.count || 1;

  const getColor = (count: number): string => {
    const ratio = count / maxCount;
    if (ratio < 0.2) return COLORS[0];
    if (ratio < 0.4) return COLORS[1];
    if (ratio < 0.6) return COLORS[2];
    if (ratio < 0.8) return COLORS[3];
    return COLORS[4];
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{item.name}</p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{item.count.toLocaleString()}</span> visiteurs
          </p>
          <p className="text-sm text-orange-600 font-medium">
            {item.percentage.toFixed(1)}%
          </p>
          <p className="text-xs text-stone-400 mt-1">Cliquez pour explorer</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative w-full h-[500px] bg-gradient-to-br from-slate-50 to-stone-100 rounded-xl overflow-hidden">
      {/* Fond de carte simplifié */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <svg viewBox="0 0 800 400" className="w-full h-full">
          <ellipse cx="400" cy="200" rx="350" ry="180" fill="none" stroke="#000" strokeWidth="0.5"/>
          <ellipse cx="400" cy="200" rx="280" ry="140" fill="none" stroke="#000" strokeWidth="0.3"/>
          <ellipse cx="400" cy="200" rx="200" ry="100" fill="none" stroke="#000" strokeWidth="0.3"/>
          <line x1="50" y1="200" x2="750" y2="200" stroke="#000" strokeWidth="0.3"/>
          <line x1="400" y1="20" x2="400" y2="380" stroke="#000" strokeWidth="0.3"/>
        </svg>
      </div>

      {/* Points sur la carte */}
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <XAxis 
            type="number" 
            dataKey="lng" 
            domain={[-180, 180]} 
            hide 
          />
          <YAxis 
            type="number" 
            dataKey="lat" 
            domain={[-90, 90]} 
            hide 
          />
          <ZAxis type="number" dataKey="size" range={[10, 80]} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter
            data={chartData}
            onClick={(data) => onCountryClick(data.name)}
            onMouseEnter={(data) => setHoveredCountry(data.name)}
            onMouseLeave={() => setHoveredCountry(null)}
            cursor="pointer"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={getColor(entry.count)}
                stroke="#fff"
                strokeWidth={2}
                opacity={hoveredCountry && hoveredCountry !== entry.name ? 0.5 : 1}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Légende */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-white/90 px-3 py-1.5 rounded-lg shadow-sm text-xs">
        <span className="text-stone-500">Faible</span>
        <div className="flex gap-0.5">
          {COLORS.map((color, i) => (
            <div key={i} className="w-5 h-2 rounded" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span className="text-stone-500">Élevé</span>
      </div>

      {/* Compteur de pays */}
      <div className="absolute bottom-4 right-4 bg-white/90 px-3 py-1.5 rounded-lg shadow-sm text-xs text-stone-500">
        {chartData.length} pays représentés
      </div>

      {/* Message d'absence de données */}
      {chartData.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-stone-400">
          Aucune donnée de visiteurs disponible
        </div>
      )}
    </div>
  );
}
