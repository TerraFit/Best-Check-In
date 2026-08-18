/**
 * Lazy-load and cache static GeoJSON/TopoJSON for MapLibre.
 */

import { feature as topoFeature } from 'topojson-client';
import { GEO_PATHS } from './mapConfig';

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

const cache = new Map<string, GeoJSONFeatureCollection>();

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load geo ${url}: ${res.status}`);
  return res.json();
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

export const ISO_NUMERIC_TO_NAME: Record<string, string> = {
  '710': 'South Africa', '756': 'Switzerland', '032': 'Argentina', '036': 'Australia',
  '276': 'Germany', '528': 'Netherlands', '124': 'Canada', '840': 'United States',
  '826': 'United Kingdom', '250': 'France', '380': 'Italy', '724': 'Spain', '076': 'Brazil',
  '156': 'China', '356': 'India', '392': 'Japan', '554': 'New Zealand', '516': 'Namibia',
  '072': 'Botswana', '716': 'Zimbabwe', '508': 'Mozambique', '426': 'Lesotho', '748': 'Eswatini',
  '404': 'Kenya', '566': 'Nigeria', '818': 'Egypt', '504': 'Morocco', '040': 'Austria',
  '056': 'Belgium', '620': 'Portugal', '752': 'Sweden', '578': 'Norway', '208': 'Denmark',
  '246': 'Finland', '300': 'Greece', '372': 'Ireland', '616': 'Poland', '643': 'Russia',
  '792': 'Turkey', '203': 'Czechia', '348': 'Hungary', '642': 'Romania', '100': 'Bulgaria',
  '191': 'Croatia', '804': 'Ukraine', '484': 'Mexico', '152': 'Chile', '170': 'Colombia',
  '604': 'Peru', '410': 'South Korea', '702': 'Singapore', '458': 'Malaysia', '360': 'Indonesia',
  '764': 'Thailand', '704': 'Vietnam', '608': 'Philippines', '784': 'United Arab Emirates',
  '682': 'Saudi Arabia', '376': 'Israel', '586': 'Pakistan', '050': 'Bangladesh', '242': 'Fiji',
};

export function featureCountryName(props: Record<string, unknown>, id?: string | number): string {
  const sid = String(id ?? props?.id ?? '').trim();
  const numeric = ISO_NUMERIC_TO_NAME[sid] || ISO_NUMERIC_TO_NAME[sid.padStart(3, '0')];
  if (numeric) return numeric;
  if (props?.name && typeof props.name === 'string') return props.name;
  if (props?.NAME && typeof props.NAME === 'string') return props.NAME;
  if (props?.ADMIN && typeof props.ADMIN === 'string') return props.ADMIN;
  return sid || 'Unknown';
}

/** Natural Earth Admin-1 uses `name`, `admin`, `iso_3166_2`, and `adm0_a3`. */
export function featureRegionName(props: Record<string, unknown>): string {
  const value = props?.name ?? props?.NAME_1 ?? props?.name_en ?? props?.NAME;
  return typeof value === 'string' ? value : '';
}

export function featureRegionCountry(props: Record<string, unknown>): string {
  const value = props?.admin ?? props?.ADMIN ?? props?.admin_name ?? props?.NAME_0;
  return typeof value === 'string' ? value : '';
}

export function featureRegionCode(props: Record<string, unknown>): string {
  const value = props?.iso_3166_2 ?? props?.ISO_3166_2 ?? props?.code;
  return typeof value === 'string' ? value : '';
}
