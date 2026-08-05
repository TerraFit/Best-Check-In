/**
 * Geographic Explorer V2 — MapLibre GL + static GeoJSON/TopoJSON.
 * Single map instance; layers update on drill-down. No API keys.
 *
 * TEMP: DOM/layout isolation (PNG proven good). Filter console by "DOM:".
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

  /** TEMP: DOM/layout isolation — canvas PNG is known good; find why page hides it */
  const runIsolationTest = useCallback((map: MapLibreMap) => {
    const anyMap = map as unknown as {
      resize?: () => void;
      getCanvas?: () => HTMLCanvasElement;
      queryRenderedFeatures?: (opts?: unknown) => unknown[];
    };

    setTimeout(() => {
      try {
        const root = containerRef.current?.parentElement;
        const canvas = anyMap.getCanvas?.();
        console.log('DOM: ===== layout isolation =====');

        // 1–2: maplibre element counts
        const canvases = document.querySelectorAll('.maplibregl-canvas');
        const containers = document.querySelectorAll('.maplibregl-canvas-container');
        const maps = document.querySelectorAll('.maplibregl-map');
        console.log('DOM: .maplibregl-canvas count', canvases.length);
        console.log('DOM: .maplibregl-canvas-container count', containers.length);
        console.log('DOM: .maplibregl-map count', maps.length);

        // 4–5: canvas buffer vs CSS
        if (canvas) {
          const crect = canvas.getBoundingClientRect();
          const ccs = window.getComputedStyle(canvas);
          console.log('DOM: canvas drawingBuffer', { width: canvas.width, height: canvas.height });
          console.log('DOM: canvas client', { width: canvas.clientWidth, height: canvas.clientHeight });
          console.log('DOM: canvas CSS', {
            width: ccs.width,
            height: ccs.height,
            zIndex: ccs.zIndex,
            opacity: ccs.opacity,
            visibility: ccs.visibility,
            display: ccs.display,
            transform: ccs.transform,
            filter: ccs.filter,
            mixBlendMode: ccs.mixBlendMode,
            pointerEvents: ccs.pointerEvents,
            position: ccs.position,
          });
          console.log('DOM: canvas boundingRect', {
            left: crect.left,
            top: crect.top,
            width: crect.width,
            height: crect.height,
          });

          // 7: elementsFromPoint at exact center
          const midX = crect.left + crect.width / 2;
          const midY = crect.top + crect.height / 2;
          const stack = document.elementsFromPoint(midX, midY);
          console.log(
            'DOM: elementsFromPoint center',
            { midX, midY },
            stack.map((el, i) => {
              const h = el as HTMLElement;
              const s = window.getComputedStyle(h);
              return {
                i,
                tag: el.tagName,
                class: String(h.className || '').slice(0, 100),
                id: h.id,
                zIndex: s.zIndex,
                opacity: s.opacity,
                pointerEvents: s.pointerEvents,
                background: s.backgroundColor,
                position: s.position,
              };
            })
          );

          // Is canvas first in stack?
          console.log(
            'DOM: top element is canvas?',
            stack[0] === canvas,
            'canvas index in stack',
            stack.indexOf(canvas)
          );
        } else {
          console.log('DOM: getCanvas() returned null');
        }

        // 3: every ancestor computed styles
        let el: HTMLElement | null = containerRef.current;
        let depth = 0;
        while (el && depth < 16) {
          const s = window.getComputedStyle(el);
          const r = el.getBoundingClientRect();
          console.log('DOM: ancestor', depth, el.tagName, String(el.className || '').slice(0, 90), {
            width: s.width,
            height: s.height,
            clientW: el.clientWidth,
            clientH: el.clientHeight,
            rectW: r.width,
            rectH: r.height,
            overflow: s.overflow,
            overflowX: s.overflowX,
            overflowY: s.overflowY,
            transform: s.transform,
            opacity: s.opacity,
            visibility: s.visibility,
            display: s.display,
            clipPath: s.clipPath,
            clip: s.clip,
            filter: s.filter,
            contain: s.contain,
            isolation: s.isolation,
            zIndex: s.zIndex,
            position: s.position,
            pointerEvents: s.pointerEvents,
            background: s.backgroundColor,
          });
          el = el.parentElement;
          depth += 1;
        }

        // 6: absolute/fixed siblings that could cover canvas
        if (root) {
          Array.from(root.querySelectorAll('*')).forEach((node) => {
            if (!(node instanceof HTMLElement)) return;
            if (node === canvas) return;
            const s = window.getComputedStyle(node);
            if (s.position !== 'absolute' && s.position !== 'fixed') return;
            const r = node.getBoundingClientRect();
            if (r.width < 2 || r.height < 2) return;
            console.log('DOM: positioned sibling/overlay', node.tagName, String(node.className || '').slice(0, 90), {
              zIndex: s.zIndex,
              opacity: s.opacity,
              pointerEvents: s.pointerEvents,
              background: s.backgroundColor,
              display: s.display,
              visibility: s.visibility,
              rect: { left: r.left, top: r.top, width: r.width, height: r.height },
            });
          });
        }

        // maplibre internal nodes sizes
        for (const cls of [
          'maplibregl-map',
          'maplibregl-canvas-container',
          'maplibregl-canvas',
          'maplibregl-control-container',
        ]) {
          document.querySelectorAll('.' + cls).forEach((node, i) => {
            const h = node as HTMLElement;
            const s = window.getComputedStyle(h);
            const r = h.getBoundingClientRect();
            console.log('DOM: maplibre', cls, i, {
              rectW: r.width,
              rectH: r.height,
              zIndex: s.zIndex,
              opacity: s.opacity,
              visibility: s.visibility,
              display: s.display,
              transform: s.transform,
              overflow: s.overflow,
              position: s.position,
            });
          });
        }

        console.log('DOM: ===== end layout isolation =====');
      } catch (e) {
        console.log('DOM: isolation error', e);
      }
    }, 1200);
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
            console.log('DOM: map ready — scheduling layout isolation');
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
