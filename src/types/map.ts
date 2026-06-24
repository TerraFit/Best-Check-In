// src/types/map.ts
export type MapLevel = 'world' | 'continent' | 'country' | 'province' | 'city';

export interface MapState {
  level: MapLevel;
  selectedContinent?: string;
  selectedCountry?: string;
  selectedProvince?: string;
  selectedCity?: string;
  breadcrumb: string[];
}

export interface GeoFeature {
  id: string;
  geometry: any;
  properties: {
    name: string;
    code?: string;
    continent?: string;
    countryCode?: string;
  };
}

export interface VisitorData {
  id: string;
  name: string;
  code?: string;
  count: number;
  percentage: number;
  level: MapLevel;
  children?: VisitorData[];
  parent?: string;
  coordinates?: { lat: number; lng: number };
}

export interface MapPermissions {
  maxLevel: MapLevel;
  canViewCountries: boolean;
  canViewProvinces: boolean;
  canViewCities: boolean;
}

export const PLAN_PERMISSIONS: Record<string, MapPermissions> = {
  starter: {
    maxLevel: 'world',
    canViewCountries: false,
    canViewProvinces: false,
    canViewCities: false
  },
  growth: {
    maxLevel: 'continent',
    canViewCountries: true,
    canViewProvinces: false,
    canViewCities: false
  },
  pro: {
    maxLevel: 'country',
    canViewCountries: true,
    canViewProvinces: true,
    canViewCities: false
  },
  business: {
    maxLevel: 'city',
    canViewCountries: true,
    canViewProvinces: true,
    canViewCities: true
  },
  enterprise: {
    maxLevel: 'city',
    canViewCountries: true,
    canViewProvinces: true,
    canViewCities: true
  }
};

export const LEVEL_ORDER: Record<MapLevel, number> = {
  'world': 0,
  'continent': 1,
  'country': 2,
  'province': 3,
  'city': 4
};
