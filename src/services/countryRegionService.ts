// src/services/countryRegionService.ts
import countryData from '../data/countries.json';

export interface CountryRegionInfo {
  regions?: string[];
  manual_entry?: boolean;
  allow_manual_entry?: boolean;
}

// Get region type label based on country
export const getRegionTypeLabel = (country: string): string => {
  const countryInfo = (countryData as Record<string, CountryRegionInfo>)[country];
  
  if (!countryInfo) return 'Region';
  if (countryInfo.regions) return 'Region';
  return 'Region / State';
};

// Get regions for a country (returns array or null for manual entry)
export const getRegionsForCountry = (country: string): string[] | null => {
  const countryInfo = (countryData as Record<string, CountryRegionInfo>)[country];
  
  if (!countryInfo) return null;
  if (countryInfo.regions && countryInfo.regions.length > 0) {
    return countryInfo.regions;
  }
  return null;
};

// Check if country requires manual entry
export const requiresManualEntry = (country: string): boolean => {
  const countryInfo = (countryData as Record<string, CountryRegionInfo>)[country];
  
  if (!countryInfo) return true;
  return countryInfo.manual_entry === true || !countryInfo.regions;
};

// Get all countries list for dropdown
export const getAllCountries = (): string[] => {
  return Object.keys(countryData).sort();
};

// Get region name based on country (for display)
export const getRegionName = (country: string): string => {
  const countryInfo = (countryData as Record<string, CountryRegionInfo>)[country];
  
  if (!countryInfo) return 'Region / State';
  if (country === 'United States') return 'State';
  if (country === 'Canada') return 'Province';
  if (country === 'United Kingdom') return 'Country';
  if (country === 'Germany') return 'State (Bundesland)';
  if (country === 'France') return 'Department';
  if (country === 'Switzerland') return 'Canton';
  if (country === 'Italy') return 'Region';
  if (country === 'Spain') return 'Autonomous Community';
  if (country === 'Australia') return 'State';
  if (country === 'Russia') return 'Federal Subject';
  if (country === 'China') return 'Province';
  if (country === 'India') return 'State';
  if (country === 'Brazil') return 'State';
  return 'Region';
};
