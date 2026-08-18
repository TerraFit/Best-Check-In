/**
 * Geographic Explorer V2 — MapLibre GL + static GeoJSON/TopoJSON.
 * Country polygons are joined only to real analytics country nodes.
 * Region/city drill-downs expose the real analytics nodes as an on-map
 * clickable list until matching Admin-1/Admin-2 geometry is available.
 */
import { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react';
import { useTranslation } from '../../../i18n';
import { BASEMAP_STYLE, CONTINENT_VIEWS, WORLD_VIEW, heatColor } from './mapConfig';
import { loadCountries110m, loadCountries50m, featureCountryName } from './loadGeo';
import { findNodeForFeature, canonicalCountryName } from './nameMatch';
import { loadMapLibre, type MapLibreMap } from './maplibreLoader';

export type GeoLevel = 'world' | 'continents' | 'countries' | 'regions' | 'cities';
export type GeoNode = { name: string; count: number; percentage: number; intensity?: number; code?: string };
type HoverInfo = { name: string; count: number; percentage: number; x: number; y: number };
type FeatureLike = { id?: string | number; properties?: Record<string, unknown>; geometry?: GeoJSON.Geometry };

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

function coordinateBounds(coordinates: unknown): { bounds: [number, number, number, number]; points: number } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, points = 0;
  const walk = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === 'number' && typeof value[1] === 'number') {
      minX = Math.min(minX, value[0]); minY = Math.min(minY, value[1]);
      maxX = Math.max(maxX, value[0]); maxY = Math.max(maxY, value[1]); points += 1; return;
    }
    value.forEach(walk);
  };
  walk(coordinates);
  return Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY)
    ? { bounds: [minX, minY, maxX, maxY], points } : null;
}

function geometryBounds(geometry: GeoJSON.Geometry | null | undefined): [number, number, number, number] | null {
  if (!geometry) return null;
  if (geometry.type === 'MultiPolygon') {
    let best: { bounds: [number, number, number, number]; points: number } | null = null;
    geometry.coordinates.forEach((polygon) => {
      const candidate = coordinateBounds(polygon);
      if (candidate && (!best || candidate.points > best.points)) best = candidate;
    });
    return best?.bounds || null;
  }
  if (geometry.type === 'GeometryCollection') {
    let best: { bounds: [number, number, number, number]; points: number } | null = null;
    geometry.geometries.forEach((child) => {
      const candidate = coordinateBounds((child as GeoJSON.Geometry & { coordinates?: unknown }).coordinates);
      if (candidate && (!best || candidate.points > best.points)) best = candidate;
    });
    return best?.bounds || null;
  }
  return coordinateBounds((geometry as GeoJSON.Geometry & { coordinates?: unknown }).coordinates)?.bounds || null;
}

function findFeatureForCountry(features: FeatureLike[], countryName: string) {
  const target = canonicalCountryName(countryName).toLowerCase();
  return features.find((feature) => {
    const name = featureCountryName(feature.properties || {}, feature.id ?? feature.properties?.id as string | number | undefined);
    return canonicalCountryName(name).toLowerCase() === target;
  }) || null;
}

function GeographicMapViewportInner({
  level, nodes, selectedContinent, selectedCountry, selectedRegion,
  isLoading = false, interactive = true, onContinentClick, onCountryClick,
  onRegionClick, onCityClick, continentOfCountry,
}: GeographicMapViewportProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const mapDataNodes = useMemo(() => {
    const result = [...nodes];
    if (selectedCountry && (level === 'regions' || level === 'cities')) {
      const selectedCanonical = canonicalCountryName(selectedCountry).toLowerCase();
      const childTotal = nodes.reduce((sum, node) => sum + Math.max(0, Number(node.count) || 0), 0);
      if (childTotal > 0 && !result.some((node) => canonicalCountryName(node.name).toLowerCase() === selectedCanonical)) {
        result.push({ name: selectedCountry, count: childTotal, percentage: 100 });
      }
    }
    return result;
  }, [nodes, selectedCountry, level]);

  const nodeByCanonical = useMemo(() => {
    const result = new Map<string, GeoNode>();
    mapDataNodes.forEach((node) => result.set(canonicalCountryName(node.name).toLowerCase(), node));
    return result;
  }, [mapDataNodes]);

  const getContinent = useCallback((country: string) => continentOfCountry?.(country) || 'Other', [continentOfCountry]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    (async () => {
      try {
        const maplibregl = await loadMapLibre();
        if (cancelled || !containerRef.current) return;
        const map = new maplibregl.Map({ container: containerRef.current, style: BASEMAP_STYLE, center: WORLD_VIEW.center, zoom: WORLD_VIEW.zoom, attributionControl: true }) as unknown as MapLibreMap;
        try { if (map.addControl && maplibregl.NavigationControl) map.addControl(new maplibregl.NavigationControl({ showCompass: false })); } catch { /* optional */ }
        map.on('load', async () => {
          if (cancelled) return;
          try {
            const fc = await loadCountries110m();
            const data = { type: 'FeatureCollection' as const, features: fc.features.map((feature, index) => ({
              ...feature, id: feature.id ?? index, properties: { ...feature.properties,
                name: featureCountryName(feature.properties || {}, feature.id), count: 0, percentage: 0,
                hasGuests: false, isSelected: false, fillColor: heatColor(0),
              },
            })) };
            if (!map.getSource(SOURCE_ID)) map.addSource(SOURCE_ID, { type: 'geojson', data });
            if (!map.getLayer(FILL_LAYER)) map.addLayer({ id: FILL_LAYER, type: 'fill', source: SOURCE_ID, paint: {
              'fill-color': ['case', ['==', ['get', 'hasGuests'], true], ['get', 'fillColor'], '#e5e7eb'], 'fill-opacity': 0.95,
            } });
            if (!map.getLayer(LINE_LAYER)) map.addLayer({ id: LINE_LAYER, type: 'line', source: SOURCE_ID, paint: {
              'line-color': '#9ca3af', 'line-width': 0.6, 'line-opacity': 0.85,
            } });
            map.resize(); setMapReady(true); setGeoError(null);
          } catch (error) { setGeoError(error instanceof Error ? error.message : 'Failed to load map data'); }
        });
        mapRef.current = map;
        if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
          resizeObserver = new ResizeObserver(() => { try { map.resize(); } catch { /* ignore */ } });
          resizeObserver.observe(containerRef.current);
        }
      } catch (error) { if (!cancelled) setGeoError(error instanceof Error ? error.message : 'Map failed to initialise'); }
    })();
    return () => { cancelled = true; resizeObserver?.disconnect(); try { mapRef.current?.remove(); } catch { /* ignore */ } mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    (async () => {
      const detail = level === 'countries' || level === 'regions' || level === 'cities';
      const fc = detail ? await loadCountries50m().catch(() => loadCountries110m()) : await loadCountries110m();
      const features = fc.features.map((feature, index) => {
        const name = featureCountryName(feature.properties || {}, feature.id ?? feature.properties?.id as string | number | undefined);
        const canonical = canonicalCountryName(name).toLowerCase();
        const node = findNodeForFeature(name, mapDataNodes) || nodeByCanonical.get(canonical) || null;
        const count = node?.count ?? 0;
        return { ...feature, id: feature.id ?? index, properties: { ...feature.properties, name, count,
          percentage: node?.percentage ?? 0, hasGuests: count > 0,
          isSelected: !!selectedCountry && canonical === canonicalCountryName(selectedCountry).toLowerCase(), fillColor: heatColor(count),
        } };
      });
      map.getSource(SOURCE_ID)?.setData?.({ type: 'FeatureCollection', features });
      if (selectedCountry && (level === 'countries' || level === 'regions' || level === 'cities')) {
        const match = findFeatureForCountry(features, selectedCountry); const bounds = match ? geometryBounds(match.geometry) : null;
        if (!bounds) throw new Error(`No GeoJSON geometry found for ${selectedCountry}`);
        map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 56, duration: 900, maxZoom: 8 });
      } else if (level === 'countries' && selectedContinent) {
        const view = CONTINENT_VIEWS[selectedContinent] || WORLD_VIEW; map.flyTo({ center: view.center, zoom: view.zoom, duration: 900 });
      } else if (level === 'world' || level === 'continents') map.flyTo({ center: WORLD_VIEW.center, zoom: WORLD_VIEW.zoom, duration: 800 });
    })().catch((error) => setGeoError(error instanceof Error ? error.message : 'Layer update failed'));
  }, [mapReady, mapDataNodes, level, selectedContinent, selectedCountry, nodeByCanonical]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !mapReady) return;
    const onClick = (event: { features?: Array<{ properties?: Record<string, unknown> }> }) => {
      if (!interactive) return;
      const feature = event.features?.[0]; const name = feature?.properties?.name ? String(feature.properties.name) : '';
      if (!name) return;
      const count = Number(feature.properties?.count) || 0;
      if (level === 'world' || level === 'continents') {
        if (count > 0 && onCountryClick) return onCountryClick(name);
        const continent = getContinent(name); if (continent !== 'Other' && onContinentClick) onContinentClick(continent);
      } else if (level === 'countries' && onCountryClick) onCountryClick(name);
    };
    const onMove = (event: { point?: { x: number; y: number }; features?: Array<{ properties?: Record<string, unknown> }> }) => {
      const feature = event.features?.[0]; if (!feature?.properties?.name) return setHover(null);
      setHover({ name: String(feature.properties.name), count: Number(feature.properties.count) || 0,
        percentage: Number(feature.properties.percentage) || 0, x: event.point?.x ?? 0, y: event.point?.y ?? 0 });
      try { map.getCanvas().style.cursor = interactive ? 'pointer' : 'default'; } catch { /* ignore */ }
    };
    const onLeave = () => { setHover(null); try { map.getCanvas().style.cursor = ''; } catch { /* ignore */ } };
    map.on('click', FILL_LAYER, onClick); map.on('mousemove', FILL_LAYER, onMove); map.on('mouseleave', FILL_LAYER, onLeave);
    return () => { try { map.off('click', FILL_LAYER, onClick); map.off('mousemove', FILL_LAYER, onMove); map.off('mouseleave', FILL_LAYER, onLeave); } catch { /* ignore */ } };
  }, [mapReady, interactive, level, onContinentClick, onCountryClick, getContinent]);

  const drillNodes = useMemo(() => level === 'regions' || level === 'cities'
    ? [...nodes].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)) : [], [level, nodes]);

  return <div className="relative w-full h-full min-h-[320px] rounded-xl overflow-hidden bg-slate-50 border border-stone-200">
    <div ref={containerRef} className="w-full h-full" role="application" aria-label="Geographic visitor origin map" />
    {(isLoading || !mapReady) && !geoError && <div className="absolute inset-0 flex items-center justify-center bg-white/50 pointer-events-none z-10"><div className="text-sm font-medium text-stone-500">{t('reports_loading_map_short')}</div></div>}
    {geoError && <div className="absolute inset-0 flex items-center justify-center bg-stone-50 z-10 p-4"><p className="text-sm text-stone-600 text-center max-w-sm">{geoError}</p></div>}

    {drillNodes.length > 0 && <div className="absolute top-3 left-3 z-20 w-[min(320px,calc(100%-24px))] max-h-[calc(100%-72px)] overflow-y-auto rounded-xl bg-white/95 border border-stone-200 shadow-lg backdrop-blur-sm">
      <div className="px-3 py-2 border-b border-stone-200"><p className="text-xs font-bold uppercase tracking-wider text-stone-500">{level === 'regions' ? 'Regions / provinces / states' : 'Cities'}</p><p className="text-[11px] text-stone-400 mt-0.5">Click an item to explore</p></div>
      <div className="p-1.5">{drillNodes.map((node) => {
        const selected = level === 'regions' && selectedRegion === node.name;
        return <button key={`${node.name}-${node.code || ''}`} type="button" disabled={!interactive || node.count <= 0}
          onClick={() => level === 'regions' ? onRegionClick?.(node.name) : onCityClick?.(node.name)}
          className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition ${selected ? 'bg-orange-100 ring-1 ring-orange-300' : 'hover:bg-stone-100'} ${node.count <= 0 ? 'opacity-45 cursor-default' : 'cursor-pointer'}`}>
          <span className="h-3 w-3 rounded-sm shrink-0 border border-stone-300" style={{ backgroundColor: node.count > 0 ? heatColor(node.count) : '#e5e7eb' }} />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-stone-700">{node.name}</span><span className="text-xs font-bold text-stone-500 tabular-nums">{node.count}</span>
        </button>;
      })}</div>
    </div>}

    {hover && <div className="pointer-events-none absolute z-30 rounded-lg bg-stone-900 text-white px-3 py-2 text-xs shadow-lg border border-stone-700 max-w-[200px]" style={{ left: Math.min(hover.x + 12, (containerRef.current?.clientWidth || 300) - 160), top: Math.max(8, hover.y - 8) }} role="tooltip">
      <p className="font-bold text-sm">{hover.name}</p><p className="text-orange-300 mt-0.5">{t('reports_guest_checkins_count', { count: hover.count.toLocaleString() })}</p>{hover.percentage > 0 && <p className="text-stone-300">{hover.percentage}%</p>}
    </div>}

    <div className="absolute bottom-3 right-3 z-20 rounded-lg bg-white/95 border border-stone-200 px-2.5 py-1.5 shadow-sm"><p className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">{t('reports_guest_density')}</p><div className="flex items-center gap-0.5">{['#e5e7eb','#fed7aa','#fdba74','#fb923c','#ea580c','#c2410c'].map((color) => <span key={color} className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: color }} aria-hidden />)}</div><div className="flex justify-between text-[9px] text-stone-400 mt-0.5"><span>{t('reports_density_none')}</span><span>{t('reports_density_high')}</span></div></div>
  </div>;
}

export const GeographicMapViewport = memo(GeographicMapViewportInner);
export default GeographicMapViewport;
