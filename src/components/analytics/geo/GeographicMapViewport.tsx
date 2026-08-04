/**
 * Geographic Explorer V2 — MapLibre GL + static GeoJSON/TopoJSON.
 * Single map instance; layers update on drill-down. No API keys.
 *
 * TEMP: visual isolation test (no overlays, magenta container, canvas PNG download).
 * Remove after diagnosis.
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

  /** TEMP: force resize + PNG download + elementsFromPoint */
  const runIsolationTest = useCallback((map: MapLibreMap) => {
    const anyMap = map as unknown as {
      resize?: () => void;
      getCanvas?: () => HTMLCanvasElement;
      setPaintProperty?: (layer: string, prop: string, value: unknown) => void;
      queryRenderedFeatures?: (opts?: unknown) => unknown[];
    };

    try {
      anyMap.resize?.();
      requestAnimationFrame(() => {
        try {
          anyMap.resize?.();
        } catch {
          /* ignore */
        }
      });
      setTimeout(() => {
        try {
          anyMap.resize?.();
        } catch {
          /* ignore */
        }
      }, 100);
    } catch (e) {
      console.log('ISOLATION: resize error', e);
    }

    // Force highly visible paint for the isolation test
    try {
      anyMap.setPaintProperty?.(FILL_LAYER, 'fill-color', '#ff0000');
      anyMap.setPaintProperty?.(FILL_LAYER, 'fill-opacity', 1);
      anyMap.setPaintProperty?.(LINE_LAYER, 'line-color', '#000000');
      anyMap.setPaintProperty?.(LINE_LAYER, 'line-width', 2);
      console.log('ISOLATION: forced red fill / black line');
    } catch (e) {
      console.log('ISOLATION: paint force error', e);
    }

    setTimeout(() => {
      try {
        const canvas = anyMap.getCanvas?.();
        if (!canvas) {
          console.log('ISOLATION: no canvas');
          return;
        }
        const rect = canvas.getBoundingClientRect();
        console.log('ISOLATION: canvas rect', {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        });
        console.log('ISOLATION: canvas attrs', canvas.width, canvas.height);

        const midX = rect.left + rect.width / 2;
        const midY = rect.top + rect.height / 2;
        const stack = document.elementsFromPoint(midX, midY);
        console.log(
          'ISOLATION: elementsFromPoint center',
          stack.map((el) => ({
            tag: el.tagName,
            class: String((el as HTMLElement).className || '').slice(0, 80),
            id: (el as HTMLElement).id,
          }))
        );

        const dataUrl = canvas.toDataURL('image/png');
        console.log('ISOLATION: toDataURL length', dataUrl.length);
        console.log('ISOLATION: toDataURL prefix', dataUrl.slice(0, 48));

        // Auto-download PNG
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'maplibre-isolation-test.png';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        console.log('ISOLATION: PNG download triggered (maplibre-isolation-test.png)');

        const fillCount =
          anyMap.queryRenderedFeatures?.({ layers: [FILL_LAYER] }) ?? [];
        console.log(
          'ISOLATION: fill rendered count',
          Array.isArray(fillCount) ? fillCount.length : fillCount
        );
      } catch (e) {
        console.log('ISOLATION: canvas/export error', e);
      }
    }, 1500);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;

    (async () => {
      try {
        const maplibregl = await loadMapLibre();
        if (cancelled || !containerRef.current) return;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: BASEMAP_STYLE,
          center: WORLD_VIEW.center,
          zoom: WORLD_VIEW.zoom,
          attributionControl: true,
        }) as unknown as MapLibreMap;

        try {
          if (map.addControl && maplibregl.NavigationControl) {
            map.addControl(new maplibregl.NavigationControl({ showCompass: true }));
          }
        } catch {
          /* optional */
        }

        map.on('load', async () => {
          if (cancelled) return;
          try {
            const fc = await loadCountries110m();
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

            if (!map.getSource(SOURCE_ID)) {
              map.addSource(SOURCE_ID, { type: 'geojson', data: enriched });
            }
            if (!map.getLayer(FILL_LAYER)) {
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
            }
            if (!map.getLayer(LINE_LAYER)) {
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
            }

            // Explicit resize sequence after load
            try {
              map.resize();
              requestAnimationFrame(() => {
                try {
                  map.resize();
                } catch {
                  /* ignore */
                }
              });
              setTimeout(() => {
                try {
                  map.resize();
                } catch {
                  /* ignore */
                }
              }, 100);
            } catch {
              /* ignore */
            }

            setMapReady(true);
            setGeoError(null);
            console.log('ISOLATION: map ready — scheduling isolation test');
            setTimeout(() => runIsolationTest(map), 800);
          } catch (e) {
            setGeoError(e instanceof Error ? e.message : 'Failed to load map data');
          }
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
  }, [runIsolationTest]);

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
      }

      if (level === 'world' || level === 'continents') {
        map.flyTo({ center: WORLD_VIEW.center, zoom: WORLD_VIEW.zoom, duration: 800 });
      } else if (level === 'countries' && selectedContinent) {
        const view = CONTINENT_VIEWS[selectedContinent] || WORLD_VIEW;
        map.flyTo({ center: view.center, zoom: view.zoom, duration: 900 });
      }

      setProvinceUnavailable(level === 'regions' && !!selectedCountry);
    })().catch((e) => setGeoError(e instanceof Error ? e.message : 'Layer update failed'));
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

  // TEMP isolation UI: no legend/tooltip/loading overlays; obvious container chrome
  return (
    <div
      className="relative w-full h-full min-h-[320px] rounded-xl overflow-hidden"
      style={{ background: 'magenta', border: '5px solid lime' }}
    >
      <div
        ref={containerRef}
        className="absolute inset-0"
        role="application"
        aria-label="Geographic visitor origin map"
        style={{ background: 'magenta' }}
      />
      {/* TEMP: all custom overlays removed for isolation test */}
      {geoError ? (
        <p className="absolute bottom-2 left-2 z-50 text-xs text-white bg-black/80 px-2 py-1">
          {geoError}
        </p>
      ) : null}
    </div>
  );
}

export const GeographicMapViewport = memo(GeographicMapViewportInner);
export default GeographicMapViewport;
