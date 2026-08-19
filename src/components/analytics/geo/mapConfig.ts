/**
 * Geographic Explorer V2 configuration.
 */

export type MapEngine = 'legacy' | 'geo';

export const MAP_ENGINE: MapEngine =
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: { VITE_MAP_ENGINE?: string } }).env?.VITE_MAP_ENGINE === 'legacy')
    ? 'legacy'
    : 'geo';

export const HEAT_STOPS: { max: number; color: string }[] = [
  { max: 0, color: '#e7e5e4' },
  { max: 2, color: '#ffedd5' },
  { max: 5, color: '#fed7aa' },
  { max: 10, color: '#fb923c' },
  { max: 20, color: '#ea580c' },
  { max: Infinity, color: '#c2410c' },
];

export function heatColor(count: number): string {
  for (const stop of HEAT_STOPS) if (count <= stop.max) return stop.color;
  return HEAT_STOPS[HEAT_STOPS.length - 1].color;
}

export const BASEMAP_STYLE = 'https://demotiles.maplibre.org/style.json';

export const GEO_PATHS = {
  // Natural Earth admin-0 carries reliable CONTINENT attributes. It is used
  // only for the world/continent view; country drill-down continues to use
  // the existing world-atlas geometry and matching logic.
  world110m: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',
  countries110m: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
  countries50m: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json',
  // Natural Earth Admin-1: first-order administrative boundaries worldwide.
  // Includes provinces, states, regions, cantons, territories, etc.
  admin1: 'https://raw.githubusercontent.com/datasets/geo-ne-admin1/main/data/admin1.geojson',
} as const;

export const MAPLIBRE_JS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js';
export const MAPLIBRE_CSS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css';

export const CONTINENT_VIEWS: Record<string, { center: [number, number]; zoom: number }> = {
  // Keep enough vertical margin to show the Mediterranean and Cape without clipping.
  Africa: { center: [20, 2], zoom: 1.72 },
  Europe: { center: [15, 50], zoom: 3.2 },
  'North America': { center: [-100, 40], zoom: 2.4 },
  'South America': { center: [-60, -15], zoom: 2.6 },
  Asia: { center: [90, 30], zoom: 2.4 },
  Oceania: { center: [145, -25], zoom: 2.8 },
  Other: { center: [0, 20], zoom: 1.2 },
};

export const WORLD_VIEW = { center: [10, 20] as [number, number], zoom: 1.15 };
