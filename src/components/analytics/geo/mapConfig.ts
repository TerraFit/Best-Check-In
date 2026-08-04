/**
 * Geographic Explorer V2 configuration.
 * MAP_ENGINE: 'legacy' | 'geo' — keeps bubble maps until geo is validated live.
 */

export type MapEngine = 'legacy' | 'geo';

/** Default to geo for the new explorer; set to 'legacy' to force bubble maps. */
export const MAP_ENGINE: MapEngine =
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: { VITE_MAP_ENGINE?: string } }).env?.VITE_MAP_ENGINE === 'legacy')
    ? 'legacy'
    : 'geo';

/** Heat scale for choropleth fills (guest density). */
export const HEAT_STOPS: { max: number; color: string }[] = [
  { max: 0, color: '#e7e5e4' }, // stone-200 — no guests
  { max: 2, color: '#ffedd5' }, // orange-100
  { max: 5, color: '#fed7aa' }, // orange-200
  { max: 10, color: '#fb923c' }, // orange-400
  { max: 20, color: '#ea580c' }, // orange-600
  { max: Infinity, color: '#c2410c' }, // orange-700
];

export function heatColor(count: number): string {
  for (const stop of HEAT_STOPS) {
    if (count <= stop.max) return stop.color;
  }
  return HEAT_STOPS[HEAT_STOPS.length - 1].color;
}

/** Open style — no API key (MapLibre demo tiles / OpenFreeMap-compatible). */
export const BASEMAP_STYLE = 'https://demotiles.maplibre.org/style.json';

export const GEO_PATHS = {
  // Prefer CDN (no API key); optional local copies under /public/geo for offline
  countries110m: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
  countries50m: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json',
} as const;

/** MapLibre UMD build — no API key, loaded at runtime */
export const MAPLIBRE_JS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js';
export const MAPLIBRE_CSS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css';

/** Approximate continent camera targets [lng, lat, zoom] */
export const CONTINENT_VIEWS: Record<string, { center: [number, number]; zoom: number }> = {
  Africa: { center: [20, 5], zoom: 2.6 },
  Europe: { center: [15, 50], zoom: 3.2 },
  'North America': { center: [-100, 40], zoom: 2.4 },
  'South America': { center: [-60, -15], zoom: 2.6 },
  Asia: { center: [90, 30], zoom: 2.4 },
  Oceania: { center: [145, -25], zoom: 2.8 },
  Other: { center: [0, 20], zoom: 1.2 },
};

export const WORLD_VIEW = { center: [10, 20] as [number, number], zoom: 1.15 };
