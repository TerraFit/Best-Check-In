/**
 * Runtime MapLibre loader (CDN UMD — no API key, no npm install required).
 */

import { MAPLIBRE_JS, MAPLIBRE_CSS } from './mapConfig';

export type MapLibreMap = {
  on: (event: string, ...args: unknown[]) => void;
  off: (event: string, ...args: unknown[]) => void;
  remove: () => void;
  resize: () => void;
  isStyleLoaded: () => boolean;
  getSource: (id: string) => { setData?: (data: unknown) => void } | undefined;
  addSource: (id: string, source: unknown) => void;
  addLayer: (layer: unknown) => void;
  getLayer: (id: string) => unknown;
  setPaintProperty: (layer: string, prop: string, value: unknown) => void;
  setFilter: (layer: string, filter: unknown) => void;
  flyTo: (opts: Record<string, unknown>) => void;
  fitBounds: (bounds: number[][], opts?: Record<string, unknown>) => void;
  getCanvas: () => HTMLCanvasElement;
  getCenter?: () => { lng: number; lat: number };
  getZoom?: () => number;
  getBearing?: () => number;
  getPitch?: () => number;
  loaded: () => boolean;
  addControl?: (control: unknown, position?: string) => void;
};

declare global {
  interface Window {
    maplibregl?: {
      Map: new (opts: Record<string, unknown>) => MapLibreMap;
      NavigationControl: new (opts?: Record<string, unknown>) => unknown;
    };
  }
}

let maplibreLoader: Promise<NonNullable<typeof window.maplibregl>> | null = null;

export function loadMapLibre(): Promise<NonNullable<typeof window.maplibregl>> {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (maplibreLoader) return maplibreLoader;
  maplibreLoader = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-maplibre-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = MAPLIBRE_CSS;
      link.setAttribute('data-maplibre-css', '1');
      document.head.appendChild(link);
    }
    const existing = document.querySelector('script[data-maplibre-js]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.maplibregl) resolve(window.maplibregl);
        else reject(new Error('MapLibre failed to load'));
      });
      return;
    }
    const script = document.createElement('script');
    script.src = MAPLIBRE_JS;
    script.async = true;
    script.setAttribute('data-maplibre-js', '1');
    script.onload = () => {
      if (window.maplibregl) resolve(window.maplibregl);
      else reject(new Error('MapLibre global missing'));
    };
    script.onerror = () => reject(new Error('MapLibre script error'));
    document.head.appendChild(script);
  });
  return maplibreLoader;
}
