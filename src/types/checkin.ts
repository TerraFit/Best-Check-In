// src/types/checkin.ts

export interface BusinessBranding {
  id: string;
  trading_name: string;
  registered_name: string;
  slogan?: string;
  logo_url?: string;
  hero_image_url?: string;
  primary_color?: string;
  secondary_color?: string;
  welcome_message?: string;
  phone?: string;
  email?: string;
  physical_address?: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  avg_price?: number;
  service_paused?: boolean;
}

export interface FoodRestrictions {
  vegetarian: boolean;
  vegan: boolean;
  pescatarian: boolean;
  halal: boolean;
  kosher: boolean;
  gluten_free: boolean;
  lactose_free: boolean;
  nut_allergy: boolean;
  seafood_allergy: boolean;
  diabetic: boolean;
  no_pork: boolean;
  carnivore: boolean;
  other: boolean;
  other_text: string;
}

export interface CheckInFormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  passportOrId: string;
  country: string;
  city: string;
  province: string;
  arrivingFrom: string;
  nextDestination: string;
  settlement: string;
  arrivalDate: string;
  departureDate: string;
  nights: number;
  adults: number;
  kids: number;
  referral: string;
  idPhoto: string;
  signature: string;
  acceptLegal: boolean;
  popiaConsent: boolean;
  saveDetails: boolean;
  roomAllocation?: string; // ✅ Optional - can be null
}

export interface TouchedFields {
  firstName: boolean;
  lastName: boolean;
  passportOrId: boolean;
  phone: boolean;
  country: boolean;
  province: boolean;
  city: boolean;
  arrivalDate: boolean;
  nights: boolean;
  referral: boolean;
  arrivingFrom: boolean;
  nextDestination: boolean;
  settlement: boolean;
  idPhoto: boolean;
  signature: boolean;
  acceptLegal: boolean;
  roomAllocation: boolean; // ✅ Track touch state but not required
}

export const DEFAULT_RESTRICTIONS: FoodRestrictions = {
  vegetarian: false,
  vegan: false,
  pescatarian: false,
  halal: false,
  kosher: false,
  gluten_free: false,
  lactose_free: false,
  nut_allergy: false,
  seafood_allergy: false,
  diabetic: false,
  no_pork: false,
  carnivore: false,
  other: false,
  other_text: ''
};

export const DIETARY_OPTIONS = [
  { key: 'vegetarian', label: 'Vegetarian', icon: '🥬' },
  { key: 'vegan', label: 'Vegan', icon: '🌱' },
  { key: 'pescatarian', label: 'Pescatarian', icon: '🐟' },
  { key: 'halal', label: 'Halal', icon: '☪️' },
  { key: 'kosher', label: 'Kosher', icon: '✡️' },
  { key: 'gluten_free', label: 'Gluten-Free', icon: '🌾' },
  { key: 'lactose_free', label: 'Lactose-Free', icon: '🥛' },
  { key: 'nut_allergy', label: 'Nut Allergy', icon: '🥜' },
  { key: 'seafood_allergy', label: 'Seafood Allergy', icon: '🦐' },
  { key: 'diabetic', label: 'Diabetic', icon: '💉' },
  { key: 'no_pork', label: 'No Pork', icon: '🐷' },
  { key: 'carnivore', label: 'Carnivore', icon: '🥩' },
  { key: 'other', label: 'Other', icon: '📝' }
] as const;
