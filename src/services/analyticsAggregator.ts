// src/services/analyticsAggregator.ts
import { VisitorData, MapLevel, MapState } from '../types/map';
import { COUNTRY_TO_CONTINENT } from '../data/mappings/countryToContinent';

interface Booking {
  guest_country?: string;
  guest_province?: string;
  guest_city?: string;
  [key: string]: any;
}

export function aggregateVisitorData(
  bookings: Booking[],
  level: MapLevel,
  state?: MapState
): VisitorData[] {
  const total = bookings.length || 1;
  const result: VisitorData[] = [];

  switch (level) {
    case 'world':
      return aggregateWorld(bookings, total);
    case 'continent':
      return aggregateContinents(bookings, total, state);
    case 'country':
      return aggregateCountries(bookings, total, state);
    case 'province':
      return aggregateProvinces(bookings, total, state);
    default:
      return [];
  }
}

function aggregateWorld(bookings: Booking[], total: number): VisitorData[] {
  const continentMap: Record<string, { count: number; countries: Set<string> }> = {};
  
  bookings.forEach(booking => {
    const country = booking.guest_country;
    if (!country) return;
    
    const continent = COUNTRY_TO_CONTINENT[country] || 'Other';
    if (!continentMap[continent]) {
      continentMap[continent] = { count: 0, countries: new Set() };
    }
    continentMap[continent].count++;
    continentMap[continent].countries.add(country);
  });

  return Object.entries(continentMap)
    .map(([name, data]) => ({
      id: name,
      name,
      count: data.count,
      percentage: (data.count / total) * 100,
      level: 'world' as MapLevel,
      children: Array.from(data.countries).map(country => ({
        id: country,
        name: country,
        count: 0, // Will be filled when drilling down
        percentage: 0,
        level: 'continent' as MapLevel
      }))
    }))
    .sort((a, b) => b.count - a.count);
}

function aggregateContinents(
  bookings: Booking[],
  total: number,
  state?: MapState
): VisitorData[] {
  const countryMap: Record<string, { count: number; continent: string }> = {};
  
  bookings.forEach(booking => {
    const country = booking.guest_country;
    if (!country) return;
    
    const continent = COUNTRY_TO_CONTINENT[country] || 'Other';
    // If filtering by continent
    if (state?.selectedContinent && continent !== state.selectedContinent) {
      return;
    }
    if (!countryMap[country]) {
      countryMap[country] = { count: 0, continent };
    }
    countryMap[country].count++;
  });

  return Object.entries(countryMap)
    .map(([name, data]) => ({
      id: name,
      name,
      count: data.count,
      percentage: (data.count / total) * 100,
      level: 'continent' as MapLevel,
      parent: data.continent
    }))
    .sort((a, b) => b.count - a.count);
}

function aggregateCountries(
  bookings: Booking[],
  total: number,
  state?: MapState
): VisitorData[] {
  // Implementation for country-level aggregation
  // This would group by province
  const provinceMap: Record<string, { count: number; country: string }> = {};
  
  bookings.forEach(booking => {
    const province = booking.guest_province;
    const country = booking.guest_country;
    if (!province || !country) return;
    
    // If filtering by country
    if (state?.selectedCountry && country !== state.selectedCountry) {
      return;
    }
    
    if (!provinceMap[province]) {
      provinceMap[province] = { count: 0, country };
    }
    provinceMap[province].count++;
  });

  return Object.entries(provinceMap)
    .map(([name, data]) => ({
      id: name,
      name,
      count: data.count,
      percentage: (data.count / total) * 100,
      level: 'country' as MapLevel,
      parent: data.country
    }))
    .sort((a, b) => b.count - a.count);
}

function aggregateProvinces(
  bookings: Booking[],
  total: number,
  state?: MapState
): VisitorData[] {
  // Implementation for province-level aggregation
  // This would group by city
  const cityMap: Record<string, { count: number; province: string; country: string }> = {};
  
  bookings.forEach(booking => {
    const city = booking.guest_city;
    const province = booking.guest_province;
    const country = booking.guest_country;
    if (!city || !province || !country) return;
    
    // If filtering by province
    if (state?.selectedProvince && province !== state.selectedProvince) {
      return;
    }
    
    if (!cityMap[city]) {
      cityMap[city] = { count: 0, province, country };
    }
    cityMap[city].count++;
  });

  return Object.entries(cityMap)
    .map(([name, data]) => ({
      id: name,
      name,
      count: data.count,
      percentage: (data.count / total) * 100,
      level: 'province' as MapLevel,
      parent: data.province
    }))
    .sort((a, b) => b.count - a.count);
}
