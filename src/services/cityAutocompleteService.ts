// src/services/cityAutocompleteService.ts
import cityData from '../data/cities.json';

export interface CitySuggestion {
  name: string;
  displayName: string;
  country: string;
  isCorrection: boolean;
  originalInput?: string;
  confidence: number;
}

interface CityEntry {
  name?: string;
  aliases?: string[];
}

// Common misspellings for Southern African cities
const COMMON_MISSPELLINGS: Record<string, string> = {
  // South Africa
  'Parl': 'Paarl',
  'JHB': 'Johannesburg',
  'J-bay': 'Jeffreys Bay',
  'JBay': 'Jeffreys Bay',
  "Jeffery's Bay": 'Jeffreys Bay',
  'Jefferys Bay': 'Jeffreys Bay',
  'Plett': 'Plettenberg Bay',
  'P-town': 'Pretoria',
  'CT': 'Cape Town',
  'Durbs': 'Durban',
  'PE': 'Gqeberha',
  'Stellies': 'Stellenbosch',
  'Franshhoek': 'Franschhoek',
  'Knysna': 'Knysna',
  'Oudtshoorn': 'Oudtshoorn',
  'Mosselbay': 'Mossel Bay',
  'Mosselbaai': 'Mossel Bay',
  'Mossell Bay': 'Mossel Bay',
  'Somerset': 'Somerset West',
  'Franschoek': 'Franschhoek',
  'Langebaan': 'Langebaan',
  'Paternoster': 'Paternoster',
  'Hermanus': 'Hermanus',
  'Swellendam': 'Swellendam',
  'Montagu': 'Montagu',
  'Robertson': 'Robertson',
  'Worcester': 'Worcester',
  'Calitzdorp': 'Calitzdorp',
  'Prince Albert': 'Prince Albert',
  'Grahamstown': 'Makhanda',
  'Port Alfred': 'Port Alfred',
  'Kenton': 'Kenton-on-Sea',
  'Port St Johns': 'Port St Johns',
  'Margate': 'Margate',
  'Scottburgh': 'Scottburgh',
  'Umhlanga': 'Umhlanga',
  'Ballito': 'Ballito',
  'Stanger': 'KwaDukuza',
  'Eshowe': 'Eshowe',
  'Vryheid': 'Vryheid',
  'Newcastle': 'Newcastle',
  'Ladysmith': 'Ladysmith',
  'Harrismith': 'Harrismith',
  'Bethlehem': 'Bethlehem',
  'Clarens': 'Clarens',
  'Ficksburg': 'Ficksburg',
  'Ladybrand': 'Ladybrand',
  'Bredasdorp': 'Bredasdorp',
  'Caledon': 'Caledon',
  'Grabouw': 'Grabouw',
  'Strand': 'Strand',
  "Gordon's Bay": "Gordon's Bay",
  'Betty\'s Bay': "Betty's Bay",
  'Kleinmond': 'Kleinmond',
  'Gansbaai': 'Gansbaai',
  'Arniston': 'Arniston',
  'Stilbaai': 'Stilbaai',
  "L'Agulhas": "L'Agulhas",
  'Upington': 'Upington',
  'Springbok': 'Springbok',
  'Keimoes': 'Keimoes',
  'Augrabies': 'Augrabies',
  'Pofadder': 'Pofadder',
  'Aggeneys': 'Aggeneys',
  'Port Elizabeth': 'Gqeberha',
  'Queenstown': 'Komani',
  'Nelspruit': 'Mbombela',
  'Piet Retief': 'eMkhondo',
  'Lydenburg': 'Mashishing',
  'Ellisras': 'Lephalale',
  'Nylstroom': 'Modimolle',
  'Warmbaths': 'Bela-Bela',
  'Mafikeng': 'Mahikeng',
  'Umtata': 'Mthatha',
  'Louis Trichardt': 'Makhado',
  // Botswana
  'Gabs': 'Gaborone',
  'Maun': 'Maun',
  'Kasane': 'Kasane',
  'Chobe': 'Kasane',
  'Francistown': 'Francistown',
  // Namibia
  'Windhoek': 'Windhoek',
  'Swaak': 'Swakopmund',
  'Swakop': 'Swakopmund',
  'Walvis': 'Walvis Bay',
  'Oshakati': 'Oshakati',
  'Rundu': 'Rundu',
  // Lesotho
  'Maseru': 'Maseru',
  // Zimbabwe
  'Harare': 'Harare',
  'Vic Falls': 'Victoria Falls',
  'Victoriafalls': 'Victoria Falls',
  'Bulawayo': 'Bulawayo',
  'Mutare': 'Mutare',
  'Gweru': 'Gweru',
  // Mozambique
  'Maputo': 'Maputo',
  // Eswatini
  'Mbabane': 'Mbabane',
  // Zambia
  'Lusaka': 'Lusaka',
  'Livingstone': 'Livingstone'
};

// Levenshtein distance for spelling correction
const levenshteinDistance = (a: string, b: string): number => {
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
};

// Get all cities for a country with display names
export const getCitiesForCountry = (country: string): string[] => {
  const countryData = cityData[country as keyof typeof cityData];
  if (!countryData) return [];
  
  const results: string[] = [];
  countryData.forEach((entry: string | CityEntry) => {
    if (typeof entry === 'string') {
      results.push(entry);
    } else if (entry.name) {
      results.push(entry.name);
    }
  });
  return results;
};

// Get all display names (including aliases for search)
export const getAllCitySearchTerms = (): Record<string, string> => {
  const searchMap: Record<string, string> = {};
  
  Object.entries(cityData).forEach(([country, entries]) => {
    entries.forEach((entry: string | CityEntry) => {
      if (typeof entry === 'string') {
        searchMap[entry.toLowerCase()] = entry;
      } else if (entry.name && entry.aliases) {
        searchMap[entry.name.toLowerCase()] = entry.name;
        entry.aliases.forEach(alias => {
          searchMap[alias.toLowerCase()] = entry.name;
        });
      }
    });
  });
  
  return searchMap;
};

// Find closest city match
export const findClosestCity = (
  input: string,
  country: string
): CitySuggestion | null => {
  if (!input || input.length < 2) return null;

  const trimmedInput = input.trim();
  const lowercaseInput = trimmedInput.toLowerCase();

  // 1. Check exact match in common misspellings
  if (COMMON_MISSPELLINGS[trimmedInput]) {
    const corrected = COMMON_MISSPELLINGS[trimmedInput];
    return {
      name: corrected,
      displayName: corrected,
      country,
      isCorrection: true,
      originalInput: trimmedInput,
      confidence: 0.98
    };
  }

  // 2. Get cities for the country
  const cities = getCitiesForCountry(country);
  if (cities.length === 0) return null;

  // 3. Check exact match (case insensitive)
  const exactMatch = cities.find(c => c.toLowerCase() === lowercaseInput);
  if (exactMatch) {
    return {
      name: exactMatch,
      displayName: exactMatch,
      country,
      isCorrection: false,
      confidence: 1.0
    };
  }

  // 4. Check aliases
  const searchMap = getAllCitySearchTerms();
  if (searchMap[lowercaseInput]) {
    const corrected = searchMap[lowercaseInput];
    return {
      name: corrected,
      displayName: corrected,
      country,
      isCorrection: true,
      originalInput: trimmedInput,
      confidence: 0.95
    };
  }

  // 5. Check if input is a prefix match
  const prefixMatches = cities.filter(c => 
    c.toLowerCase().startsWith(lowercaseInput) ||
    lowercaseInput.startsWith(c.toLowerCase())
  );
  
  if (prefixMatches.length === 1) {
    return {
      name: prefixMatches[0],
      displayName: prefixMatches[0],
      country,
      isCorrection: true,
      originalInput: trimmedInput,
      confidence: 0.9
    };
  }

  // 6. Fuzzy matching with Levenshtein distance
  const results = cities.map(city => {
    const distance = levenshteinDistance(lowercaseInput, city.toLowerCase());
    const maxLength = Math.max(lowercaseInput.length, city.length);
    const similarity = 1 - (distance / maxLength);
    return { city, distance, similarity };
  });

  const sorted = results
    .sort((a, b) => b.similarity - a.similarity || a.distance - b.distance)
    .filter(r => r.similarity >= 0.6);

  if (sorted.length > 0) {
    const best = sorted[0];
    const isCorrection = best.similarity < 1;
    
    return {
      name: best.city,
      displayName: best.city,
      country,
      isCorrection: isCorrection,
      originalInput: isCorrection ? trimmedInput : undefined,
      confidence: best.similarity
    };
  }

  return null;
};

// Get suggestions for autocomplete
export const getCitySuggestions = (
  input: string,
  country: string
): CitySuggestion[] => {
  if (!input || input.length < 1) return [];
  
  const trimmedInput = input.trim();
  const lowercaseInput = trimmedInput.toLowerCase();
  const cities = getCitiesForCountry(country);
  
  if (cities.length === 0) return [];

  const suggestions: CitySuggestion[] = [];
  
  // Add exact match first
  const exactMatch = cities.find(c => c.toLowerCase() === lowercaseInput);
  if (exactMatch) {
    suggestions.push({
      name: exactMatch,
      displayName: exactMatch,
      country,
      isCorrection: false,
      confidence: 1.0
    });
  }

  // Add prefix matches (up to 5)
  const prefixMatches = cities
    .filter(c => 
      c.toLowerCase().startsWith(lowercaseInput) && 
      c.toLowerCase() !== lowercaseInput
    )
    .slice(0, 5);
  
  prefixMatches.forEach(city => {
    suggestions.push({
      name: city,
      displayName: city,
      country,
      isCorrection: false,
      confidence: 0.9
    });
  });

  // Add common misspellings if no prefix matches found
  if (suggestions.length < 2) {
    const misspellingMatch = COMMON_MISSPELLINGS[trimmedInput];
    if (misspellingMatch) {
      suggestions.push({
        name: misspellingMatch,
        displayName: misspellingMatch,
        country,
        isCorrection: true,
        originalInput: trimmedInput,
        confidence: 0.95
      });
    }
  }

  return suggestions.slice(0, 8);
};

// Format city suggestion for display
export const formatCitySuggestion = (suggestion: CitySuggestion): string => {
  const correctionIndicator = suggestion.isCorrection ? ' ✨' : '';
  return `${suggestion.displayName}, ${suggestion.country}${correctionIndicator}`;
};
