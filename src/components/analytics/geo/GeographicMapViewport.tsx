/**
 * Geographic Explorer V2 — MapLibre GL + static GeoJSON/TopoJSON.
 * Single map instance; layers update on drill-down. No API keys.
 *
 * TEMP: pipeline + visibility DIAG instrumentation — remove after diagnosis.
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

  /** TEMP diagnostics — filter console by "DIAG:" — remove after diagnosis */
  const runVisibilityDiagnostics = useCallback((map: MapLibreMap, label: string) => {
    try {
      const anyMap = map as unknown as {
        getCenter?: () => unknown;
        getZoom?: () => unknown;
        getBounds?: () => { toArray?: () => unknown };
        getPitch?: () => unknown;
        getBearing?: () => unknown;
        isStyleLoaded?: () => boolean;
        getStyle?: () => { layers?: Array<Record<string, unknown>>; sources?: Record<string, unknown> };
        getLayer?: (id: string) => unknown;
        getLayoutProperty?: (layer: string, prop: string) => unknown;
        getPaintProperty?: (layer: string, prop: string) => unknown;
        getSource?: (id: string) => unknown;
        querySourceFeatures?: (id: string, opts?: unknown) => unknown[];
        queryRenderedFeatures?: (opts?: unknown) => unknown[];
        setPaintProperty?: (layer: string, prop: string, value: unknown) => void;
        fitBounds?: (bounds: number[][], opts?: unknown) => void;
        getCanvas?: () => HTMLCanvasElement;
      };

      console.log('DIAG: ===== runVisibilityDiagnostics', label, '=====');

      console.log('DIAG: camera center', anyMap.getCenter?.());
      console.log('DIAG: camera zoom', anyMap.getZoom?.());
      console.log('DIAG: camera bounds', anyMap.getBounds?.()?.toArray?.() ?? anyMap.getBounds?.());
      console.log('DIAG: camera pitch', anyMap.getPitch?.());
      console.log('DIAG: camera bearing', anyMap.getBearing?.());

      console.log('DIAG: isStyleLoaded', anyMap.isStyleLoaded?.());
      const style = anyMap.getStyle?.();
      console.log('DIAG: style.layers count', style?.layers?.length);
      console.log('DIAG: style.layer ids', style?.layers?.map((l) => l.id));
      console.log('DIAG: style.sources keys', style?.sources ? Object.keys(style.sources) : null);

      for (const layerId of [FILL_LAYER, LINE_LAYER]) {
        console.log('DIAG: layer def', layerId, anyMap.getLayer?.(layerId));
        console.log('DIAG: layer visibility', layerId, anyMap.getLayoutProperty?.(layerId, 'visibility'));
        console.log('DIAG: layer paint fill-color', layerId, anyMap.getPaintProperty?.(layerId, 'fill-color'));
        console.log('DIAG: layer paint fill-opacity', layerId, anyMap.getPaintProperty?.(layerId, 'fill-opacity'));
        console.log('DIAG: layer paint line-color', layerId, anyMap.getPaintProperty?.(layerId, 'line-color'));
        console.log('DIAG: layer paint line-width', layerId, anyMap.getPaintProperty?.(layerId, 'line-width'));
        console.log('DIAG: layer paint line-opacity', layerId, anyMap.getPaintProperty?.(layerId, 'line-opacity'));
      }
      if (style?.layers) {
        const ids = style.layers.map((l) => String(l.id));
        console.log('DIAG: fill layer index', ids.indexOf(FILL_LAYER));
        console.log('DIAG: line layer index', ids.indexOf(LINE_LAYER));
        console.log('DIAG: layer order (last 8)', ids.slice(-8));
      }

      const src = anyMap.getSource?.(SOURCE_ID);
      console.log('DIAG: getSource', SOURCE_ID, !!src, src);
      try {
        const qsf = anyMap.querySourceFeatures?.(SOURCE_ID) ?? [];
        console.log('DIAG: querySourceFeatures count', Array.isArray(qsf) ? qsf.length : qsf);
      } catch (e) {
        console.log('DIAG: querySourceFeatures error', e);
      }

      try {
        const all = anyMap.queryRenderedFeatures?.() ?? [];
        console.log('DIAG: queryRenderedFeatures all count', Array.isArray(all) ? all.length : all);
        const fillR = anyMap.queryRenderedFeatures?.({ layers: [FILL_LAYER] }) ?? [];
        console.log('DIAG: queryRenderedFeatures fill count', Array.isArray(fillR) ? fillR.length : fillR);
        if (Array.isArray(fillR) && fillR[0]) console.log('DIAG: first fill rendered feature', fillR[0]);
        const lineR = anyMap.queryRenderedFeatures?.({ layers: [LINE_LAYER] }) ?? [];
        console.log('DIAG: queryRenderedFeatures line count', Array.isArray(lineR) ? lineR.length : lineR);
      } catch (e) {
        console.log('DIAG: queryRenderedFeatures error', e);
      }

      const container = containerRef.current;
      if (container) {
        const cs = window.getComputedStyle(container);
        const rect = container.getBoundingClientRect();
        console.log('DIAG: container client', container.clientWidth, container.clientHeight);
        console.log('DIAG: container offset', container.offsetWidth, container.offsetHeight);
        console.log('DIAG: container rect', { x: rect.x, y: rect.y, w: rect.width, h: rect.height });
        console.log('DIAG: container computed', {
          display: cs.display,
          opacity: cs.opacity,
          visibility: cs.visibility,
          overflow: cs.overflow,
          position: cs.position,
          zIndex: cs.zIndex,
          transform: cs.transform,
          clipPath: cs.clipPath,
          pointerEvents: cs.pointerEvents,
        });
        let el: HTMLElement | null = container;
        let depth = 0;
        while (el && depth < 12) {
          const pcs = window.getComputedStyle(el);
          const prect = el.getBoundingClientRect();
          console.log('DIAG: ancestor', depth, el.tagName, String(el.className || '').slice(0, 80), {
            w: prect.width,
            h: prect.height,
            display: pcs.display,
            opacity: pcs.opacity,
            visibility: pcs.visibility,
            overflow: pcs.overflow,
            position: pcs.position,
            zIndex: pcs.zIndex,
            transform: pcs.transform,
            clipPath: pcs.clipPath,
            pointerEvents: pcs.pointerEvents,
          });
          el = el.parentElement;
          depth += 1;
        }
      } else {
        console.log('DIAG: containerRef null');
      }

      try {
        const canvas = anyMap.getCanvas?.();
        if (canvas) {
          const crect = canvas.getBoundingClientRect();
          console.log('DIAG: canvas attrs', canvas.width, canvas.height);
          console.log('DIAG: canvas client', canvas.clientWidth, canvas.clientHeight);
          console.log('DIAG: canvas rect', { x: crect.x, y: crect.y, w: crect.width, h: crect.height });
          console.log('DIAG: devicePixelRatio', window.devicePixelRatio);
          const ccs = window.getComputedStyle(canvas);
          console.log('DIAG: canvas computed', {
            display: ccs.display,
            opacity: ccs.opacity,
            visibility: ccs.visibility,
            transform: ccs.transform,
            zIndex: ccs.zIndex,
            pointerEvents: ccs.pointerEvents,
          });
          try {
            const dataUrl = canvas.toDataURL('image/png');
            console.log('DIAG: canvas toDataURL length', dataUrl.length);
            console.log('DIAG: canvas toDataURL prefix', dataUrl.slice(0, 64));
          } catch (be) {
            console.log('DIAG: canvas toDataURL error', be);
          }
        } else {
          console.log('DIAG: getCanvas returned null');
        }
      } catch (e) {
        console.log('DIAG: canvas error', e);
      }

      try {
        const root = containerRef.current?.parentElement;
        if (root) {
          Array.from(root.querySelectorAll('*')).forEach((node, i) => {
            if (!(node instanceof HTMLElement)) return;
            const ncs = window.getComputedStyle(node);
            if (ncs.position === 'absolute' || ncs.position === 'fixed') {
              const nr = node.getBoundingClientRect();
              console.log('DIAG: overlay', i, node.tagName, String(node.className || '').slice(0, 100), {
                zIndex: ncs.zIndex,
                opacity: ncs.opacity,
                display: ncs.display,
                visibility: ncs.visibility,
                pointerEvents: ncs.pointerEvents,
                background: ncs.backgroundColor,
                rect: { x: nr.x, y: nr.y, w: nr.width, h: nr.height },
              });
            }
          });
          for (const cls of [
            'maplibregl-map',
            'maplibregl-canvas-container',
            'maplibregl-canvas',
            'maplibregl-control-container',
          ]) {
            const el = root.querySelector('.' + cls) as HTMLElement | null;
            if (!el) {
              console.log('DIAG: missing', cls);
              continue;
            }
            const r = el.getBoundingClientRect();
            const cs = window.getComputedStyle(el);
            console.log('DIAG: maplibre el', cls, {
              w: r.width,
              h: r.height,
              display: cs.display,
              opacity: cs.opacity,
              visibility: cs.visibility,
              zIndex: cs.zIndex,
              transform: cs.transform,
              overflow: cs.overflow,
            });
          }
        }
      } catch (e) {
        console.log('DIAG: overlay error', e);
      }

      try {
        const prevFill = anyMap.getPaintProperty?.(FILL_LAYER, 'fill-color');
        const prevFillOp = anyMap.getPaintProperty?.(FILL_LAYER, 'fill-opacity');
        const prevLine = anyMap.getPaintProperty?.(LINE_LAYER, 'line-color');
        const prevLineW = anyMap.getPaintProperty?.(LINE_LAYER, 'line-width');
        console.log('DIAG: paint-test BEFORE fill-color', prevFill);
        anyMap.setPaintProperty?.(FILL_LAYER, 'fill-color', '#ff0000');
        anyMap.setPaintProperty?.(FILL_LAYER, 'fill-opacity', 1);
        anyMap.setPaintProperty?.(LINE_LAYER, 'line-color', '#000000');
        anyMap.setPaintProperty?.(LINE_LAYER, 'line-width', 3);
        console.log('DIAG: paint-test FORCED red fill / black line width 3');
        console.log('DIAG: paint-test AFTER fill-color', anyMap.getPaintProperty?.(FILL_LAYER, 'fill-color'));
        setTimeout(() => {
          try {
            anyMap.setPaintProperty?.(FILL_LAYER, 'fill-color', prevFill);
            anyMap.setPaintProperty?.(FILL_LAYER, 'fill-opacity', prevFillOp ?? 0.82);
            anyMap.setPaintProperty?.(LINE_LAYER, 'line-color', prevLine ?? '#a8a29e');
            anyMap.setPaintProperty?.(LINE_LAYER, 'line-width', prevLineW ?? 0.6);
            console.log('DIAG: paint-test RESTORED original paint');
          } catch (re) {
            console.log('DIAG: paint-test restore error', re);
          }
        }, 3000);
      } catch (e) {
        console.log('DIAG: paint-test error', e);
      }

      try {
        const before = {
          center: anyMap.getCenter?.(),
          zoom: anyMap.getZoom?.(),
          bounds: anyMap.getBounds?.()?.toArray?.() ?? anyMap.getBounds?.(),
        };
        console.log('DIAG: fitBounds BEFORE', before);
        anyMap.fitBounds?.(
          [
            [-170, -55],
            [170, 75],
          ],
          { padding: 20, duration: 0 }
        );
        const after = {
          center: anyMap.getCenter?.(),
          zoom: anyMap.getZoom?.(),
          bounds: anyMap.getBounds?.()?.toArray?.() ?? anyMap.getBounds?.(),
        };
        console.log('DIAG: fitBounds AFTER', after);
        setTimeout(() => {
          try {
            const fillAfter = anyMap.queryRenderedFeatures?.({ layers: [FILL_LAYER] }) ?? [];
            console.log(
              'DIAG: after fitBounds fill rendered count',
              Array.isArray(fillAfter) ? fillAfter.length : fillAfter
            );
          } catch (e) {
            console.log('DIAG: after fitBounds query error', e);
          }
        }, 500);
      } catch (e) {
        console.log('DIAG: fitBounds error', e);
      }

      console.log('DIAG: ===== end', label, '=====');
    } catch (e) {
      console.log('DIAG: runVisibilityDiagnostics fatal', e);
    }
  }, []);

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
            setTimeout(() => {
              try {
                runVisibilityDiagnostics(map, 'after-load');
              } catch (e) {
                console.log('DIAG: after-load schedule error', e);
              }
            }, 1200);
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
        setTimeout(() => {
          try {
            runVisibilityDiagnostics(map, 'after-setData');
          } catch (e) {
            console.log('DIAG: after-setData schedule error', e);
          }
        }, 1000);
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
