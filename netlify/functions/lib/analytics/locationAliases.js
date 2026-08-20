/**
 * Location normalisation for Analytics Intelligence (server-side only).
 * Does NOT mutate guest/booking rows — aggregation only.
 *
 * Order: clean → alias → historical → conservative fuzzy → title-case
 */

/** Collapse for dictionary lookup */
export function collapseKey(value) {
  if (value == null) return '';
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`´’‘]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase();
}

export function toTitleCase(value) {
  if (!value || typeof value !== 'string') return value;
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => {
      if (!w) return w;
      if (/^kzn$/i.test(w)) return 'KZN';
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

export function cleanLocationText(value) {
  if (value == null) return '';
  return String(value)
    .normalize('NFKC')
    .replace(/[''`´’‘]/g, "'")
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\.$/, '')
    .trim();
}

/** Country aliases → canonical */
export const countryAliases = {
  sa: 'South Africa',
  rsa: 'South Africa',
  southafrica: 'South Africa',
  zaf: 'South Africa',
  us: 'United States',
  usa: 'United States',
  unitedstates: 'United States',
  unitedstatesofamerica: 'United States',
  america: 'United States',
  uk: 'United Kingdom',
  gb: 'United Kingdom',
  greatbritain: 'United Kingdom',
  britain: 'United Kingdom',
  england: 'United Kingdom',
  scotland: 'United Kingdom',
  wales: 'United Kingdom',
  uae: 'United Arab Emirates',
  holland: 'Netherlands',
  netherlands: 'Netherlands',
  czechia: 'Czech Republic',
  czechrepublic: 'Czech Republic',
  australia: 'Australia',
  aus: 'Australia',
  newzealand: 'New Zealand',
  nz: 'New Zealand',
  germany: 'Germany',
  deutschland: 'Germany',
  france: 'France',
  namibia: 'Namibia',
  botswana: 'Botswana',
  zimbabwe: 'Zimbabwe',
  mozambique: 'Mozambique',
  drc: 'Democratic Republic of the Congo',
  cd: 'Democratic Republic of the Congo',
  democraticrepublicofcongo: 'Democratic Republic of the Congo',
  democraticrepublicofthecongo: 'Democratic Republic of the Congo',
  congodr: 'Democratic Republic of the Congo',
};

/** Province / state aliases */
export const provinceAliases = {
  easterncape: 'Eastern Cape',
  ecape: 'Eastern Cape',
  ec: 'Eastern Cape',
  westerncape: 'Western Cape',
  wcape: 'Western Cape',
  wc: 'Western Cape',
  northerncape: 'Northern Cape',
  ncape: 'Northern Cape',
  nc: 'Northern Cape',
  kwazulunatal: 'KwaZulu-Natal',
  kzn: 'KwaZulu-Natal',
  natal: 'KwaZulu-Natal',
  gauteng: 'Gauteng',
  gp: 'Gauteng',
  freestate: 'Free State',
  fs: 'Free State',
  limpopo: 'Limpopo',
  lp: 'Limpopo',
  mpumalanga: 'Mpumalanga',
  mp: 'Mpumalanga',
  northwest: 'North West',
  nw: 'North West',
};

/**
 * City aliases + historical renames → current official / preferred analytics name.
 * Historical SA names map to current names.
 */
export const cityAliases = {
  jeffreysbay: 'Jeffreys Bay',
  jeffreybay: 'Jeffreys Bay',
  jeffreysbai: 'Jeffreys Bay',
  jbay: 'Jeffreys Bay',
  portelizabeth: 'Gqeberha',
  portelisabeth: 'Gqeberha',
  pe: 'Gqeberha',
  gqeberha: 'Gqeberha',
  gqeberga: 'Gqeberha',
  pietersburg: 'Polokwane',
  polokwane: 'Polokwane',
  nelspruit: 'Mbombela',
  mbombela: 'Mbombela',
  louistrichardt: 'Makhado',
  makhado: 'Makhado',
  warmbaths: 'Bela-Bela',
  belabela: 'Bela-Bela',
  potgietersrus: 'Mokopane',
  mokopane: 'Mokopane',
  plettenbergbay: 'Plettenberg Bay',
  plettenburgbay: 'Plettenberg Bay',
  plett: 'Plettenberg Bay',
  thornhill: 'Thornhill',
  thornhil: 'Thornhill',
  capetown: 'Cape Town',
  capetwn: 'Cape Town',
  johannesburg: 'Johannesburg',
  joburg: 'Johannesburg',
  jozi: 'Johannesburg',
  pretoria: 'Pretoria',
  tshwane: 'Pretoria',
  durban: 'Durban',
  eastlondon: 'East London',
  knysna: 'Knysna',
  knisna: 'Knysna',
  mosselbay: 'Mossel Bay',
  george: 'George',
  portalfred: 'Port Alfred',
  stfrancis: 'St Francis Bay',
  stfrancisbay: 'St Francis Bay',
  capestfrancis: 'Cape St Francis',
  humansdorp: 'Humansdorp',
  hankey: 'Hankey',
  patensie: 'Patensie',
};

const CANONICAL_CITIES = [
  ...new Set(Object.values(cityAliases)),
];

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

export function fuzzyMatchCity(raw) {
  const cleaned = cleanLocationText(raw);
  if (!cleaned || cleaned.length < 4) return null;
  const key = collapseKey(cleaned);
  if (!key || key.length < 4) return null;

  let best = null;
  let bestDist = Infinity;
  for (const canonical of CANONICAL_CITIES) {
    const ck = collapseKey(canonical);
    if (!ck) continue;
    if (ck[0] !== key[0]) continue;
    const dist = levenshtein(key, ck);
    const maxLen = Math.max(key.length, ck.length);
    const maxDist = maxLen <= 7 ? 1 : 2;
    if (dist <= maxDist && dist < bestDist) {
      bestDist = dist;
      best = canonical;
    }
  }
  if (best && bestDist > 0 && bestDist <= 2) return best;
  return null;
}

function resolveFromMap(aliasMap, raw, { allowUnknownTitle = true } = {}) {
  const cleaned = cleanLocationText(raw);
  if (!cleaned) return allowUnknownTitle ? 'Unknown' : '';
  const key = collapseKey(cleaned);
  if (aliasMap[key]) return aliasMap[key];
  return allowUnknownTitle ? toTitleCase(cleaned) || 'Unknown' : toTitleCase(cleaned);
}

export function resolveCountryAlias(raw) {
  return resolveFromMap(countryAliases, raw);
}

export function resolveProvinceAlias(raw) {
  return resolveFromMap(provinceAliases, raw);
}

export function resolveCityAlias(raw) {
  const cleaned = cleanLocationText(raw);
  if (!cleaned) return 'Unknown';
  const key = collapseKey(cleaned);
  if (cityAliases[key]) return cityAliases[key];
  const fuzzy = fuzzyMatchCity(cleaned);
  if (fuzzy) return fuzzy;
  return toTitleCase(cleaned) || 'Unknown';
}

export function resolvePlaceAlias(raw) {
  const cleaned = cleanLocationText(raw);
  if (!cleaned) return '';
  const key = collapseKey(cleaned);
  if (cityAliases[key]) return cityAliases[key];
  if (provinceAliases[key]) return provinceAliases[key];
  if (countryAliases[key]) return countryAliases[key];
  const fuzzy = fuzzyMatchCity(cleaned);
  if (fuzzy) return fuzzy;
  return toTitleCase(cleaned);
}

export const historicalCityNames = {
  portelizabeth: 'Gqeberha',
  pietersburg: 'Polokwane',
  nelspruit: 'Mbombela',
  louistrichardt: 'Makhado',
  warmbaths: 'Bela-Bela',
  potgietersrus: 'Mokopane',
};
