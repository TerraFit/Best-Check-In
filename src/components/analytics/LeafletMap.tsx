// src/components/analytics/LeafletMap.tsx
import { useEffect, useRef } from 'react';
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

interface LeafletMapProps {
  data: Array<{
    name: string;
    count: number;
    percentage: number;
    lat: number;
    lng: number;
  }>;
  onCountryClick: (country: string) => void;
}

const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'South Africa': { lat: -30, lng: 25 },
  'Germany': { lat: 51, lng: 10 },
  'France': { lat: 47, lng: 2 },
  'United Kingdom': { lat: 55, lng: -3 },
  'United States': { lat: 39, lng: -98 },
  'Canada': { lat: 56, lng: -106 },
  'Brazil': { lat: -15, lng: -47 },
  'Australia': { lat: -25, lng: 134 },
  // Ajoutez plus de pays...
};

export function LeafletMap({ data, onCountryClick }: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Préparer les données avec coordonnées
  const mapData = data
    .map(item => {
      const coords = COUNTRY_COORDINATES[item.name];
      if (!coords) return null;
      return { ...item, ...coords };
    })
    .filter(Boolean);

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

  return (
    <MapContainer
      center={[20, 10]}
      zoom={2}
      style={{ height: '500px', width: '100%', borderRadius: '12px' }}
      zoomControl={false}
      ref={mapRef}
    >
      <ZoomControl position="bottomright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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
            click: () => onCountryClick(item.name),
            mouseover: (e) => e.target.openPopup(),
            mouseout: (e) => e.target.closePopup(),
          }}
        >
          <Popup>
            <div className="text-center">
              <p className="font-semibold">{item.name}</p>
              <p className="text-sm">{item.count.toLocaleString()} visiteurs</p>
              <p className="text-sm text-orange-600">{item.percentage.toFixed(1)}%</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
