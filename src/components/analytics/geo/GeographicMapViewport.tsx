import { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react';
import { useTranslation } from '../../../i18n';
import { BASEMAP_STYLE, WORLD_VIEW, heatColor } from './mapConfig';
import { loadWorldCountries, loadCountries50m, loadCountries110m, loadAdmin1, geocodeCities, featureCountryName, featureRegionName, featureRegionCountry, featureRegionCode } from './loadGeo';
import { canonicalCountryName, findNodeForFeature, regionNamesMatch } from './nameMatch';
import { loadMapLibre, type MapLibreMap } from './maplibreLoader';

export type GeoLevel = 'world' | 'continents' | 'countries' | 'regions' | 'cities';
export type GeoNode = { name: string; count: number; percentage: number; intensity?: number; code?: string };
type HoverInfo = { name: string; count: number; percentage: number; x: number; y: number };
type FeatureLike = { id?: string | number; properties?: Record<string, unknown>; geometry?: GeoJSON.Geometry };
type CameraSnapshot = { center: [number, number]; zoom: number; bearing?: number; pitch?: number; key: string };

export type GeographicMapViewportProps = {
  level: GeoLevel; nodes: GeoNode[]; selectedContinent: string | null; selectedCountry: string | null; selectedRegion: string | null; isLoading?: boolean; interactive?: boolean;
  onContinentClick?: (continent: string) => void; onCountryClick?: (country: string) => void; onRegionClick?: (region: string) => void; onCityClick?: (city: string) => void;
  onBack?: () => void; onHome?: () => void; continentOfCountry?: (country: string) => string; overlayInset?: number;
};

const SOURCE_ID = 'analytics-geo';
const FILL_LAYER = 'analytics-geo-fill';
const LINE_LAYER = 'analytics-geo-line';
const CITY_LAYER = 'analytics-geo-cities';
const CITY_LABEL_LAYER = 'analytics-geo-city-labels';
const CONTINENT_BOUNDS: Record<string, [number, number, number, number]> = {
  Africa: [-20, -36, 53, 38], Europe: [-12, 34, 43, 72], 'North America': [-170, 5, -50, 75],
  'South America': [-86, -57, -30, 14], Asia: [25, -10, 180, 80], Oceania: [105, -50, 180, 5], Other: [-180, -60, 180, 80],
};
const normalizeContinent = (value: unknown): string => {
  if (typeof value !== 'string') return 'Other';
  const key = value.trim().toLowerCase();
  return Object.keys(CONTINENT_BOUNDS).find(name => name.toLowerCase() === key) || 'Other';
};
function coordinateBounds(coordinates: unknown): [number, number, number, number] | null { let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity; const walk = (value: unknown): void => { if (!Array.isArray(value)) return; if (typeof value[0] === 'number' && typeof value[1] === 'number') { minX = Math.min(minX, value[0]); minY = Math.min(minY, value[1]); maxX = Math.max(maxX, value[0]); maxY = Math.max(maxY, value[1]); return; } value.forEach(walk); }; walk(coordinates); return Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY) ? [minX, minY, maxX, maxY] : null; }
function geometryBounds(geometry: GeoJSON.Geometry | null | undefined): [number, number, number, number] | null { if (!geometry) return null; if (geometry.type === 'GeometryCollection') return mergeBounds(geometry.geometries.map(geometryBounds)); return coordinateBounds((geometry as GeoJSON.Geometry & { coordinates?: unknown }).coordinates); }
function mergeBounds(bounds: Array<[number, number, number, number] | null>): [number, number, number, number] | null { return bounds.reduce<[number, number, number, number] | null>((acc, b) => b ? (acc ? [Math.min(acc[0], b[0]), Math.min(acc[1], b[1]), Math.max(acc[2], b[2]), Math.max(acc[3], b[3])] : b) : acc, null); }
function countryMatches(feature: FeatureLike, countryName: string): boolean { const featureName = featureCountryName(feature.properties || {}, feature.id ?? feature.properties?.id as string | number | undefined); return !!findNodeForFeature(countryName, [{ name: featureName, count: 0 }], feature.id); }
function regionMatchesNode(feature: FeatureLike, node: GeoNode): boolean { const props = feature.properties || {}; const featureCode = featureRegionCode(props).trim().toLowerCase(); if (node.code && featureCode && node.code.trim().toLowerCase() === featureCode) return true; return regionNamesMatch(featureRegionName(props), node.name); }
function featureContinent(feature: FeatureLike, getContinent: (country: string) => string): string { const props = feature.properties || {}; const direct = props.continent ?? props.CONTINENT ?? props.continent_name ?? props.CONTINENT_NAME; const normalized = normalizeContinent(direct); return normalized !== 'Other' ? normalized : normalizeContinent(getContinent(featureCountryName(props, feature.id))); }
function setLayerVisibility(map: MapLibreMap, layer: string, visible: boolean) { try { map.setLayoutProperty?.(layer, 'visibility', visible ? 'visible' : 'none'); } catch { /* optional */ } }
function levelDepth(level: GeoLevel): number { return level === 'world' ? 0 : level === 'continents' ? 1 : level === 'countries' ? 2 : level === 'regions' ? 3 : 4; }

function GeographicMapViewportInner({ level, nodes, selectedContinent, selectedCountry, selectedRegion, isLoading = false, interactive = true, onContinentClick, onCountryClick, onRegionClick, onCityClick, onBack, onHome, continentOfCountry, overlayInset = 320 }: GeographicMapViewportProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const cameraHistoryRef = useRef<CameraSnapshot[]>([]);
  const stateKeyRef = useRef<string | null>(null);
  const stateDepthRef = useRef(0);
  const pendingRestoreKeyRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [cityLoading, setCityLoading] = useState(false);

  const stateKey = `${level}|${selectedContinent || ''}|${selectedCountry || ''}|${selectedRegion || ''}`;
  const getContinent = useCallback((country: string) => continentOfCountry?.(country) || 'Other', [continentOfCountry]);
  const nodeByCountry = useMemo(() => { const result = new Map<string, GeoNode>(); nodes.forEach(node => { result.set(canonicalCountryName(node.name).toLowerCase(), node); if (node.code) result.set(canonicalCountryName(node.code).toLowerCase(), node); }); return result; }, [nodes]);
  const nodeByContinent = useMemo(() => { const result = new Map<string, GeoNode>(); if (level === 'world') nodes.forEach(node => result.set(node.name.trim().toLowerCase(), node)); return result; }, [level, nodes]);
  const fitPadding = useCallback(() => { const width = containerRef.current?.clientWidth || 0; const inset = width >= 760 ? Math.min(overlayInset, Math.max(0, width - 120)) : 0; return { top: 48, right: 32, bottom: 48, left: inset + 28 }; }, [overlayInset]);
  const fitBoundsToMap = useCallback((map: MapLibreMap, bounds: [number, number, number, number] | null, duration = 850, maxZoom = 10) => { if (!bounds) return; try { map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: fitPadding(), duration, maxZoom }); } catch { /* optional */ } }, [fitPadding]);

  useEffect(() => {
    let cancelled = false; let resizeObserver: ResizeObserver | null = null;
    (async () => { try {
      const maplibregl = await loadMapLibre(); if (cancelled || !containerRef.current) return;
      const map = new maplibregl.Map({ container: containerRef.current, style: BASEMAP_STYLE, center: WORLD_VIEW.center, zoom: WORLD_VIEW.zoom, attributionControl: true, scrollZoom: true, renderWorldCopies: false }) as unknown as MapLibreMap;
      try { (map as MapLibreMap & { setRenderWorldCopies?: (value: boolean) => void }).setRenderWorldCopies?.(false); } catch { /* optional */ }
      try { if (map.addControl && maplibregl.NavigationControl) map.addControl(new maplibregl.NavigationControl({ showCompass: false })); } catch { /* optional */ }
      map.on('load', async () => { if (cancelled) return; try {
        const fc = await loadWorldCountries();
        const data = { type: 'FeatureCollection' as const, features: fc.features.map((feature, index) => ({ ...feature, id: feature.id ?? index, properties: { ...feature.properties, name: featureCountryName(feature.properties || {}, feature.id), count: 0, percentage: 0, hasGuests: false, fillColor: heatColor(0) } })) };
        map.addSource(SOURCE_ID, { type: 'geojson', data });
        map.addLayer({ id: FILL_LAYER, type: 'fill', source: SOURCE_ID, paint: { 'fill-color': ['get', 'fillColor'], 'fill-opacity': 0.95 } });
        map.addLayer({ id: LINE_LAYER, type: 'line', source: SOURCE_ID, paint: { 'line-color': '#9ca3af', 'line-width': 0.8, 'line-opacity': 0.95 } });
        map.addLayer({ id: CITY_LAYER, type: 'circle', source: SOURCE_ID, layout: { visibility: 'none' }, paint: { 'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 1, 7, 5, 10, 10, 14, 20, 18], 'circle-color': ['get', 'fillColor'], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2, 'circle-opacity': 0.95 } });
        map.addLayer({ id: CITY_LABEL_LAYER, type: 'symbol', source: SOURCE_ID, layout: { visibility: 'none', 'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0, 1.25], 'text-anchor': 'top', 'text-allow-overlap': false }, paint: { 'text-color': '#44403c', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 } });
        map.resize(); setMapReady(true); setGeoError(null);
      } catch (error) { setGeoError(error instanceof Error ? error.message : 'Failed to load map data'); } });
      mapRef.current = map;
      if (typeof ResizeObserver !== 'undefined' && containerRef.current) { resizeObserver = new ResizeObserver(() => { try { map.resize(); } catch { /* ignore */ } }); resizeObserver.observe(containerRef.current); }
    } catch (error) { if (!cancelled) setGeoError(error instanceof Error ? error.message : 'Map failed to initialise'); } })();
    return () => { cancelled = true; resizeObserver?.disconnect(); try { mapRef.current?.remove(); } catch { /* ignore */ } mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current; if (!map || !mapReady) return; let cancelled = false;
    (async () => {
      const depth = levelDepth(level); const previousKey = stateKeyRef.current; const previousDepth = stateDepthRef.current;
      if (pendingRestoreKeyRef.current && pendingRestoreKeyRef.current !== stateKey) pendingRestoreKeyRef.current = null;
      const isBack = !!previousKey && depth < previousDepth; const restore = isBack ? cameraHistoryRef.current.pop() : null; const restoringExistingState = pendingRestoreKeyRef.current === stateKey;
      if (!isBack && previousKey && depth > previousDepth) { try { const center = map.getCenter?.(); const zoom = map.getZoom?.(); if (center && typeof zoom === 'number') cameraHistoryRef.current.push({ key: previousKey, center: [Number(center.lng), Number(center.lat)], zoom, bearing: map.getBearing?.(), pitch: map.getPitch?.() }); } catch { /* optional */ } }
      stateKeyRef.current = stateKey; stateDepthRef.current = depth; setGeoError(null); setHover(null);
      if (restore) { pendingRestoreKeyRef.current = stateKey; try { map.flyTo({ center: restore.center, zoom: restore.zoom, bearing: restore.bearing, pitch: restore.pitch, duration: 650 }); } catch { /* optional */ } }
      const preserveCamera = !!restore || restoringExistingState;

      if (level === 'cities') {
        setCityLoading(true); setLayerVisibility(map, FILL_LAYER, false); setLayerVisibility(map, LINE_LAYER, false); setLayerVisibility(map, CITY_LAYER, true); setLayerVisibility(map, CITY_LABEL_LAYER, true);
        try {
          const points = await geocodeCities(nodes, selectedCountry, selectedRegion); if (cancelled) return;
          const features = points.map((point, index) => ({ type: 'Feature' as const, id: `city-${index}-${point.name}`, geometry: { type: 'Point' as const, coordinates: [point.longitude, point.latitude] }, properties: { name: point.name, count: point.count, percentage: point.percentage, hasGuests: point.count > 0, fillColor: heatColor(point.count) } }));
          map.getSource(SOURCE_ID)?.setData?.({ type: 'FeatureCollection', features });
          if (!preserveCamera) {
            if (points.length === 1) { const point = points[0]; try { map.flyTo({ center: [point.longitude, point.latitude], zoom: 10, duration: 800 }); } catch { /* optional */ } }
            else if (points.length > 1) fitBoundsToMap(map, mergeBounds(points.map(point => [point.longitude, point.latitude, point.longitude, point.latitude])), 800, 11);
            else if (selectedRegion) { const admin1 = await loadAdmin1(); const matching = admin1.features.filter(feature => canonicalCountryName(featureRegionCountry(feature.properties || {})).toLowerCase() === canonicalCountryName(selectedCountry || '').toLowerCase() && regionNamesMatch(featureRegionName(feature.properties || {}), selectedRegion)); fitBoundsToMap(map, mergeBounds(matching.map(feature => geometryBounds(feature.geometry))), 700, 9); }
            else if (selectedCountry) { const countries = await loadCountries50m().catch(() => loadCountries110m()); const match = countries.features.find(feature => countryMatches(feature, selectedCountry)); fitBoundsToMap(map, match ? geometryBounds(match.geometry) : null, 700, 9); }
          }
        } finally { if (!cancelled) setCityLoading(false); }
        return;
      }

      setCityLoading(false); setLayerVisibility(map, FILL_LAYER, true); setLayerVisibility(map, LINE_LAYER, level !== 'world'); setLayerVisibility(map, CITY_LAYER, false); setLayerVisibility(map, CITY_LABEL_LAYER, false);
      const worldLevel = level === 'world';
      const regionLevel = level === 'regions' && !!selectedCountry;
      const fc = worldLevel ? await loadWorldCountries() : regionLevel ? await loadAdmin1() : await loadCountries50m().catch(() => loadCountries110m());
      if (cancelled) return;
      let features: FeatureLike[];
      if (regionLevel) {
        const country = selectedCountry!; const countryFeatures = fc.features.filter(feature => canonicalCountryName(featureRegionCountry(feature.properties || {})).toLowerCase() === canonicalCountryName(country).toLowerCase()); if (!countryFeatures.length) throw new Error(`No Admin-1 geometry found for ${country}`);
        features = countryFeatures.map((feature, index) => { const props = feature.properties || {}; const name = featureRegionName(props) || 'Unknown region'; const node = nodes.find(candidate => regionMatchesNode(feature, candidate)); const count = node?.count ?? 0; return { ...feature, id: feature.id ?? `${country}-${index}`, properties: { ...props, name, count, percentage: node?.percentage ?? 0, hasGuests: count > 0, fillColor: heatColor(count) } }; });
      } else {
        features = fc.features.map((feature, index) => { const name = featureCountryName(feature.properties || {}, feature.id ?? feature.properties?.id as string | number | undefined); const continent = getContinent(name); const node = level === 'world' ? nodeByContinent.get(featureContinent(feature, getContinent).toLowerCase()) || null : findNodeForFeature(name, nodes, feature.id) || nodeByCountry.get(canonicalCountryName(name).toLowerCase()) || null; const count = node?.count ?? 0; return { ...feature, id: feature.id ?? index, properties: { ...feature.properties, name, count, percentage: node?.percentage ?? 0, hasGuests: count > 0, fillColor: heatColor(count), isSelected: !!selectedCountry && canonicalCountryName(name).toLowerCase() === canonicalCountryName(selectedCountry).toLowerCase() } }; });
      }
      map.getSource(SOURCE_ID)?.setData?.({ type: 'FeatureCollection', features });
      if (!preserveCamera) {
        if (level === 'world') { const continent = selectedContinent ? normalizeContinent(selectedContinent) : null; fitBoundsToMap(map, continent ? CONTINENT_BOUNDS[continent] : mergeBounds(features.map(feature => geometryBounds(feature.geometry))), 800, continent ? 5 : 2.2); }
        else if (regionLevel) fitBoundsToMap(map, mergeBounds(features.map(feature => geometryBounds(feature.geometry))), 900, 8);
        else if (level === 'countries' && selectedContinent) { const continent = normalizeContinent(selectedContinent); fitBoundsToMap(map, CONTINENT_BOUNDS[continent], 900, 5.2); }
        else if (level === 'countries' && selectedCountry) { const match = features.find(feature => countryMatches(feature, selectedCountry)); fitBoundsToMap(map, match ? geometryBounds(match.geometry) : null, 800, 8); }
        else fitBoundsToMap(map, mergeBounds(features.map(feature => geometryBounds(feature.geometry))), 800, 2.2);
      }
    })().catch(error => { if (!cancelled) setGeoError(error instanceof Error ? error.message : 'Layer update failed'); });
    return () => { cancelled = true; };
  }, [mapReady, nodes, level, selectedContinent, selectedCountry, selectedRegion, nodeByCountry, nodeByContinent, stateKey, getContinent, fitBoundsToMap]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !mapReady) return;
    const onClick = (event: { features?: Array<{ properties?: Record<string, unknown> }> }) => { if (!interactive) return; const feature = event.features?.[0]; const name = feature?.properties?.name ? String(feature.properties.name) : ''; if (!name) return; const count = Number(feature.properties?.count) || 0; if (level === 'cities') { if (onCityClick && count > 0) onCityClick(name); } else if (level === 'world') { const continent = getContinent(name); if (continent !== 'Other' && onContinentClick) onContinentClick(continent); } else if (level === 'countries' && onCountryClick) onCountryClick(name); else if (level === 'regions' && onRegionClick) onRegionClick(name); };
    const onMove = (event: { point?: { x: number; y: number }; features?: Array<{ properties?: Record<string, unknown> }> }) => { const feature = event.features?.[0]; if (!feature?.properties?.name) { setHover(null); return; } setHover({ name: String(feature.properties.name), count: Number(feature.properties.count) || 0, percentage: Number(feature.properties.percentage) || 0, x: event.point?.x ?? 0, y: event.point?.y ?? 0 }); try { map.getCanvas().style.cursor = interactive ? 'pointer' : 'default'; } catch { /* optional */ } };
    const onLeave = () => { setHover(null); try { map.getCanvas().style.cursor = ''; } catch { /* optional */ } };
    for (const layer of [FILL_LAYER, CITY_LAYER]) { map.on('click', layer, onClick); map.on('mousemove', layer, onMove); map.on('mouseleave', layer, onLeave); }
    return () => { try { for (const layer of [FILL_LAYER, CITY_LAYER]) { map.off('click', layer, onClick); map.off('mousemove', layer, onMove); map.off('mouseleave', layer, onLeave); } } catch { /* optional */ } };
  }, [mapReady, interactive, level, onContinentClick, onCountryClick, onRegionClick, onCityClick, getContinent]);

  return (
    <div className="relative w-full h-full min-h-[320px] overflow-hidden rounded-xl border border-stone-200 bg-slate-50">
      <div ref={containerRef} className="w-full h-full" role="application" aria-label="Geographic visitor origin map" />
      {(isLoading || !mapReady || cityLoading) && !geoError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/45 pointer-events-none">
          <div className="text-sm font-medium text-stone-500">{cityLoading ? 'Locating cities…' : t('reports_loading_map_short')}</div>
        </div>
      )}
      {geoError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-50 p-4">
          <p className="max-w-sm text-center text-sm text-stone-600">{geoError}</p>
        </div>
      )}
      {interactive && (onBack || onHome) && (
        <div className="absolute left-3 top-3 z-40 flex items-center gap-1 rounded-xl border border-stone-200 bg-white/95 p-1.5 shadow-lg backdrop-blur-sm">
          {onBack && <button type="button" onClick={onBack} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100">← Back</button>}
          {onHome && <button type="button" onClick={onHome} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-100">World</button>}
        </div>
      )}
      {hover && (
        <div className="pointer-events-none absolute z-50 max-w-[220px] rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-xs text-white shadow-lg" style={{ left: Math.min(hover.x + 12, (containerRef.current?.clientWidth || 300) - 170), top: Math.max(8, hover.y - 8) }} role="tooltip">
          <p className="text-sm font-bold">{hover.name}</p>
          <p className="mt-0.5 text-orange-300">{t('reports_guest_checkins_count', { count: hover.count.toLocaleString() })}</p>
          {hover.percentage > 0 && <p className="text-stone-300">{hover.percentage}%</p>}
        </div>
      )}
      <div className="absolute bottom-3 right-3 z-20 rounded-lg border border-stone-200 bg-white/95 px-2.5 py-1.5 shadow-sm">
        <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-stone-400">{t('reports_guest_density')}</p>
        <div className="flex items-center gap-0.5">
          {['#e5e7eb', '#fed7aa', '#fdba74', '#fb923c', '#ea580c', '#c2410c'].map(color => <span key={color} className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: color }} aria-hidden="true" />)}
        </div>
        <div className="mt-0.5 flex justify-between text-[9px] text-stone-400"><span>{t('reports_density_none')}</span><span>{t('reports_density_high')}</span></div>
      </div>
    </div>
  );
}

export const GeographicMapViewport = memo(GeographicMapViewportInner);
export default GeographicMapViewport;
