/**
 * Display-side joins between analytics nodes and GeoJSON features.
 * Matching is tolerant of accents, punctuation, spelling variants and
 * common translated Admin-1 names while retaining ISO-code fallbacks.
 */

const COUNTRY_ALIASES: Record<string, string> = {
  'united states of america': 'United States', 'united states': 'United States', usa: 'United States', us: 'United States',
  uk: 'United Kingdom', 'great britain': 'United Kingdom',
  'russian federation': 'Russia', 'korea, republic of': 'South Korea', 'republic of korea': 'South Korea',
  'czech republic': 'Czechia', czechia: 'Czechia', swaziland: 'Eswatini',
  "côte d'ivoire": 'Ivory Coast', "cote d'ivoire": 'Ivory Coast', 'viet nam': 'Vietnam',
  syria: 'Syria', iran: 'Iran', tanzania: 'Tanzania', bolivia: 'Bolivia', venezuela: 'Venezuela',
  'brunei darussalam': 'Brunei', "laos people's democratic republic": 'Laos',
  'democratic republic of the congo': 'Democratic Republic of the Congo',
  'democratic republic of congo': 'Democratic Republic of the Congo', drc: 'Democratic Republic of the Congo',
  'congo, democratic republic of the': 'Democratic Republic of the Congo',
  'republic of the congo': 'Congo', 'republic of congo': 'Congo', 'congo-brazzaville': 'Congo',
  'congo brazzaville': 'Congo', 'south africa': 'South Africa',
};

const ISO_TO_COUNTRY: Record<string, string> = {
  ZA: 'South Africa', CH: 'Switzerland', AR: 'Argentina', AU: 'Australia', DE: 'Germany',
  NL: 'Netherlands', GB: 'United Kingdom', IT: 'Italy', NA: 'Namibia', BW: 'Botswana',
  CD: 'Democratic Republic of the Congo',
};

const NUMERIC_TO_ISO: Record<string, string> = {
  '710': 'ZA', '756': 'CH', '032': 'AR', '036': 'AU', '276': 'DE', '528': 'NL',
  '826': 'GB', '380': 'IT', '516': 'NA', '072': 'BW', '180': 'CD',
};

const REGION_ALIASES: Record<string, string> = {
  'north rhine westphalia': 'north rhine westphalia',
  'north rhine-westphalia': 'north rhine westphalia',
  'north rine westphalia': 'north rhine westphalia',
  'north rhine': 'north rhine westphalia',
  'nordrhein westfalen': 'north rhine westphalia',
  'nordrhein-westfalen': 'north rhine westphalia',
  'baden wurttemberg': 'baden wurttemberg',
  'baden württemberg': 'baden wurttemberg',
  'baden-württemberg': 'baden wurttemberg',
  'baden wurttemburg': 'baden wurttemberg',
  'baden württemburg': 'baden wurttemberg',
  'bavaria': 'bavaria',
  'bayern': 'bavaria',
};

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Stable comparison key for Admin-1 names from analytics and GeoJSON. */
export function canonicalRegionName(raw: string | null | undefined): string {
  if (!raw) return '';
  const normalized = stripDiacritics(String(raw).trim().toLowerCase())
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[._/]+/g, ' ')
    .replace(/[-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return REGION_ALIASES[normalized] || normalized;
}

export function regionNamesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const ca = canonicalRegionName(a);
  const cb = canonicalRegionName(b);
  return !!ca && !!cb && (ca === cb || ca.startsWith(`${cb} `) || cb.startsWith(`${ca} `));
}

export function canonicalCountryName(raw: string | null | undefined): string {
  if (!raw) return '';
  const t = String(raw).trim();
  if (!t) return '';
  const lower = t.toLowerCase();
  if (COUNTRY_ALIASES[lower]) return COUNTRY_ALIASES[lower];
  const upper = t.toUpperCase();
  if (ISO_TO_COUNTRY[upper]) return ISO_TO_COUNTRY[upper];
  if (NUMERIC_TO_ISO[t] && ISO_TO_COUNTRY[NUMERIC_TO_ISO[t]]) return ISO_TO_COUNTRY[NUMERIC_TO_ISO[t]];
  return t;
}

export function namesMatch(a: string, b: string): boolean {
  const ca = canonicalCountryName(a).toLowerCase();
  const cb = canonicalCountryName(b).toLowerCase();
  return !!ca && !!cb && ca === cb;
}

/** Match a GeoJSON feature to an analytics country node. */
export function findNodeForFeature(
  featureName: string,
  nodes: { name: string; count: number; percentage?: number; code?: string }[],
  featureId?: string | number
): { name: string; count: number; percentage?: number; code?: string } | null {
  const direct = nodes.find((n) => namesMatch(n.name, featureName));
  if (direct) return direct;

  const rawId = String(featureId ?? '').trim().padStart(3, '0');
  const iso = NUMERIC_TO_ISO[rawId] || rawId;
  if (ISO_TO_COUNTRY[iso]) {
    return nodes.find((n) => String(n.code || '').trim().toUpperCase() === iso)
      || nodes.find((n) => namesMatch(n.name, ISO_TO_COUNTRY[iso]))
      || null;
  }
  return null;
}
