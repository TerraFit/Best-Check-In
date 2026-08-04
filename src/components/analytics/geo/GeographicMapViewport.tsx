/**
 * Geographic Explorer V2 — MapLibre GL + static GeoJSON/TopoJSON.
 * Single map instance; layers update on drill-down. No API keys.
 *
 * TEMP: pipeline instrumentation (STEP 1–12) — remove after diagnosis.
 */

import { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react';
import {
  BASEMAP_STYLE,
  CONTINENT_VIEWS,
  WORLD_VIEW,
  heatColor,
} from './mapConfig';
import { loadCountries110m, loadCountries50m, featureCountryName } from './loadGeo';
import { findNodeForFeature, canonicalCountryName } from './nameMatch';
import { loadMapLibre, type MapLibreMap } from './maplibreLoader';

export type GeoLevel = 'world' | 'continents' | 'countries' | 'regions' | 'cities';

export type GeoNode = {
  name: string;
  count: number;
  percentage: number;
  intensity?: number;
};

type HoverInfo = {
  name: string;
  count: number;
  percentage: number;
  x: number;
  y: number;
};

export type GeographicMapViewportProps = {
  level: GeoLevel;
  nodes: GeoNode[];
  selectedContinent: string | null;
  selectedCountry: string | null;
  selectedRegion: string | null;
  isLoading?: boolean;
  interactive?: boolean;
  onContinentClick?: (continent: string) => void;
  onCountryClick?: (country: string) => void;
  onRegionClick?: (region: string) => void;
  onCityClick?: (city: string) => void;
  continentOfCountry?: (country: string) => string;
};

const SOURCE_ID = 'analytics-countries';
const FILL_LAYER = 'analytics-countries-fill';
const LINE_LAYER = 'analytics-countries-line';
const CONTINENT_NAMES = new Set([
  'Africa', 'Europe', 'North America', 'South America', 'Asia', 'Oceania', 'Other',
]);

function GeographicMapViewportInner({
  level,
  nodes,
  selectedContinent,
  selectedCountry,
  isLoading = false,
  interactive = true,
  onContinentClick,
  onCountryClick,
  onRegionClick,
  onCityClick,
  continentOfCountry,
}: GeographicMapViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [provinceUnavailable, setProvinceUnavailable] = useState(false);

  const nodeByCanonical = useMemo(() => {
    const m = new Map<string, GeoNode>();
    nodes.forEach((n) => m.set(canonicalCountryName(n.name).toLowerCase(), n));
    return m;
  }, [nodes]);

  const getContinent = useCallback(
    (country: string) => (continentOfCountry ? continentOfCountry(country) : 'Other'),
    [continentOfCountry]
  );

  useEffect(() => {
    console.log('STEP 1 - component mounted');
    let cancelled = false;
    let ro: ResizeObserver | null = null;

    (async () => {
      try {
        const maplibregl = await loadMapLibre();
        if (cancelled || !containerRef.current) return;

        console.log('STEP 2 - creating map');
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: BASEMAP_STYLE,
          center: WORLD_VIEW.center,
          zoom: WORLD_VIEW.zoom,
          attributionControl: true,
        }) as unknown as MapLibreMap;

        try {
          if (map.addControl && maplibregl.NavigationControl) {
            map.addControl(new maplibregl.NavigationControl({ showCompass: false }));
          }
        } catch {
          /* optional */
        }

        map.on('load', async () => {
          console.log('STEP 3 - style loaded');
          if (cancelled) return;
          try {
            console.log('STEP 4 - loading countries');
            const fc = await loadCountries110m();
            console.log('STEP 5 - feature count', fc.features.length);

            const enriched = {
              type: 'FeatureCollection' as const,
              features: fc.features.map((f, i) => {
                const name = featureCountryName(
                  f.properties || {},
                  f.id ?? (f.properties as { id?: string })?.id
                );
                return {
                  ...f,
                  id: f.id ?? i,
                  properties: {
                    ...f.properties,
                    name,
                    count: 0,
                    percentage: 0,
                    hasGuests: false,
                    fillColor: heatColor(0),
                  },
                };
              }),
            };

            console.log('STEP 5b - first feature geometry', enriched.features[0]?.geometry?.type);
            console.log('STEP 5c - first feature properties', enriched.features[0]?.properties);

            if (!map.getSource(SOURCE_ID)) {
              console.log('STEP 6 - addSource');
              map.addSource(SOURCE_ID, { type: 'geojson', data: enriched });
              console.log('STEP 7 - source added');
              const srcAfter = map.getSource(SOURCE_ID) as {
                _data?: { features?: unknown[] };
                serialize?: () => unknown;
              } | undefined;
              console.log('STEP 7b - getSource after add', !!srcAfter);
              console.log('STEP 7c - source feature count', enriched.features.length);
            }
            if (!map.getLayer(FILL_LAYER)) {
              console.log('STEP 8 - add fill layer');
              map.addLayer({
                id: FILL_LAYER,
                type: 'fill',
                source: SOURCE_ID,
                paint: {
                  'fill-color': [
                    'case',
                    ['==', ['get', 'hasGuests'], true],
                    ['get', 'fillColor'],
                    '#e7e5e4',
                  ],
                  'fill-opacity': 0.82,
                },
              });
              console.log('STEP 9 - fill layer added');
            }
            if (!map.getLayer(LINE_LAYER)) {
              console.log('STEP 10 - add line layer');
              map.addLayer({
                id: LINE_LAYER,
                type: 'line',
                source: SOURCE_ID,
                paint: {
                  'line-color': '#a8a29e',
                  'line-width': 0.6,
                  'line-opacity': 0.7,
                },
              });
              console.log('STEP 11 - line layer added');
            }

            // PHASE 2–6 diagnostics
            try {
              const anyMap = map as unknown as {
                isStyleLoaded?: () => boolean;
                getStyle?: () => { layers?: unknown[] };
                getSource?: (id: string) => unknown;
                getLayoutProperty?: (layer: string, prop: string) => unknown;
                getPaintProperty?: (layer: string, prop: string) => unknown;
                queryRenderedFeatures?: () => unknown[];
                getCanvas?: () => HTMLCanvasElement;
                getBounds?: () => { toArray?: () => unknown };
              };
              console.log('PHASE2 isStyleLoaded', anyMap.isStyleLoaded?.());
              console.log('PHASE2 layers.length', anyMap.getStyle?.()?.layers?.length);
              console.log('PHASE2 getSource', anyMap.getSource?.(SOURCE_ID));
              console.log(
                'PHASE4 visibility',
                anyMap.getLayoutProperty?.(FILL_LAYER, 'visibility')
              );
              console.log(
                'PHASE4 fill-opacity',
                anyMap.getPaintProperty?.(FILL_LAYER, 'fill-opacity')
              );
              console.log(
                'PHASE4 fill-color',
                anyMap.getPaintProperty?.(FILL_LAYER, 'fill-color')
              );
              const canvas = anyMap.getCanvas?.();
              console.log('PHASE6 canvas width', canvas?.width);
              console.log('PHASE6 canvas height', canvas?.height);
              console.log('PHASE6 devicePixelRatio', typeof window !== 'undefined' ? window.devicePixelRatio : undefined);
              console.log('PHASE6 bounds', anyMap.getBounds?.()?.toArray?.() ?? anyMap.getBounds?.());

              // queryRenderedFeatures after a short settle
              setTimeout(() => {
                try {
                  const rendered = anyMap.queryRenderedFeatures?.() ?? [];
                  console.log('PHASE5 queryRenderedFeatures count', rendered.length);
                  const fillRendered =
                    anyMap.queryRenderedFeatures?.({ layers: [FILL_LAYER] } as never) ??
                    [];
                  console.log('PHASE5 fill-layer rendered count', (fillRendered as unknown[]).length);
                } catch (qe) {
                  console.log('PHASE5 queryRenderedFeatures error', qe);
                }
              }, 800);
            } catch (diagErr) {
              console.log('PHASE diagnostics error', diagErr);
            }

            console.log('STEP 12 - map ready');
            setMapReady(true);
            setGeoError(null);
          } catch (e) {
            console.log('PIPELINE EXCEPTION after STEP 3', e);
            setGeoError(e instanceof Error ? e.message : 'Failed to load map data');
          }
        });

        map.on('error', (e: unknown) => {
          console.log('MAP ERROR EVENT', e);
        });

        mapRef.current = map;
        if (containerRef.current && typeof ResizeObserver !== 'undefined') {
          ro = new ResizeObserver(() => {
            try {
              map.resize();
            } catch {
              /* ignore */
            }
          });
          ro.observe(containerRef.current);
        }
      } catch (e) {
        console.log('PIPELINE EXCEPTION before/at map create', e);
        if (!cancelled) setGeoError(e instanceof Error ? e.message : 'Map failed to initialise');
      }
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      try {
        mapRef.current?.remove();
      } catch {
        /* ignore */
      }
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    (async () => {
      const detail = level === 'countries' || level === 'regions' || level === 'cities';
      const fc = detail
        ? await loadCountries50m().catch(() => loadCountries110m())
        : await loadCountries110m();

      const nodesAreContinents =
        nodes.length > 0 && nodes.every((n) => CONTINENT_NAMES.has(n.name));

      const features = fc.features.map((f, i) => {
        const name = featureCountryName(
          f.properties || {},
          f.id ?? (f.properties as { id?: string })?.id
        );
        const countryNode =
          findNodeForFeature(name, nodes) ||
          nodeByCanonical.get(canonicalCountryName(name).toLowerCase()) ||
          null;
        let count = countryNode?.count ?? 0;
        let percentage = countryNode?.percentage ?? 0;

        if (nodesAreContinents || level === 'world' || level === 'continents') {
          const cont = getContinent(name);
          const cNode = nodes.find((n) => n.name === cont);
          if (cNode) {
            count = countryNode ? countryNode.count : cNode.count > 0 ? Math.max(count, 1) : 0;
            percentage = countryNode?.percentage ?? cNode.percentage;
          }
        }

        return {
          ...f,
          id: f.id ?? i,
          properties: {
            ...f.properties,
            name,
            count,
            percentage,
            hasGuests: count > 0,
            fillColor: heatColor(count),
          },
        };
      });

      const src = map.getSource(SOURCE_ID);
      if (src?.setData) {
        src.setData({ type: 'FeatureCollection', features });
        console.log('UPDATE setData features', features.length);
      } else {
        console.log('UPDATE setData skipped — source missing');
      }

      if (level === 'world' || level === 'continents') {
        map.flyTo({ center: WORLD_VIEW.center, zoom: WORLD_VIEW.zoom, duration: 800 });
      } else if (level === 'countries' && selectedContinent) {
        const view = CONTINENT_VIEWS[selectedContinent] || WORLD_VIEW;
        map.flyTo({ center: view.center, zoom: view.zoom, duration: 900 });
      }

      setProvinceUnavailable(level === 'regions' && !!selectedCountry);
    })().catch((e) => {
      console.log('UPDATE EXCEPTION', e);
      setGeoError(e instanceof Error ? e.message : 'Layer update failed');
    });
  }, [mapReady, nodes, level, selectedContinent, selectedCountry, nodeByCanonical, getContinent]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const onClick = (e: { features?: Array<{ properties?: Record<string, unknown> }> }) => {
      if (!interactive) return;
      const f = e.features?.[0];
      if (!f?.properties?.name) return;
      const name = String(f.properties.name);
      const count = Number(f.properties.count) || 0;

      if (level === 'world' || level === 'continents') {
        const cont = getContinent(name);
        if (cont && cont !== 'Other' && onContinentClick) onContinentClick(cont);
        else if (onCountryClick && count > 0) onCountryClick(name);
      } else if (level === 'countries' && onCountryClick) {
        onCountryClick(name);
      } else if (level === 'regions' && onRegionClick) {
        onRegionClick(name);
      } else if (level === 'cities' && onCityClick) {
        onCityClick(name);
      }
    };

    const onMove = (e: {
      point?: { x: number; y: number };
      features?: Array<{ properties?: Record<string, unknown> }>;
    }) => {
      const f = e.features?.[0];
      if (!f?.properties?.name) {
        setHover(null);
        return;
      }
      const count = Number(f.properties.count) || 0;
      setHover({
        name: String(f.properties.name),
        count,
        percentage: Number(f.properties.percentage) || 0,
        x: e.point?.x ?? 0,
        y: e.point?.y ?? 0,
      });
      try {
        map.getCanvas().style.cursor = interactive ? 'pointer' : 'default';
      } catch {
        /* ignore */
      }
    };

    const onLeave = () => {
      setHover(null);
      try {
        map.getCanvas().style.cursor = '';
      } catch {
        /* ignore */
      }
    };

    map.on('click', FILL_LAYER, onClick);
    map.on('mousemove', FILL_LAYER, onMove);
    map.on('mouseleave', FILL_LAYER, onLeave);
    return () => {
      try {
        map.off('click', FILL_LAYER, onClick);
        map.off('mousemove', FILL_LAYER, onMove);
        map.off('mouseleave', FILL_LAYER, onLeave);
      } catch {
        /* ignore */
      }
    };
  }, [
    mapReady,
    interactive,
    level,
    onContinentClick,
    onCountryClick,
    onRegionClick,
    onCityClick,
    getContinent,
  ]);

  return (
    <div className="relative w-full h-full min-h-[320px] rounded-xl overflow-hidden bg-slate-50 border border-stone-200">
      <div
        ref={containerRef}
        className="absolute inset-0"
        role="application"
        aria-label="Geographic visitor origin map"
      />

      {(isLoading || !mapReady) && !geoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 pointer-events-none z-10">
          <div className="text-sm font-medium text-stone-500">Loading map…</div>
        </div>
      )}

      {geoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-50 z-10 p-4">
          <p className="text-sm text-stone-600 text-center max-w-sm">{geoError}</p>
        </div>
      )}

      {provinceUnavailable && level === 'regions' && (
        <div className="absolute bottom-3 left-3 right-3 z-20 rounded-lg bg-white/95 border border-stone-200 px-3 py-2 shadow-sm">
          <p className="text-xs text-stone-600">
            Province-level geographic data is not currently available for this country. Use the
            list of provinces to continue, or go back to the country view.
          </p>
        </div>
      )}

      {hover && (
        <div
          className="pointer-events-none absolute z-30 rounded-lg bg-stone-900 text-white px-3 py-2 text-xs shadow-lg border border-stone-700 max-w-[200px]"
          style={{
            left: Math.min(hover.x + 12, (containerRef.current?.clientWidth || 300) - 160),
            top: Math.max(8, hover.y - 8),
          }}
          role="tooltip"
        >
          <p className="font-bold text-sm">{hover.name}</p>
          <p className="text-orange-300 mt-0.5">
            {hover.count.toLocaleString()} guest check-ins
          </p>
          {hover.percentage > 0 && <p className="text-stone-300">{hover.percentage}%</p>}
          {interactive && hover.count > 0 && (
            <p className="text-stone-400 mt-1">Click to explore</p>
          )}
        </div>
      )}

      <div className="absolute bottom-3 right-3 z-20 rounded-lg bg-white/95 border border-stone-200 px-2.5 py-1.5 shadow-sm">
        <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">
          Guest density
        </p>
        <div className="flex items-center gap-0.5">
          {['#e7e5e4', '#ffedd5', '#fed7aa', '#fb923c', '#ea580c', '#c2410c'].map((c) => (
            <span key={c} className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: c }} aria-hidden />
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-stone-400 mt-0.5">
          <span>None</span>
          <span>High</span>
        </div>
      </div>
    </div>
  );
}

export const GeographicMapViewport = memo(GeographicMapViewportInner);
export default GeographicMapViewport;
