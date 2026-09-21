/**
 * Lazy-load and cache static GeoJSON/TopoJSON for MapLibre.
 */

import { feature as topoFeature } from 'topojson-client';
import { GEO_PATHS } from './mapConfig';
import { canonicalCountryName } from './nameMatch';

export type CountryFeatureProps = {
  name: string;
  count: number;
  percentage: number;
  hasGuests: boolean;
};

type GeoJSONFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id?: string | number;
    properties: Record<string, unknown>;
    geometry: GeoJSON.Geometry;
  }>;
};

export type CityPoint = {
  name: string;
  latitude: number;
  longitude: number;
  count: number;
  percentage: number;
  code?: string;
};

const cache = new Map<string, GeoJSONFeatureCollection>();
const cityCache = new Map<string, CityPoint | null>();

const ONS_ITL1_GEOJSON = 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/ITL1_JAN_2025_UK_BGC/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson';

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load geo ${url}: ${res.status}`);
  return res.json();
}

/**
 * World/continent view uses Natural Earth country geometry. If that source is
 * temporarily unavailable, fall back to the bundled world-atlas geometry so
 * the drill-down remains usable.
 */
export async function loadWorldCountries(): Promise<GeoJSONFeatureCollection> {
  const key = 'world-110m-world-atlas';
  if (cache.has(key)) return cache.get(key)!;
  const fc = await loadCountries110m();
  cache.set(key, fc);
  return fc;
}

export async function loadCountries110m(): Promise<GeoJSONFeatureCollection> {
  const key = 'countries-110m';
  if (cache.has(key)) return cache.get(key)!;
  const topo = await fetchJson(GEO_PATHS.countries110m);
  const fc = topoFeature(topo, topo.objects.countries) as unknown as GeoJSONFeatureCollection;
  cache.set(key, fc);
  return fc;
}

export async function loadCountries50m(): Promise<GeoJSONFeatureCollection> {
  const key = 'countries-50m';
  if (cache.has(key)) return cache.get(key)!;
  const topo = await fetchJson(GEO_PATHS.countries50m);
  const fc = topoFeature(topo, topo.objects.countries) as unknown as GeoJSONFeatureCollection;
  cache.set(key, fc);
  return fc;
}

/** Global first-order administrative boundaries (Natural Earth Admin-1). */
export async function loadAdmin1(): Promise<GeoJSONFeatureCollection> {
  const key = 'admin1';
  if (cache.has(key)) return cache.get(key)!;
  const fc = await fetchJson(GEO_PATHS.admin1) as GeoJSONFeatureCollection;
  cache.set(key, fc);
  return fc;
}

/**
 * Load second-order administrative boundaries for a country from geoBoundaries.
 * The endpoint returns metadata first so we can use the current simplified
 * GeoJSON rather than hard-coding country-specific download URLs.
 */
export async function loadAdmin2(countryIso3: string): Promise<GeoJSONFeatureCollection> {
  const iso3 = String(countryIso3 || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(iso3)) throw new Error('Invalid country ISO-3 code');
  const key = `admin2-${iso3}`;
  if (cache.has(key)) return cache.get(key)!;
  const metadata = await fetchJson(`https://www.geoboundaries.org/api/current/gbOpen/${iso3}/ADM2/`) as { gjDownloadURL?: string };
  if (!metadata?.gjDownloadURL) throw new Error(`No Admin-2 geometry available for ${iso3}`);
  const fc = await fetchJson(metadata.gjDownloadURL) as GeoJSONFeatureCollection;
  cache.set(key, fc);
  return fc;
}

export function featureAdmin2Name(props: Record<string, unknown>): string {
  const candidates = [
    props.shapeName, props.SHAPENAME, props.name_en, props.NAME_2,
    props.NAME_1, props.name, props.NAME, props.name_alt, props.NAME_ALT,
  ];
  const named = candidates.find((value) => typeof value === 'string' && value.trim());
  return typeof named === 'string' ? named.trim() : '';
}

/** Official ONS 2025 UK ITL1 boundaries (the nine English regions plus the UK nations). */
export async function loadUkItl1(): Promise<GeoJSONFeatureCollection> {
  const key = 'uk-itl1-2025';
  if (cache.has(key)) return cache.get(key)!;
  const fc = await fetchJson(ONS_ITL1_GEOJSON) as GeoJSONFeatureCollection;
  cache.set(key, fc);
  return fc;
}

export function featureItl1Name(props: Record<string, unknown>): string {
  const candidates = [props.ITL125NM, props.ITL1NM, props.name_en, props.NAME_EN, props.name, props.NAME];
  const named = candidates.find((value) => typeof value === 'string' && value.trim());
  return typeof named === 'string' ? named.trim() : '';
}

/**
 * Resolve city names to real WGS84 coordinates for the city drill-down.
 * Open-Meteo's geocoder accepts a city plus country/admin-1 qualifier and
 * returns latitude/longitude; results are cached for the session.
 *
 * Requests are deliberately bounded instead of being sent sequentially or
 * all at once. This keeps city drill-down responsive without flooding the
 * geocoder when a property has many cities.
 */
export async function geocodeCities(
  nodes: Array<{ name: string; count: number; percentage: number; code?: string }>,
  country?: string | null,
  region?: string | null,
): Promise<CityPoint[]> {
  const unique = nodes.filter((node) => node.name && node.count > 0);
  const results: CityPoint[] = [];
  const qualifier = [region, country].filter(Boolean).join(', ');
  const pending: Array<{ node: (typeof unique)[number]; key: string }> = [];

  for (const node of unique) {
    const key = `${node.name}|${qualifier}`.toLowerCase();
    if (cityCache.has(key)) {
      const cached = cityCache.get(key);
      if (cached) results.push({ ...cached, count: node.count, percentage: node.percentage, code: node.code });
    } else pending.push({ node, key });
  }

  const resolveCity = async ({ node, key }: (typeof pending)[number]): Promise<CityPoint | null> => {
    try {
      const query = encodeURIComponent(qualifier ? `${node.name}, ${qualifier}` : node.name);
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=en&format=json`);
      if (!response.ok) { cityCache.set(key, null); return null; }
      const payload = await response.json() as { results?: Array<{ name?: string; latitude?: number; longitude?: number; country?: string; admin1?: string }> };
      const candidates = payload.results || [];
      const exact = candidates.find((candidate) =>
        typeof candidate.latitude === 'number' && typeof candidate.longitude === 'number' &&
        candidate.name?.toLowerCase() === node.name.toLowerCase() &&
        (!region || candidate.admin1?.toLowerCase() === region.toLowerCase()) &&
        (!country || canonicalCountryName(candidate.country).toLowerCase() === canonicalCountryName(country).toLowerCase()),
      ) || candidates.find((candidate) => typeof candidate.latitude === 'number' && typeof candidate.longitude === 'number');
      if (!exact || typeof exact.latitude !== 'number' || typeof exact.longitude !== 'number') { cityCache.set(key, null); return null; }
      const point: CityPoint = { name: node.name, latitude: exact.latitude, longitude: exact.longitude, count: node.count, percentage: node.percentage, code: node.code };
      cityCache.set(key, point);
      return point;
    } catch { cityCache.set(key, null); return null; }
  };

  const concurrency = 6;
  for (let start = 0; start < pending.length; start += concurrency) {
    const batchResults = await Promise.all(pending.slice(start, start + concurrency).map(resolveCity));
    batchResults.forEach((point) => { if (point) results.push(point); });
  }
  return results;
}

export const ISO_NUMERIC_TO_NAME: Record<string, string> = {
  '710': 'South Africa', '756': 'Switzerland', '032': 'Argentina', '036': 'Australia', '276': 'Germany', '528': 'Netherlands', '124': 'Canada', '840': 'United States',
  '826': 'United Kingdom', '250': 'France', '380': 'Italy', '724': 'Spain', '076': 'Brazil', '156': 'China', '356': 'India', '392': 'Japan', '554': 'New Zealand', '516': 'Namibia',
  '072': 'Botswana', '716': 'Zimbabwe', '508': 'Mozambique', '426': 'Lesotho', '748': 'Eswatini', '404': 'Kenya', '566': 'Nigeria', '818': 'Egypt', '504': 'Morocco', '040': 'Austria',
  '056': 'Belgium', '620': 'Portugal', '752': 'Sweden', '578': 'Norway', '208': 'Denmark', '246': 'Finland', '300': 'Greece', '372': 'Ireland', '616': 'Poland', '643': 'Russia',
  '792': 'Turkey', '203': 'Czechia', '348': 'Hungary', '642': 'Romania', '100': 'Bulgaria', '191': 'Croatia', '804': 'Ukraine', '484': 'Mexico', '152': 'Chile', '170': 'Colombia',
  '604': 'Peru', '410': 'South Korea', '702': 'Singapore', '458': 'Malaysia', '360': 'Indonesia', '764': 'Thailand', '704': 'Vietnam', '608': 'Philippines', '784': 'United Arab Emirates',
  '682': 'Saudi Arabia', '376': 'Israel', '586': 'Pakistan', '050': 'Bangladesh', '242': 'Fiji',
};

export function featureCountryName(props: Record<string, unknown>, id?: string | number): string {
  const propertyCandidates = [props?.name, props?.NAME, props?.name_en, props?.NAME_EN, props?.admin, props?.ADMIN, props?.admin_name, props?.ADMIN_NAME, props?.sovereignt, props?.SOVEREIGNT];
  const named = propertyCandidates.find((value) => typeof value === 'string' && value.trim());
  if (named) return String(named).trim();
  const sid = String(id ?? props?.id ?? '').trim();
  const numeric = ISO_NUMERIC_TO_NAME[sid] || ISO_NUMERIC_TO_NAME[sid.padStart(3, '0')];
  if (numeric) return numeric;
  const iso2 = String(props?.ISO_A2 ?? props?.iso_a2 ?? props?.ISO2 ?? '').trim().toUpperCase();
  const iso2ToCountry: Record<string, string> = { ZA: 'South Africa', CH: 'Switzerland', AR: 'Argentina', AU: 'Australia', DE: 'Germany', NL: 'Netherlands', GB: 'United Kingdom', IT: 'Italy', NA: 'Namibia', BW: 'Botswana', CD: 'Democratic Republic of the Congo', FR: 'France', ES: 'Spain', BR: 'Brazil', CN: 'China', IN: 'India', JP: 'Japan', US: 'United States', CA: 'Canada', NZ: 'New Zealand', MX: 'Mexico', CL: 'Chile', CO: 'Colombia', PE: 'Peru' };
  if (iso2ToCountry[iso2]) return iso2ToCountry[iso2];
  return sid || 'Unknown';
}

function normalizeRegionLookupKey(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[–—-]+/g, '-').replace(/\s+/g, ' ');
}

export function featureRegionName(props: Record<string, unknown>): string {
  const candidates = [props?.name_en, props?.NAME_EN, props?.name, props?.NAME_1, props?.NAME];
  const named = candidates.find((value) => typeof value === 'string' && value.trim());
  return typeof named === 'string' ? named.trim() : '';
}

export function featureRegionCountry(props: Record<string, unknown>): string {
  const value = props?.admin ?? props?.ADMIN ?? props?.admin_name ?? props?.NAME_0;
  return typeof value === 'string' ? canonicalCountryName(value) : '';
}

export function featureRegionCode(props: Record<string, unknown>): string {
  const value = props?.iso_3166_2 ?? props?.ISO_3166_2 ?? props?.code;
  return typeof value === 'string' ? value : '';
}


export const UK_ENGLAND_ITL1_REGIONS = [
  'North East (England)', 'North West (England)', 'Yorkshire and The Humber',
  'East Midlands (England)', 'West Midlands (England)', 'East (England)',
  'London', 'South East (England)', 'South West (England)',
] as const;

export function isUkEnglandItl1Region(value: string | null | undefined): boolean {
  return !!value && (UK_ENGLAND_ITL1_REGIONS as readonly string[]).some((name) => normalizeRegionLookupKey(name) === normalizeRegionLookupKey(value));
}


/** Official UK drill-down geometry: England, Scotland, Wales and Northern Ireland. */
export async function loadUkConstituentCountries(): Promise<GeoJSONFeatureCollection> {
  const key = 'uk-constituent-countries-2025';
  if (cache.has(key)) return cache.get(key)!;

  const itl1 = await loadUkItl1();
  const constituentNames = new Set(['Scotland', 'Wales', 'Northern Ireland']);
  const englandFeatures = itl1.features.filter((feature) =>
    isUkEnglandItl1Region(featureItl1Name(feature.properties || {}))
  );
  const directFeatures = itl1.features.filter((feature) =>
    constituentNames.has(featureItl1Name(feature.properties || {}))
  );

  const englandPolygons: GeoJSON.Position[][][] = [];
  englandFeatures.forEach((feature) => {
    if (feature.geometry.type === 'Polygon') {
      englandPolygons.push(feature.geometry.coordinates);
    } else if (feature.geometry.type === 'MultiPolygon') {
      feature.geometry.coordinates.forEach((polygon) => englandPolygons.push(polygon));
    }
  });

  const features = [
    {
      type: 'Feature' as const,
      id: 'uk-england',
      properties: { ...Object.fromEntries([['ITL1NM', 'England']]), name: 'England' },
      geometry: { type: 'MultiPolygon' as const, coordinates: englandPolygons },
    },
    ...directFeatures.map((feature, index) => ({
      ...feature,
      id: feature.id ?? `uk-constituent-${index}`,
      properties: { ...feature.properties, name: featureItl1Name(feature.properties || {}) },
    })),
  ];

  const fc = { type: 'FeatureCollection' as const, features };
  cache.set(key, fc);
  return fc;
}
