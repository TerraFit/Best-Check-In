// src/services/geoLoader.ts
import { GeoFeature, MapLevel } from '../types/map';

// Base URL for GeoJSON data
const GEO_BASE_URL = '/data/geo';

// Cache for loaded GeoJSON data
const geoCache = new Map<string, any>();

export async function loadGeoData(
  level: MapLevel,
  id?: string
): Promise<{ features: GeoFeature[]; bounds?: any }> {
  let path: string;
  
  switch (level) {
    case 'world':
      path = `${GEO_BASE_URL}/world.geo.json`;
      break;
    case 'continent':
      path = `${GEO_BASE_URL}/continents/${id?.toLowerCase()}.geo.json`;
      break;
    case 'country':
      path = `${GEO_BASE_URL}/countries/${id?.toUpperCase()}.geo.json`;
      break;
    case 'province':
      path = `${GEO_BASE_URL}/provinces/${id?.toUpperCase()}.geo.json`;
      break;
    default:
      throw new Error(`Unsupported level: ${level}`);
  }

  // Check cache
  if (geoCache.has(path)) {
    return geoCache.get(path)!;
  }

  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load GeoJSON: ${response.status}`);
    }
    const data = await response.json();
    
    const result = {
      features: data.features || [],
      bounds: data.bounds || null
    };
    
    geoCache.set(path, result);
    return result;
  } catch (error) {
    console.error(`Error loading GeoJSON for ${level} ${id}:`, error);
    // Return empty features array as fallback
    return { features: [] };
  }
}

export function clearGeoCache(): void {
  geoCache.clear();
}

export function preloadGeoData(level: MapLevel, ids: string[]): void {
  ids.forEach(id => {
    loadGeoData(level, id).catch(() => {});
  });
}
