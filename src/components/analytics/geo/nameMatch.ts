/**
 * Display-side join between analytics country nodes and GeoJSON features.
 * Matching is exact after canonicalisation, with ISO-code fallback for
 * datasets whose feature names differ from the analytics display names.
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

const ISO_TO_COUNTRY: Record<string, string> = {
  ZA: 'South Africa', CH: 'Switzerland', AR: 'Argentina', AU: 'Australia',
  DE: 'Germany', NL: 'Netherlands', GB: 'United Kingdom', IT: 'Italy',
  NA: 'Namibia', BW: 'Botswana', CD: 'Democratic Republic of the Congo',
};

export function canonicalCountryName(raw: string | null | undefined): string {
  if (!raw) return '';
  const t = String(raw).trim();
  if (!t) return '';
  const key = t.toLowerCase();
  return COUNTRY_ALIASES[key] || t;
}

export function namesMatch(a: string, b: string): boolean {
  const ca = canonicalCountryName(a).toLowerCase();
  const cb = canonicalCountryName(b).toLowerCase();
  if (!ca || !cb) return false;
  return ca === cb;
}

/**
 * Match a GeoJSON feature to an analytics country node.
 * Name matching is attempted first; ISO code is an exact fallback.
 */
export function findNodeForFeature(
  featureName: string,
  nodes: { name: string; count: number; percentage?: number; code?: string }[],
  featureId?: string | number
): { name: string; count: number; percentage?: number; code?: string } | null {
  const direct = nodes.find((n) => namesMatch(n.name, featureName));
  if (direct) return direct;

  const rawCode = String(featureId ?? '').trim().toUpperCase();
  const iso = ISO_TO_COUNTRY[rawCode];
  if (iso) {
    const byIso = nodes.find((n) => String(n.code || '').trim().toUpperCase() === rawCode);
    if (byIso) return byIso;
    const byCanonicalIsoName = nodes.find((n) => namesMatch(n.name, iso));
    if (byCanonicalIsoName) return byCanonicalIsoName;
  }

  return null;
}
