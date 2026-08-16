/**
 * Display-side join between analytics node names and GeoJSON / TopoJSON properties.
 * Does not mutate server aliases or booking data.
 */

const COUNTRY_ALIASES: Record<string, string> = {
  'united states of america': 'United States',
  'united states': 'United States',
  usa: 'United States',
  us: 'United States',
  uk: 'United Kingdom',
  'great britain': 'United Kingdom',
  'russian federation': 'Russia',
  'korea, republic of': 'South Korea',
  'republic of korea': 'South Korea',
  'czech republic': 'Czechia',
  czechia: 'Czechia',
  swaziland: 'Eswatini',
  "côte d'ivoire": 'Ivory Coast',
  "cote d'ivoire": 'Ivory Coast',
  'viet nam': 'Vietnam',
  syria: 'Syria',
  iran: 'Iran',
  tanzania: 'Tanzania',
  bolivia: 'Bolivia',
  venezuela: 'Venezuela',
  'brunei darussalam': 'Brunei',
  "laos people's democratic republic": 'Laos',
  'democratic republic of the congo': 'Democratic Republic of the Congo',
  'democratic republic of congo': 'Democratic Republic of the Congo',
  drc: 'Democratic Republic of the Congo',
  'congo, democratic republic of the': 'Democratic Republic of the Congo',
  'republic of the congo': 'Congo',
  'republic of congo': 'Congo',
  'congo-brazzaville': 'Congo',
  'congo brazzaville': 'Congo',
  'south africa': 'South Africa',
};

export function canonicalCountryName(raw: string | null | undefined): string {
  if (!raw) return '';
  const t = String(raw).trim();
  if (!t) return '';
  const key = t.toLowerCase();
  return COUNTRY_ALIASES[key] || t;
}

/**
 * Match country names only after canonicalisation.
 *
 * IMPORTANT: do not use substring matching here. A continent node such as
 * "Africa" otherwise matches "Central African Republic" and "South Africa",
 * causing the continent's total visitor count to be displayed on a country.
 */
export function namesMatch(a: string, b: string): boolean {
  const ca = canonicalCountryName(a).toLowerCase();
  const cb = canonicalCountryName(b).toLowerCase();
  if (!ca || !cb) return false;
  return ca === cb;
}

/** Match analytics country name to TopoJSON feature properties.name */
export function findNodeForFeature(
  featureName: string,
  nodes: { name: string; count: number; percentage?: number }[]
): { name: string; count: number; percentage?: number } | null {
  const direct = nodes.find((n) => namesMatch(n.name, featureName));
  return direct || null;
}
