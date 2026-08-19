/**
 * Geographic Explorer V2 — MapLibre GL.
 * Keeps the geographic drill-down data and map camera in the same navigation history.
 */
import { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react';
import { useTranslation } from '../../../i18n';
import { BASEMAP_STYLE, CONTINENT_VIEWS, WORLD_VIEW, heatColor } from './mapConfig';
import { loadCountries110m, loadCountries50m, loadAdmin1, geocodeCities, featureCountryName, featureRegionName, featureRegionCountry, featureRegionCode } from './loadGeo';
import { canonicalCountryName, findNodeForFeature } from './nameMatch';
import { loadMapLibre, type MapLibreMap } from './maplibreLoader';

export type GeoLevel = 'world' | 'continents' | 'countries' | 'regions' | 'cities';
export type GeoNode = { name: string; count: number; percentage: number; intensity?: number; code?: string };
type HoverInfo = { name: string; count: number; percentage: number; x: number; y: number };
type FeatureLike = { id?: string | number; properties?: Record<string, unknown>; geometry?: GeoJSON.Geometry };
type CameraSnapshot = { center: [number, number]; zoom: number; bearing?: number; pitch?: number; key: string };

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
  onBack?: () => void;
  onHome?: () => void;
  continentOfCountry?: (country: string) => string;
};

const SOURCE_ID = 'analytics-geo';
const FILL_LAYER = 'analytics-geo-fill';
const LINE_LAYER = 'analytics-geo-line';
const CITY_LAYER = 'analytics-geo-cities';
const CITY_LABEL_LAYER = 'analytics-geo-city-labels';

function coordinateBounds(coordinates: unknown): [number, number, number, number] | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === 'number' && typeof value[1] === 'number') {
      minX = Math.min(minX, value[0]); minY = Math.min(minY, value[1]); maxX = Math.max(maxX, value[0]); maxY = Math.max(maxY, value[1]); return;
    }
    value.forEach(walk);
  };
  walk(coordinates);
  return Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY) ? [minX, minY, maxX, maxY] : null;
}
function geometryBounds(geometry: GeoJSON.Geometry | null | undefined): [number, number, number, number] | null {
  if (!geometry) return null;
  if (geometry.type === 'MultiPolygon') {
    let result: [number, number, number, number] | null = null;
    geometry.coordinates.forEach(polygon => {
      const b = coordinateBounds(polygon); if (!b) return;
      result = result ? [Math.min(result[0], b[0]), Math.min(result[1], b[1]), Math.max(result[2], b[2]), Math.max(result[3], b[3])] : b;
    });
    return result;
  }
  if (geometry.type === 'GeometryCollection') {
    let result: [number, number, number, number] | null = null;
    geometry.geometries.forEach(child => { const b = geometryBounds(child); if (!b) return; result = result ? [Math.min(result[0], b[0]), Math.min(result[1], b[1]), Math.max(result[2], b[2]), Math.max(result[3], b[3])] : b; });
    return result;
  }
  return coordinateBounds((geometry as GeoJSON.Geometry & { coordinates?: unknown }).coordinates);
}
function countryMatches(feature: FeatureLike, countryName: string): boolean {
  const featureName = featureCountryName(feature.properties || {}, feature.id ?? feature.properties?.id as string | number | undefined);
  return !!findNodeForFeature(countryName, [{ name: featureName, count: 0 }], feature.id);
}
function regionMatchesNode(feature: FeatureLike, node: GeoNode): boolean {
  const props = feature.properties || {};
  const featureCode = featureRegionCode(props).toLowerCase();
  if (node.code && featureCode && node.code.toLowerCase() === featureCode) return true;
  return featureRegionName(props).trim().toLowerCase() === node.name.trim().toLowerCase();
}
function setLayerVisibility(map: MapLibreMap, layer: string, visible: boolean) {
  try { map.setLayoutProperty?.(layer, 'visibility', visible ? 'visible' : 'none'); } catch { /* optional */ }
}
function levelDepth(level: GeoLevel): number { return level === 'world' ? 0 : level === 'continents' ? 1 : level === 'countries' ? 2 : level === 'regions' ? 3 : 4; }

function GeographicMapViewportInner({ level, nodes, selectedContinent, selectedCountry, selectedRegion, isLoading = false, interactive = true, onContinentClick, onCountryClick, onRegionClick, onCityClick, onBack, onHome, continentOfCountry }: GeographicMapViewportProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const cameraHistoryRef = useRef<CameraSnapshot[]>([]);
  const stateKeyRef = useRef<string | null>(null);
  const stateDepthRef = useRef<number>(0);
  const [mapReady, setMapReady] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [cityLoading, setCityLoading] = useState(false);

  const nodeByCountry = useMemo(() => {
    const result = new Map<string, GeoNode>();
    nodes.forEach(node => {
      result.set(canonicalCountryName(node.name).toLowerCase(), node);
      if (node.code) result.set(canonicalCountryName(node.code).toLowerCase(), node);
    });
    return result;
  }, [nodes]);
  const getContinent = useCallback((country: string) => continentOfCountry?.(country) || 'Other', [continentOfCountry]);
  const stateKey = `${level}|${selectedContinent || ''}|${selectedCountry || ''}|${selectedRegion || ''}`;

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    (async () => {
      try {
        const maplibregl = await loadMapLibre();
        if (cancelled || !containerRef.current) return;
        const map = new maplibregl.Map({ container: containerRef.current, style: BASEMAP_STYLE, center: WORLD_VIEW.center, zoom: WORLD_VIEW.zoom, attributionControl: true, scrollZoom: true }) as unknown as MapLibreMap;
        try { if (map.addControl && maplibregl.NavigationControl) map.addControl(new maplibregl.NavigationControl({ showCompass: false })); } catch { /* optional */ }
        map.on('load', async () => {
          if (cancelled) return;
          try {
            const fc = await loadCountries110m();
            const data = { type: 'FeatureCollection' as const, features: fc.features.map((feature, index) => ({ ...feature, id: feature.id ?? index, properties: { ...feature.properties, name: featureCountryName(feature.properties || {}, feature.id), count: 0, percentage: 0, hasGuests: false, fillColor: heatColor(0) } })) };
            map.addSource(SOURCE_ID, { type: 'geojson', data });
            map.addLayer({ id: FILL_LAYER, type: 'fill', source: SOURCE_ID, paint: { 'fill-color': ['get', 'fillColor'], 'fill-opacity': 0.95 } });
            map.addLayer({ id: LINE_LAYER, type: 'line', source: SOURCE_ID, paint: { 'line-color': '#9ca3af', 'line-width': 0.8, 'line-opacity': 0.95 } });
            map.addLayer({ id: CITY_LAYER, type: 'circle', source: SOURCE_ID, layout: { visibility: 'none' }, paint: { 'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 1, 7, 5, 10, 10, 14, 20, 18], 'circle-color': ['get', 'fillColor'], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2, 'circle-opacity': 0.95 } });
            map.addLayer({ id: CITY_LABEL_LAYER, type: 'symbol', source: SOURCE_ID, layout: { visibility: 'none', 'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0, 1.25], 'text-anchor': 'top', 'text-allow-overlap': false }, paint: { 'text-color': '#44403c', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 } });
            map.resize(); setMapReady(true); setGeoError(null);
          } catch (error) { setGeoError(error instanceof Error ? error.message : 'Failed to load map data'); }
        });
        mapRef.current = map;
        if (typeof ResizeObserver !== 'undefined' && containerRef.current) { resizeObserver = new ResizeObserver(() => { try { map.resize(); } catch { /* ignore */ } }); resizeObserver.observe(containerRef.current); }
      } catch (error) { if (!cancelled) setGeoError(error instanceof Error ? error.message : 'Map failed to initialise'); }
    })();
    return () => { cancelled = true; resizeObserver?.disconnect(); try { mapRef.current?.remove(); } catch { /* ignore */ } mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    let cancelled = false;
    (async () => {
      const depth = levelDepth(level);
      const previousKey = stateKeyRef.current;
      const previousDepth = stateDepthRef.current;
      const isBack = !!previousKey && depth < previousDepth;
      const restore = isBack ? cameraHistoryRef.current.pop() : null;
      if (!isBack && previousKey && depth > previousDepth) {
        try {
          const center = map.getCenter?.();
          const zoom = map.getZoom?.();
          if (center && typeof zoom === 'number') cameraHistoryRef.current.push({ key: previousKey, center: [Number(center.lng), Number(center.lat)], zoom, bearing: map.getBearing?.(), pitch: map.getPitch?.() });
        } catch { /* ignore */ }
      }
      stateKeyRef.current = stateKey;
      stateDepthRef.current = depth;
      setGeoError(null); setHover(null);

      if (restore) {
        try { map.flyTo({ center: restore.center, zoom: restore.zoom, bearing: restore.bearing, pitch: restore.pitch, duration: 650 }); } catch { /* ignore */ }
      }

      const regionLevel = level === 'regions' && !!selectedCountry;
      const cityLevel = level === 'cities';
      if (cityLevel) {
        setCityLoading(true); setLayerVisibility(map, FILL_LAYER, false); setLayerVisibility(map, LINE_LAYER, false); setLayerVisibility(map, CITY_LAYER, true); setLayerVisibility(map, CITY_LABEL_LAYER, true);
        try {
          const points = await geocodeCities(nodes, selectedCountry, selectedRegion);
          if (cancelled) return;
          const features = points.map((point, index) => ({ type: 'Feature' as const, id: `city-${index}-${point.name}`, geometry: { type: 'Point' as const, coordinates: [point.longitude, point.latitude] }, properties: { name: point.name, count: point.count, percentage: point.percentage, hasGuests: point.count > 0, fillColor: heatColor(point.count) } }));
          map.getSource(SOURCE_ID)?.setData?.({ type: 'FeatureCollection', features });
          if (!restore) {
            if (points.length === 1) map.flyTo({ center: [points[0].longitude, points[0].latitude], zoom: 10, duration: 800 });
            else if (points.length > 1) {
              const bounds = points.reduce<[number, number, number, number] | null>((acc, p) => acc ? [Math.min(acc[0], p.longitude), Math.min(acc[1], p.latitude), Math.max(acc[2], p.longitude), Math.max(acc[3], p.latitude)] : [p.longitude, p.latitude, p.longitude, p.latitude], null);
              if (bounds) map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 72, duration: 800, maxZoom: 11 });
            } else if (selectedRegion) {
              const admin1 = await loadAdmin1();
              const matching = admin1.features.filter(feature => canonicalCountryName(featureRegionCountry(feature.properties || {})).toLowerCase() === canonicalCountryName(selectedCountry || '').toLowerCase() && featureRegionName(feature.properties || {}).toLowerCase() === selectedRegion.toLowerCase());
              const bounds = matching.reduce<[number, number, number, number] | null>((acc, feature) => { const b = geometryBounds(feature.geometry); if (!b) return acc; return acc ? [Math.min(acc[0], b[0]), Math.min(acc[1], b[1]), Math.max(acc[2], b[2]), Math.max(acc[3], b[3])] : b; }, null);
              if (bounds) map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 72, duration: 700, maxZoom: 9 });
            }
          }
        } finally { if (!cancelled) setCityLoading(false); }
        return;
      }

      setCityLoading(false); setLayerVisibility(map, FILL_LAYER, true); setLayerVisibility(map, LINE_LAYER, true); setLayerVisibility(map, CITY_LAYER, false); setLayerVisibility(map, CITY_LABEL_LAYER, false);
      const fc = regionLevel ? await loadAdmin1() : level === 'countries' ? await loadCountries50m().catch(() => loadCountries110m()) : await loadCountries110m();
      if (cancelled) return;
      let features: FeatureLike[];
      if (regionLevel) {
        const country = selectedCountry!;
        const countryFeatures = fc.features.filter(feature => canonicalCountryName(featureRegionCountry(feature.properties || {})).toLowerCase() === canonicalCountryName(country).toLowerCase());
        if (!countryFeatures.length) throw new Error(`No Admin-1 geometry found for ${country}`);
        features = countryFeatures.map((feature, index) => { const props = feature.properties || {}; const name = featureRegionName(props) || 'Unknown region'; const node = nodes.find(candidate => regionMatchesNode(feature, candidate)); const count = node?.count ?? 0; return { ...feature, id: feature.id ?? `${country}-${index}`, properties: { ...props, name, count, percentage: node?.percentage ?? 0, hasGuests: count > 0, fillColor: heatColor(count), isSelected: !!selectedRegion && name.toLowerCase() === selectedRegion.toLowerCase() } }; });
      } else {
        features = fc.features.map((feature, index) => { const name = featureCountryName(feature.properties || {}, feature.id ?? feature.properties?.id as string | number | undefined); const node = findNodeForFeature(name, nodes, feature.id) || nodeByCountry.get(canonicalCountryName(name).toLowerCase()) || null; const count = node?.count ?? 0; return { ...feature, id: feature.id ?? index, properties: { ...feature.properties, name, count, percentage: node?.percentage ?? 0, hasGuests: count > 0, fillColor: heatColor(count), isSelected: !!selectedCountry && canonicalCountryName(name).toLowerCase() === canonicalCountryName(selectedCountry).toLowerCase() } }; });
      }
      map.getSource(SOURCE_ID)?.setData?.({ type: 'FeatureCollection', features });
      if (!restore) {
        if (regionLevel) {
          const bounds = features.reduce<[number, number, number, number] | null>((acc, feature) => { const b = geometryBounds(feature.geometry); if (!b) return acc; return acc ? [Math.min(acc[0], b[0]), Math.min(acc[1], b[1]), Math.max(acc[2], b[2]), Math.max(acc[3], b[3])] : b; }, null);
          if (bounds) map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 56, duration: 900, maxZoom: 8 });
        } else if (selectedCountry && level === 'countries') {
          const match = features.find(feature => countryMatches(feature, selectedCountry));
          const bounds = match ? geometryBounds(match.geometry) : null;
          if (!bounds) throw new Error(`No GeoJSON geometry found for ${selectedCountry}`);
          map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 56, duration: 900, maxZoom: 8 });
        } else if (level === 'countries' && selectedContinent) {
          const view = CONTINENT_VIEWS[selectedContinent] || WORLD_VIEW; map.flyTo({ center: view.center, zoom: view.zoom, duration: 900 });
        } else if (level === 'world' || level === 'continents') {
          map.flyTo({ center: WORLD_VIEW.center, zoom: WORLD_VIEW.zoom, duration: 800 });
        }
      }
    })().catch(error => { if (!cancelled) setGeoError(error instanceof Error ? error.message : 'Layer update failed'); });
    return () => { cancelled = true; };
  }, [mapReady, nodes, level, selectedContinent, selectedCountry, selectedRegion, nodeByCountry, stateKey]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !mapReady) return;
    const onClick = (event: { features?: Array<{ properties?: Record<string, unknown> }> }) => {
      if (!interactive) return; const feature = event.features?.[0]; const name = feature?.properties?.name ? String(feature.properties.name) : ''; if (!name) return; const count = Number(feature.properties?.count) || 0;
      if (level === 'cities') { if (onCityClick && count > 0) onCityClick(name); }
      else if (level === 'world' || level === 'continents') { const continent = getContinent(name); if (continent !== 'Other' && onContinentClick) onContinentClick(continent); }
      else if (level === 'countries' && onCountryClick) onCountryClick(name);
      else if (level === 'regions' && onRegionClick) onRegionClick(name);
    };
    const onMove = (event: { point?: { x: number; y: number }; features?: Array<{ properties?: Record<string, unknown> }> }) => { const feature = event.features?.[0]; if (!feature?.properties?.name) { setHover(null); return; } setHover({ name: String(feature.properties.name), count: Number(feature.properties.count) || 0, percentage: Number(feature.properties.percentage) || 0, x: event.point?.x ?? 0, y: event.point?.y ?? 0 }); try { map.getCanvas().style.cursor = interactive ? 'pointer' : 'default'; } catch { /* ignore */ } };
    const onLeave = () => { setHover(null); try { map.getCanvas().style.cursor = ''; } catch { /* ignore */ } };
    for (const layer of [FILL_LAYER, CITY_LAYER]) { map.on('click', layer, onClick); map.on('mousemove', layer, onMove); map.on('mouseleave', layer, onLeave); }
    return () => { try { for (const layer of [FILL_LAYER, CITY_LAYER]) { map.off('click', layer, onClick); map.off('mousemove', layer, onMove); map.off('mouseleave', layer, onLeave); } } catch { /* ignore */ } };
  }, [mapReady, interactive, level, onContinentClick, onCountryClick, onRegionClick, onCityClick, getContinent]);

  const cityNodes = useMemo(() => level === 'cities' ? [...nodes].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)) : [], [level, nodes]);
  return <div className="relative w-full h-full min-h-[320px] rounded-xl overflow-hidden bg-slate-50 border border-stone-200">
    <div ref={containerRef} className="w-full h-full" role="application" aria-label="Geographic visitor origin map" />
    {(isLoading || !mapReady || cityLoading) && !geoError && <div className="absolute inset-0 flex items-center justify-center bg-white/45 pointer-events-none z-10"><div className="text-sm font-medium text-stone-500">{cityLoading ? 'Locating cities…' : t('reports_loading_map_short')}</div></div>}
    {geoError && <div className="absolute inset-0 flex items-center justify-center bg-stone-50 z-10 p-4"><p className="text-sm text-stone-600 text-center max-w-sm">{geoError}</p></div>}
    {interactive && level !== 'world' && (onBack || onHome) && <div className="absolute top-3 left-3 z-40 flex items-center gap-1.5 rounded-xl bg-white/95 border border-stone-200 shadow-lg p-1.5 backdrop-blur-sm">{onBack && <button type="button" onClick={onBack} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100">← Back</button>}{onHome && <button type="button" onClick={onHome} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-100">World</button>}</div>}
    {cityNodes.length > 0 && <div className="absolute top-16 left-3 z-30 w-[min(300px,calc(100%-24px))] max-h-[calc(100%-88px)] overflow-y-auto rounded-xl bg-white/95 border border-stone-200 shadow-lg backdrop-blur-sm"><div className="px-3 py-2 border-b border-stone-200"><p className="text-xs font-bold uppercase tracking-wider text-stone-500">Cities on map</p><p className="text-[11px] text-stone-400 mt-0.5">Click a marker or city name</p></div><div className="p-1.5">{cityNodes.map(node => <button key={`${node.name}-${node.code || ''}`} type="button" disabled={!interactive || node.count <= 0} onClick={() => onCityClick?.(node.name)} className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition ${node.count <= 0 ? 'opacity-45 cursor-default' : 'cursor-pointer hover:bg-stone-100'}`}><span className="h-3 w-3 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: node.count > 0 ? heatColor(node.count) : '#e5e7eb' }} /><span className="min-w-0 flex-1 truncate text-xs font-medium text-stone-700">{node.name}</span><span className="text-xs font-bold text-stone-500 tabular-nums">{node.count}</span></button>)}</div></div>}
    {hover && <div className="pointer-events-none absolute z-50 rounded-lg bg-stone-900 text-white px-3 py-2 text-xs shadow-lg border border-stone-700 max-w-[220px]" style={{ left: Math.min(hover.x + 12, (containerRef.current?.clientWidth || 300) - 170), top: Math.max(8, hover.y - 8) }} role="tooltip"><p className="font-bold text-sm">{hover.name}</p><p className="text-orange-300 mt-0.5">{t('reports_guest_checkins_count', { count: hover.count.toLocaleString() })}</p>{hover.percentage > 0 && <p className="text-stone-300">{hover.percentage}%</p>}</div>}
    <div className="absolute bottom-3 right-3 z-20 rounded-lg bg-white/95 border border-stone-200 px-2.5 py-1.5 shadow-sm"><p className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">{t('reports_guest_density')}</p><div className="flex items-center gap-0.5">{['#e5e7eb', '#fed7aa', '#fdba74', '#fb923c', '#ea580c', '#c2410c'].map(color => <span key={color} className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: color }} aria-hidden />)}</div><div className="flex justify-between text-[9px] text-stone-400 mt-0.5"><span>{t('reports_density_none')}</span><span>{t('reports_density_high')}</span></div></div>
  </div>;
}
export const GeographicMapViewport = memo(GeographicMapViewportInner);
export default GeographicMapViewport;
