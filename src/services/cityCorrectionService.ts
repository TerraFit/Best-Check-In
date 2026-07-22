// src/services/cityCorrectionService.ts
// ✅ City correction service - Handles South African city names, abbreviations, and former names

export interface CityCorrectionResult {
  corrected: string;
  original: string;
  isCorrection: boolean;
  confidence: number;
  province?: string;
}

// Full South African city corrections database
const CITY_CORRECTIONS: Record<string, { corrected: string; province?: string }> = {
  // ============================================================
  // ABBREVIATIONS
  // ============================================================
  'cpt': { corrected: 'CAPE TOWN', province: 'Western Cape' },
  'ct': { corrected: 'CAPE TOWN', province: 'Western Cape' },
  'jhb': { corrected: 'JOHANNESBURG', province: 'Gauteng' },
  'dbn': { corrected: 'DURBAN', province: 'KwaZulu-Natal' },
  'durbs': { corrected: 'DURBAN', province: 'KwaZulu-Natal' },
  'pe': { corrected: 'GQEBERHA', province: 'Eastern Cape' },
  'p.e.': { corrected: 'GQEBERHA', province: 'Eastern Cape' },
  'el': { corrected: 'EAST LONDON', province: 'Eastern Cape' },
  'plett': { corrected: 'PLETTENBERG BAY', province: 'Western Cape' },
  'jbay': { corrected: 'JEFFREYS BAY', province: 'Eastern Cape' },
  'j-bay': { corrected: 'JEFFREYS BAY', province: 'Eastern Cape' },
  'jb': { corrected: 'JEFFREYS BAY', province: 'Eastern Cape' },
  'p-town': { corrected: 'PRETORIA', province: 'Gauteng' },
  'pt': { corrected: 'PRETORIA', province: 'Gauteng' },
  'pta': { corrected: 'PRETORIA', province: 'Gauteng' },
  'stellies': { corrected: 'STELLENBOSCH', province: 'Western Cape' },
  'franshhoek': { corrected: 'FRANSCHHOEK', province: 'Western Cape' },
  'mosselbay': { corrected: 'MOSSEL BAY', province: 'Western Cape' },
  'mosselbaai': { corrected: 'MOSSEL BAY', province: 'Western Cape' },
  'gqeberha': { corrected: 'GQEBERHA', province: 'Eastern Cape' },
  'oudt': { corrected: 'OUDTSHOORN', province: 'Western Cape' },
  'bloem': { corrected: 'BLOEMFONTEIN', province: 'Free State' },
  'kim': { corrected: 'KIMBERLEY', province: 'Northern Cape' },
  'pmb': { corrected: 'PIETERMARITZBURG', province: 'KwaZulu-Natal' },

  // ============================================================
  // FORMER NAMES (Old → New)
  // ============================================================
  'port elizabeth': { corrected: 'GQEBERHA', province: 'Eastern Cape' },
  'uitenhage': { corrected: 'KARIEGA', province: 'Eastern Cape' },
  'grahamstown': { corrected: 'MAKHANDA', province: 'Eastern Cape' },
  "king william's town": { corrected: 'QONCE', province: 'Eastern Cape' },
  'king williams town': { corrected: 'QONCE', province: 'Eastern Cape' },
  'queenstown': { corrected: 'KOMANI', province: 'Eastern Cape' },
  'ladysmith': { corrected: 'UMNAMBITHI', province: 'KwaZulu-Natal' },
  'graaff-reinet': { corrected: 'ROBERT SOBUKWE TOWN', province: 'Eastern Cape' },
  'graaff reinet': { corrected: 'ROBERT SOBUKWE TOWN', province: 'Eastern Cape' },
  'louis trichardt': { corrected: 'MAKHADO', province: 'Limpopo' },
  'cradock': { corrected: 'NXUBA', province: 'Eastern Cape' },
  'fort beaufort': { corrected: 'KWAMAQOMA', province: 'Eastern Cape' },
  'somerset east': { corrected: 'KWANOJOLI', province: 'Eastern Cape' },
  'brandfort': { corrected: 'WINNIE MANDELA', province: 'Free State' },
  'aliwal north': { corrected: 'MALETSWAI', province: 'Eastern Cape' },
  'aberdeen': { corrected: 'XAMDEBOO', province: 'Eastern Cape' },
  'adendorp': { corrected: 'BISHOP LIMBA', province: 'Eastern Cape' },
  'barkly east': { corrected: 'EKHEPHINI', province: 'Eastern Cape' },
  'kirkwood': { corrected: 'NQWEBA', province: 'Eastern Cape' },
  "morgan's bay": { corrected: 'GXARHA', province: 'Eastern Cape' },
  'morgans bay': { corrected: 'GXARHA', province: 'Eastern Cape' },
  'berlin': { corrected: 'NTABOZUKO', province: 'Eastern Cape' },
  'nieu-bethesda': { corrected: 'KWA NOHELENI', province: 'Eastern Cape' },
  'lady frere': { corrected: 'CACADU', province: 'Eastern Cape' },
  'mount frere': { corrected: 'KWABHACA', province: 'Eastern Cape' },
  'mount ayliff': { corrected: 'MAXESIBENI', province: 'Eastern Cape' },
  'elliot': { corrected: 'KHOWA', province: 'Eastern Cape' },
  'maclear': { corrected: 'NQANQARHU', province: 'Eastern Cape' },
  'stanger': { corrected: 'KWADUKUZA', province: 'KwaZulu-Natal' },
  'pietersburg': { corrected: 'POLOKWANE', province: 'Limpopo' },
  'potgietersrus': { corrected: 'MOKOPANE', province: 'Limpopo' },
  'nelspruit': { corrected: 'MBOMBELA', province: 'Mpumalanga' },
  'umtata': { corrected: 'MTHATHA', province: 'Eastern Cape' },
  'piet retief': { corrected: 'EMKHONDO', province: 'Mpumalanga' },
  'lydenburg': { corrected: 'MASHISHING', province: 'Mpumalanga' },
  'ellisras': { corrected: 'LEPHALALE', province: 'Limpopo' },
  'nylstroom': { corrected: 'MODIMOLLE', province: 'Limpopo' },
  'warmbaths': { corrected: 'BELA-BELA', province: 'Limpopo' },
  'mafikeng': { corrected: 'MAHIKENG', province: 'North West' },
  'mafeking': { corrected: 'MAHIKENG', province: 'North West' },
  'pietermaritzburg': { corrected: 'UMGUNGU NDLOVU', province: 'KwaZulu-Natal' },

  // ============================================================
  // KNOWN MISSPELLINGS
  // ============================================================
  'gqeberga': { corrected: 'GQEBERHA', province: 'Eastern Cape' },
  'gqebera': { corrected: 'GQEBERHA', province: 'Eastern Cape' },
  'gqebehra': { corrected: 'GQEBERHA', province: 'Eastern Cape' },
  'uitenhague': { corrected: 'KARIEGA', province: 'Eastern Cape' },
  'graaf reinet': { corrected: 'GRAAFF-REINET', province: 'Eastern Cape' },
  'graaf-reinet': { corrected: 'GRAAFF-REINET', province: 'Eastern Cape' },
  'graff reinet': { corrected: 'GRAAFF-REINET', province: 'Eastern Cape' },
  'jeffrey bay': { corrected: 'JEFFREYS BAY', province: 'Eastern Cape' },
  'jeffery bay': { corrected: 'JEFFREYS BAY', province: 'Eastern Cape' },
  'jefferys bay': { corrected: 'JEFFREYS BAY', province: 'Eastern Cape' },
  'gordons bay': { corrected: "GORDON'S BAY", province: 'Western Cape' },
  'betty bay': { corrected: "BETTY'S BAY", province: 'Western Cape' },
  'somerset': { corrected: 'SOMERSET WEST', province: 'Western Cape' },
  'strand': { corrected: 'STRAND', province: 'Western Cape' },
  'parl': { corrected: 'PAARL', province: 'Western Cape' },
  'paarl': { corrected: 'PAARL', province: 'Western Cape' },
  'hermanus': { corrected: 'HERMANUS', province: 'Western Cape' },
  'knysna': { corrected: 'KNYSNA', province: 'Western Cape' },
  'george': { corrected: 'GEORGE', province: 'Western Cape' },
  'oudtshoorn': { corrected: 'OUDTSHOORN', province: 'Western Cape' },
};

// Build reverse lookup for province mapping
const PROVINCE_MAP: Record<string, string> = {};
Object.entries(CITY_CORRECTIONS).forEach(([key, value]) => {
  PROVINCE_MAP[value.corrected.toLowerCase()] = value.province || '';
});

/**
 * Correct a city name - handles abbreviations, former names, and typos
 * @param input - The city name to correct
 * @returns CorrectionResult with corrected name, confidence, and province
 */
export function correctCityName(input: string): CityCorrectionResult {
  if (!input || input.trim().length < 2) {
    return {
      corrected: input || '',
      original: input || '',
      isCorrection: false,
      confidence: 0,
    };
  }

  const trimmed = input.trim();
  const upper = trimmed.toUpperCase();

  // Step 1: Check exact match in corrections
  const exactMatch = CITY_CORRECTIONS[upper];
  if (exactMatch) {
    return {
      corrected: exactMatch.corrected,
      original: trimmed,
      isCorrection: true,
      confidence: 0.98,
      province: exactMatch.province,
    };
  }

  // Step 2: Check trimmed version (removes extra spaces)
  const trimmedUpper = upper.trim();
  const trimmedMatch = CITY_CORRECTIONS[trimmedUpper];
  if (trimmedMatch) {
    return {
      corrected: trimmedMatch.corrected,
      original: trimmed,
      isCorrection: true,
      confidence: 0.95,
      province: trimmedMatch.province,
    };
  }

  // Step 3: Check for partial matches (former names with slight variations)
  for (const [key, value] of Object.entries(CITY_CORRECTIONS)) {
    if (upper === key.toUpperCase()) {
      return {
        corrected: value.corrected,
        original: trimmed,
        isCorrection: true,
        confidence: 0.9,
        province: value.province,
      };
    }
  }

  // Step 4: No correction found - standardize spacing and uppercase
  const parts = trimmed.split(' ').filter(p => p.length > 0);
  const standardized = parts.join(' ').toUpperCase();

  return {
    corrected: standardized,
    original: trimmed,
    isCorrection: false,
    confidence: 0,
    province: PROVINCE_MAP[standardized.toLowerCase()] || undefined,
  };
}

/**
 * Clean a location string - alias for correctCityName that returns just the string
 * @param value - The location string to clean
 * @returns The cleaned location string
 */
export function cleanLocation(value: string): string {
  return correctCityName(value).corrected;
}

/**
 * Get the province for a city
 * @param cityName - The city name
 * @returns The province name or undefined
 */
export function getProvinceForCity(cityName: string): string | undefined {
  const lower = cityName.toLowerCase();
  
  // Check if it's a correction key
  const match = CITY_CORRECTIONS[lower];
  if (match) return match.province;
  
  // Check if it's a corrected name
  return PROVINCE_MAP[lower];
}

/**
 * Get all known city names (for autocomplete/dropdown)
 */
export function getAllCityNames(): string[] {
  const names = new Set<string>();
  Object.values(CITY_CORRECTIONS).forEach(value => {
    names.add(value.corrected);
  });
  return Array.from(names).sort();
}

/**
 * Get all abbreviations for a city
 */
export function getCityAbbreviations(cityName: string): string[] {
  const results: string[] = [];
  const upper = cityName.toUpperCase();
  
  for (const [key, value] of Object.entries(CITY_CORRECTIONS)) {
    if (value.corrected === upper) {
      results.push(key);
    }
  }
  
  return results;
}

/**
 * Check if a city name needs correction
 */
export function needsCorrection(input: string): boolean {
  if (!input) return false;
  const upper = input.trim().toUpperCase();
  return !!CITY_CORRECTIONS[upper] || 
         Object.keys(CITY_CORRECTIONS).some(key => upper === key.toUpperCase());
}
