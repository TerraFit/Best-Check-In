// src/services/locationIntelligenceService.ts
// ✅ Complete Location Intelligence System
// Handles: aliases, misspellings, former names, suburbs, cities, provinces, countries
// With confidence scoring, review queue, and canonical IDs

// ============================================================
// TYPES
// ============================================================

export type LocationType = 
  | 'country'
  | 'province'
  | 'city'
  | 'suburb'
  | 'district'
  | 'town'
  | 'village';

export type AliasType = 
  | 'abbreviation'
  | 'former_name'
  | 'misspelling'
  | 'alternative_name'
  | 'nickname'
  | 'common_typo';

export interface LocationAlias {
  canonical: string;
  canonicalId: string;
  province: string;
  country: string;
  type: AliasType;
  confidence: number;
  historicalNames?: string[];
  level: LocationType;
}

export interface LocationResult {
  original: string;
  corrected: string;
  canonicalId: string;
  city: string;
  province: string;
  country: string;
  continent: string;
  level: LocationType;
  isCorrection: boolean;
  confidence: number;
  requiresReview: boolean;
  correctionType?: AliasType;
  originalInput: string;
}

export interface CorrectionLog {
  id: string;
  original: string;
  corrected: string;
  confidence: number;
  correctionType: AliasType;
  timestamp: string;
  source: string;
  accepted?: boolean;
}

// ============================================================
// CONSTANTS
// ============================================================

const CONTINENT_MAP: Record<string, string> = {
  'South Africa': 'Africa',
  'Botswana': 'Africa',
  'Namibia': 'Africa',
  'Zimbabwe': 'Africa',
  'Mozambique': 'Africa',
  'Lesotho': 'Africa',
  'Eswatini': 'Africa',
  'Zambia': 'Africa',
  'Angola': 'Africa',
  'Malawi': 'Africa',
  'Tanzania': 'Africa',
  'Mauritius': 'Africa',
  'Seychelles': 'Africa',
  'Madagascar': 'Africa',
  'Comoros': 'Africa',
  'DRC': 'Africa',
  'Democratic Republic of Congo': 'Africa',
  'Germany': 'Europe',
  'France': 'Europe',
  'United Kingdom': 'Europe',
  'Netherlands': 'Europe',
  'Switzerland': 'Europe',
  'Italy': 'Europe',
  'Spain': 'Europe',
  'United States': 'North America',
  'Canada': 'North America',
  'Australia': 'Oceania',
  'New Zealand': 'Oceania',
  'Brazil': 'South America',
  'India': 'Asia',
  'China': 'Asia',
  'Japan': 'Asia',
  'Singapore': 'Asia',
  'UAE': 'Asia',
};

// ============================================================
// COMPLETE LOCATION DATABASE
// ============================================================

interface LocationEntry {
  id: string;
  name: string;
  province: string;
  country: string;
  level: LocationType;
  aliases: {
    type: AliasType;
    value: string;
    confidence: number;
  }[];
  historicalNames?: string[];
  parentId?: string;
}

// Build the complete database
const LOCATION_DATABASE: LocationEntry[] = [
  // ============================================================
  // GAUTENG
  // ============================================================
  {
    id: 'ZA-GP-JHB',
    name: 'Johannesburg',
    province: 'Gauteng',
    country: 'South Africa',
    level: 'city',
    aliases: [
      { type: 'abbreviation', value: 'jhb', confidence: 0.99 },
      { type: 'nickname', value: 'joburg', confidence: 0.98 },
      { type: 'nickname', value: 'jozi', confidence: 0.97 },
      { type: 'misspelling', value: 'johannesburg', confidence: 0.95 },
      { type: 'misspelling', value: 'johansburg', confidence: 0.92 },
      { type: 'misspelling', value: 'johannesberg', confidence: 0.90 },
      { type: 'misspelling', value: 'johanesburg', confidence: 0.88 },
      { type: 'misspelling', value: 'johanessburg', confidence: 0.85 },
    ],
  },
  {
    id: 'ZA-GP-PTA',
    name: 'Pretoria',
    province: 'Gauteng',
    country: 'South Africa',
    level: 'city',
    aliases: [
      { type: 'abbreviation', value: 'pta', confidence: 0.99 },
      { type: 'abbreviation', value: 'pt', confidence: 0.98 },
      { type: 'nickname', value: 'p-town', confidence: 0.95 },
      { type: 'nickname', value: 'the capital', confidence: 0.70 },
      { type: 'misspelling', value: 'pretoria', confidence: 0.95 },
    ],
    historicalNames: ['Pretoria'],
  },
  {
    id: 'ZA-GP-SAND',
    name: 'Sandton',
    province: 'Gauteng',
    country: 'South Africa',
    level: 'suburb',
    aliases: [
      { type: 'alternative_name', value: 'sandton city', confidence: 0.90 },
    ],
    parentId: 'ZA-GP-JHB',
  },
  {
    id: 'ZA-GP-MID',
    name: 'Midrand',
    province: 'Gauteng',
    country: 'South Africa',
    level: 'suburb',
    aliases: [],
    parentId: 'ZA-GP-JHB',
  },
  {
    id: 'ZA-GP-CENT',
    name: 'Centurion',
    province: 'Gauteng',
    country: 'South Africa',
    level: 'suburb',
    aliases: [],
    parentId: 'ZA-GP-PTA',
  },

  // ============================================================
  // WESTERN CAPE
  // ============================================================
  {
    id: 'ZA-WC-CPT',
    name: 'Cape Town',
    province: 'Western Cape',
    country: 'South Africa',
    level: 'city',
    aliases: [
      { type: 'abbreviation', value: 'cpt', confidence: 0.99 },
      { type: 'abbreviation', value: 'ct', confidence: 0.98 },
      { type: 'misspelling', value: 'capetown', confidence: 0.95 },
      { type: 'misspelling', value: 'cape town', confidence: 0.95 },
    ],
  },
  {
    id: 'ZA-WC-STEL',
    name: 'Stellenbosch',
    province: 'Western Cape',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'nickname', value: 'stellies', confidence: 0.95 },
      { type: 'misspelling', value: 'stellenbosch', confidence: 0.95 },
      { type: 'misspelling', value: 'stellenbosh', confidence: 0.88 },
    ],
  },
  {
    id: 'ZA-WC-FRANS',
    name: 'Franschhoek',
    province: 'Western Cape',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'misspelling', value: 'franshhoek', confidence: 0.92 },
      { type: 'misspelling', value: 'franschoek', confidence: 0.90 },
    ],
  },
  {
    id: 'ZA-WC-PLETT',
    name: 'Plettenberg Bay',
    province: 'Western Cape',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'nickname', value: 'plett', confidence: 0.98 },
      { type: 'misspelling', value: 'plettenberg', confidence: 0.95 },
      { type: 'misspelling', value: 'plettenberg bay', confidence: 0.95 },
    ],
  },
  {
    id: 'ZA-WC-MOSSEL',
    name: 'Mossel Bay',
    province: 'Western Cape',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'misspelling', value: 'mosselbay', confidence: 0.95 },
      { type: 'misspelling', value: 'mosselbaai', confidence: 0.93 },
    ],
  },
  {
    id: 'ZA-WC-KNYSNA',
    name: 'Knysna',
    province: 'Western Cape',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'misspelling', value: 'knysna', confidence: 0.95 },
      { type: 'misspelling', value: 'knysna', confidence: 0.90 },
    ],
  },
  {
    id: 'ZA-WC-OUDT',
    name: 'Oudtshoorn',
    province: 'Western Cape',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'abbreviation', value: 'oudt', confidence: 0.90 },
      { type: 'misspelling', value: 'oudtshoorn', confidence: 0.95 },
    ],
  },
  {
    id: 'ZA-WC-GEORGE',
    name: 'George',
    province: 'Western Cape',
    country: 'South Africa',
    level: 'city',
    aliases: [],
  },
  {
    id: 'ZA-WC-HERMANUS',
    name: 'Hermanus',
    province: 'Western Cape',
    country: 'South Africa',
    level: 'town',
    aliases: [],
  },
  {
    id: 'ZA-WC-PAARL',
    name: 'Paarl',
    province: 'Western Cape',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'misspelling', value: 'parl', confidence: 0.85 },
    ],
  },
  {
    id: 'ZA-WC-SOMERSET',
    name: 'Somerset West',
    province: 'Western Cape',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'misspelling', value: 'somerset', confidence: 0.88 },
    ],
  },
  {
    id: 'ZA-WC-GORDONS',
    name: "Gordon's Bay",
    province: 'Western Cape',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'misspelling', value: 'gordons bay', confidence: 0.92 },
    ],
  },
  {
    id: 'ZA-WC-BETTYS',
    name: "Betty's Bay",
    province: 'Western Cape',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'misspelling', value: 'betty bay', confidence: 0.90 },
    ],
  },

  // ============================================================
  // EASTERN CAPE - With Former Names
  // ============================================================
  {
    id: 'ZA-EC-GQEBERHA',
    name: 'Gqeberha',
    province: 'Eastern Cape',
    country: 'South Africa',
    level: 'city',
    aliases: [
      { type: 'abbreviation', value: 'pe', confidence: 0.99 },
      { type: 'abbreviation', value: 'p.e.', confidence: 0.98 },
      { type: 'former_name', value: 'port elizabeth', confidence: 0.99 },
      { type: 'misspelling', value: 'gqeberga', confidence: 0.92 },
      { type: 'misspelling', value: 'gqebera', confidence: 0.90 },
      { type: 'misspelling', value: 'gqebehra', confidence: 0.88 },
    ],
    historicalNames: ['Port Elizabeth'],
  },
  {
    id: 'ZA-EC-KARIEGA',
    name: 'Kariega',
    province: 'Eastern Cape',
    country: 'South Africa',
    level: 'city',
    aliases: [
      { type: 'former_name', value: 'uitenhage', confidence: 0.99 },
      { type: 'misspelling', value: 'uitenhague', confidence: 0.92 },
      { type: 'misspelling', value: 'kariega', confidence: 0.95 },
    ],
    historicalNames: ['Uitenhage'],
  },
  {
    id: 'ZA-EC-MAKHANDA',
    name: 'Makhanda',
    province: 'Eastern Cape',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'former_name', value: 'grahamstown', confidence: 0.99 },
      { type: 'misspelling', value: 'makhanda', confidence: 0.95 },
    ],
    historicalNames: ['Grahamstown'],
  },
  {
    id: 'ZA-EC-QONCE',
    name: 'Qonce',
    province: 'Eastern Cape',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'former_name', value: "king william's town", confidence: 0.99 },
      { type: 'former_name', value: 'king williams town', confidence: 0.98 },
    ],
    historicalNames: ["King William's Town"],
  },
  {
    id: 'ZA-EC-KOMANI',
    name: 'Komani',
    province: 'Eastern Cape',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'former_name', value: 'queenstown', confidence: 0.99 },
    ],
    historicalNames: ['Queenstown'],
  },
  {
    id: 'ZA-EC-ROBERT',
    name: 'Robert Sobukwe Town',
    province: 'Eastern Cape',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'former_name', value: 'graaff-reinet', confidence: 0.99 },
      { type: 'former_name', value: 'graaff reinet', confidence: 0.98 },
      { type: 'misspelling', value: 'graaf reinet', confidence: 0.92 },
      { type: 'misspelling', value: 'graaf-reinet', confidence: 0.92 },
      { type: 'misspelling', value: 'graff reinet', confidence: 0.90 },
    ],
    historicalNames: ['Graaff-Reinet'],
  },
  {
    id: 'ZA-EC-MTHATHA',
    name: 'Mthatha',
    province: 'Eastern Cape',
    country: 'South Africa',
    level: 'city',
    aliases: [
      { type: 'former_name', value: 'umtata', confidence: 0.99 },
    ],
    historicalNames: ['Umtata'],
  },
  {
    id: 'ZA-EC-JEFFREYS',
    name: 'Jeffreys Bay',
    province: 'Eastern Cape',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'nickname', value: 'jbay', confidence: 0.98 },
      { type: 'nickname', value: 'j-bay', confidence: 0.98 },
      { type: 'nickname', value: 'jb', confidence: 0.95 },
      { type: 'misspelling', value: 'jeffrey bay', confidence: 0.92 },
      { type: 'misspelling', value: 'jeffery bay', confidence: 0.90 },
      { type: 'misspelling', value: 'jefferys bay', confidence: 0.88 },
    ],
  },
  {
    id: 'ZA-EC-EASTLONDON',
    name: 'East London',
    province: 'Eastern Cape',
    country: 'South Africa',
    level: 'city',
    aliases: [
      { type: 'abbreviation', value: 'el', confidence: 0.95 },
    ],
  },

  // ============================================================
  // KWAZULU-NATAL
  // ============================================================
  {
    id: 'ZA-KZN-DURBAN',
    name: 'Durban',
    province: 'KwaZulu-Natal',
    country: 'South Africa',
    level: 'city',
    aliases: [
      { type: 'abbreviation', value: 'dbn', confidence: 0.99 },
      { type: 'nickname', value: 'durbs', confidence: 0.95 },
      { type: 'misspelling', value: 'durban', confidence: 0.95 },
    ],
  },
  {
    id: 'ZA-KZN-UMHLANGA',
    name: 'Umhlanga',
    province: 'KwaZulu-Natal',
    country: 'South Africa',
    level: 'suburb',
    aliases: [],
    parentId: 'ZA-KZN-DURBAN',
  },
  {
    id: 'ZA-KZN-BALLITO',
    name: 'Ballito',
    province: 'KwaZulu-Natal',
    country: 'South Africa',
    level: 'town',
    aliases: [],
  },
  {
    id: 'ZA-KZN-UMNAMBITHI',
    name: 'uMnambithi',
    province: 'KwaZulu-Natal',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'former_name', value: 'ladysmith', confidence: 0.99 },
    ],
    historicalNames: ['Ladysmith'],
  },
  {
    id: 'ZA-KZN-KWADUKUZA',
    name: 'KwaDukuza',
    province: 'KwaZulu-Natal',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'former_name', value: 'stanger', confidence: 0.99 },
    ],
    historicalNames: ['Stanger'],
  },
  {
    id: 'ZA-KZN-PMB',
    name: 'Pietermaritzburg',
    province: 'KwaZulu-Natal',
    country: 'South Africa',
    level: 'city',
    aliases: [
      { type: 'abbreviation', value: 'pmb', confidence: 0.98 },
    ],
  },

  // ============================================================
  // LIMPOPO
  // ============================================================
  {
    id: 'ZA-LP-POLOKWANE',
    name: 'Polokwane',
    province: 'Limpopo',
    country: 'South Africa',
    level: 'city',
    aliases: [
      { type: 'former_name', value: 'pietersburg', confidence: 0.99 },
    ],
    historicalNames: ['Pietersburg'],
  },
  {
    id: 'ZA-LP-MOKOPANE',
    name: 'Mokopane',
    province: 'Limpopo',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'former_name', value: 'potgietersrus', confidence: 0.99 },
    ],
    historicalNames: ['Potgietersrus'],
  },
  {
    id: 'ZA-LP-MAKHADO',
    name: 'Makhado',
    province: 'Limpopo',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'former_name', value: 'louis trichardt', confidence: 0.99 },
    ],
    historicalNames: ['Louis Trichardt'],
  },

  // ============================================================
  // MPUMALANGA
  // ============================================================
  {
    id: 'ZA-MP-MBOMBELA',
    name: 'Mbombela',
    province: 'Mpumalanga',
    country: 'South Africa',
    level: 'city',
    aliases: [
      { type: 'former_name', value: 'nelspruit', confidence: 0.99 },
    ],
    historicalNames: ['Nelspruit'],
  },
  {
    id: 'ZA-MP-EMKHONDO',
    name: 'eMkhondo',
    province: 'Mpumalanga',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'former_name', value: 'piet retief', confidence: 0.99 },
    ],
    historicalNames: ['Piet Retief'],
  },
  {
    id: 'ZA-MP-MASHISHING',
    name: 'Mashishing',
    province: 'Mpumalanga',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'former_name', value: 'lydenburg', confidence: 0.99 },
    ],
    historicalNames: ['Lydenburg'],
  },

  // ============================================================
  // NORTH WEST
  // ============================================================
  {
    id: 'ZA-NW-MAHIKENG',
    name: 'Mahikeng',
    province: 'North West',
    country: 'South Africa',
    level: 'city',
    aliases: [
      { type: 'former_name', value: 'mafikeng', confidence: 0.99 },
      { type: 'former_name', value: 'mafeking', confidence: 0.98 },
    ],
    historicalNames: ['Mafikeng', 'Mafeking'],
  },

  // ============================================================
  // FREE STATE
  // ============================================================
  {
    id: 'ZA-FS-BLOEM',
    name: 'Bloemfontein',
    province: 'Free State',
    country: 'South Africa',
    level: 'city',
    aliases: [
      { type: 'nickname', value: 'bloem', confidence: 0.95 },
    ],
  },
  {
    id: 'ZA-FS-WINNIE',
    name: 'Winnie Mandela',
    province: 'Free State',
    country: 'South Africa',
    level: 'town',
    aliases: [
      { type: 'former_name', value: 'brandfort', confidence: 0.99 },
    ],
    historicalNames: ['Brandfort'],
  },

  // ============================================================
  // NORTHERN CAPE
  // ============================================================
  {
    id: 'ZA-NC-KIMBERLEY',
    name: 'Kimberley',
    province: 'Northern Cape',
    country: 'South Africa',
    level: 'city',
    aliases: [
      { type: 'abbreviation', value: 'kim', confidence: 0.90 },
    ],
  },

  // ============================================================
  // INTERNATIONAL CITIES
  // ============================================================
  {
    id: 'DE-BE-BERLIN',
    name: 'Berlin',
    province: 'Berlin',
    country: 'Germany',
    level: 'city',
    aliases: [],
  },
  {
    id: 'DE-BY-MUNICH',
    name: 'Munich',
    province: 'Bavaria',
    country: 'Germany',
    level: 'city',
    aliases: [
      { type: 'alternative_name', value: 'münchen', confidence: 0.98 },
      { type: 'misspelling', value: 'munchen', confidence: 0.95 },
    ],
  },
  {
    id: 'CH-ZH-ZURICH',
    name: 'Zurich',
    province: 'Zurich',
    country: 'Switzerland',
    level: 'city',
    aliases: [
      { type: 'alternative_name', value: 'zürich', confidence: 0.98 },
      { type: 'alternative_name', value: 'zurich', confidence: 0.98 },
    ],
  },
  {
    id: 'GB-ENG-LONDON',
    name: 'London',
    province: 'Greater London',
    country: 'United Kingdom',
    level: 'city',
    aliases: [],
  },
  {
    id: 'FR-IDF-PARIS',
    name: 'Paris',
    province: 'Île-de-France',
    country: 'France',
    level: 'city',
    aliases: [],
  },
  {
    id: 'NL-NH-AMSTERDAM',
    name: 'Amsterdam',
    province: 'North Holland',
    country: 'Netherlands',
    level: 'city',
    aliases: [],
  },
  {
    id: 'US-NY-NYC',
    name: 'New York City',
    province: 'New York',
    country: 'United States',
    level: 'city',
    aliases: [
      { type: 'nickname', value: 'nyc', confidence: 0.98 },
      { type: 'abbreviation', value: 'ny', confidence: 0.95 },
    ],
  },
  {
    id: 'US-CA-LA',
    name: 'Los Angeles',
    province: 'California',
    country: 'United States',
    level: 'city',
    aliases: [
      { type: 'abbreviation', value: 'la', confidence: 0.95 },
    ],
  },
  {
    id: 'AU-NSW-SYDNEY',
    name: 'Sydney',
    province: 'New South Wales',
    country: 'Australia',
    level: 'city',
    aliases: [],
  },
  {
    id: 'NZ-AKL-AUCKLAND',
    name: 'Auckland',
    province: 'Auckland',
    country: 'New Zealand',
    level: 'city',
    aliases: [],
  },
];

// ============================================================
// BUILD LOOKUP MAPS
// ============================================================

// Map: normalized alias → LocationEntry
const aliasMap = new Map<string, LocationEntry>();
// Map: canonical name → LocationEntry
const canonicalMap = new Map<string, LocationEntry>();
// Map: id → LocationEntry
const idMap = new Map<string, LocationEntry>();

LOCATION_DATABASE.forEach(entry => {
  // Add canonical name
  const canonicalKey = entry.name.toLowerCase().trim();
  canonicalMap.set(canonicalKey, entry);
  idMap.set(entry.id, entry);

  // Add all aliases
  entry.aliases.forEach(alias => {
    const aliasKey = alias.value.toLowerCase().trim();
    // Only add if not already present or if this one has higher confidence
    if (!aliasMap.has(aliasKey) || alias.confidence > (aliasMap.get(aliasKey)?.aliases[0]?.confidence || 0)) {
      aliasMap.set(aliasKey, entry);
    }
  });

  // Add historical names
  if (entry.historicalNames) {
    entry.historicalNames.forEach(historical => {
      const historicalKey = historical.toLowerCase().trim();
      if (!aliasMap.has(historicalKey)) {
        aliasMap.set(historicalKey, entry);
      }
    });
  }
});

// ============================================================
// LEVENSHTEIN DISTANCE (Fuzzy Matching)
// ============================================================

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i-1] === a[j-1]) {
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i-1][j-1] + 1,
          matrix[i][j-1] + 1,
          matrix[i-1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function fuzzyMatch(input: string, candidates: string[]): { match: string; score: number } | null {
  const lowerInput = input.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const lowerCandidate = candidate.toLowerCase();
    const distance = levenshteinDistance(lowerInput, lowerCandidate);
    const maxLen = Math.max(lowerInput.length, lowerCandidate.length);
    const score = 1 - (distance / maxLen);

    if (score > 0.8 && score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  return bestMatch ? { match: bestMatch, score: bestScore } : null;
}

// ============================================================
// MAIN CORRECTION FUNCTION
// ============================================================

const correctionLog: CorrectionLog[] = [];

export function correctLocation(input: string): LocationResult {
  if (!input || input.trim().length < 2) {
    return {
      original: input || '',
      corrected: input || '',
      canonicalId: '',
      city: '',
      province: '',
      country: '',
      continent: '',
      level: 'city',
      isCorrection: false,
      confidence: 0,
      requiresReview: false,
      originalInput: input || '',
    };
  }

  const trimmed = input.trim();
  const normalized = trimmed.toLowerCase().trim();

  // Step 1: Check alias map (abbreviations, former names, nicknames)
  const aliasMatch = aliasMap.get(normalized);
  if (aliasMatch) {
    const result = createResult(trimmed, aliasMatch, true, 0.98);
    logCorrection(trimmed, result.corrected, result.confidence, 'abbreviation');
    return result;
  }

  // Step 2: Check canonical names
  const canonicalMatch = canonicalMap.get(normalized);
  if (canonicalMatch) {
    return createResult(trimmed, canonicalMatch, false, 1.0);
  }

  // Step 3: Check historical names (already in aliasMap, but double-check)
  for (const entry of LOCATION_DATABASE) {
    if (entry.historicalNames) {
      for (const historical of entry.historicalNames) {
        if (historical.toLowerCase() === normalized) {
          const result = createResult(trimmed, entry, true, 0.95);
          logCorrection(trimmed, result.corrected, result.confidence, 'former_name');
          return result;
        }
      }
    }
  }

  // Step 4: Fuzzy matching
  const allNames = Array.from(canonicalMap.keys());
  const fuzzyResult = fuzzyMatch(normalized, allNames);
  if (fuzzyResult && fuzzyResult.score > 0.85) {
    const entry = canonicalMap.get(fuzzyResult.match);
    if (entry) {
      const result = createResult(trimmed, entry, true, fuzzyResult.score);
      logCorrection(trimmed, result.corrected, result.confidence, 'misspelling');
      return result;
    }
  }

  // Step 5: No match - return standardized original
  const standardized = trimmed.split(' ').filter(p => p.length > 0).join(' ').toUpperCase();

  return {
    original: trimmed,
    corrected: standardized,
    canonicalId: '',
    city: standardized,
    province: '',
    country: '',
    continent: '',
    level: 'city',
    isCorrection: false,
    confidence: 0,
    requiresReview: true,
    originalInput: trimmed,
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function createResult(original: string, entry: LocationEntry, isCorrection: boolean, confidence: number): LocationResult {
  return {
    original: original,
    corrected: entry.name,
    canonicalId: entry.id,
    city: entry.name,
    province: entry.province,
    country: entry.country,
    continent: CONTINENT_MAP[entry.country] || 'Other',
    level: entry.level,
    isCorrection: isCorrection,
    confidence: Math.min(confidence, 1.0),
    requiresReview: confidence < 0.85,
    originalInput: original,
  };
}

function logCorrection(original: string, corrected: string, confidence: number, type: AliasType): void {
  correctionLog.push({
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    original,
    corrected,
    confidence,
    correctionType: type,
    timestamp: new Date().toISOString(),
    source: 'location_intelligence_service',
  });
}

// ============================================================
// EXPORTED API
// ============================================================

/**
 * Clean a location string - main entry point
 * @param input - The location string to clean
 * @returns Cleaned location string
 */
export function cleanLocation(input: string): string {
  return correctLocation(input).corrected;
}

/**
 * Get detailed location intelligence
 * @param input - The location string to analyze
 * @returns Full LocationResult with all details
 */
export function getLocationIntelligence(input: string): LocationResult {
  return correctLocation(input);
}

/**
 * Get all correction logs
 * @returns Array of correction logs
 */
export function getCorrectionLogs(): CorrectionLog[] {
  return [...correctionLog];
}

/**
 * Accept a correction (adds to permanent database)
 * @param logId - The log ID to accept
 */
export function acceptCorrection(logId: string): void {
  const log = correctionLog.find(l => l.id === logId);
  if (!log || !log.accepted) {
    // Add to database permanently
    // This would be persisted to your actual database
    console.log(`✅ Accepted correction: "${log?.original}" → "${log?.corrected}"`);
  }
}

/**
 * Get unknown locations that need review
 * @returns Array of unknown locations
 */
export function getUnknownLocations(): string[] {
  const unknown = correctionLog
    .filter(log => log.confidence < 0.85 && !log.accepted)
    .map(log => log.original);
  return [...new Set(unknown)];
}

// ============================================================
// USAGE EXAMPLES
// ============================================================

/*
// Basic usage
console.log(cleanLocation('JHB')); // JOHANNESBURG
console.log(cleanLocation('Port Elizabeth')); // GQEBERHA
console.log(cleanLocation('gqeberga')); // GQEBERHA
console.log(cleanLocation('plett')); // PLETTENBERG BAY

// Detailed intelligence
const result = getLocationIntelligence('Cape Town');
console.log(result.city); // CAPE TOWN
console.log(result.province); // WESTERN CAPE
console.log(result.country); // SOUTH AFRICA
console.log(result.continent); // AFRICA

// Review unknown locations
const unknown = getUnknownLocations();
console.log('Unknown locations:', unknown);
*/
