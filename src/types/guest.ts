// src/types/guest.ts

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
  other: boolean;
  other_text: string;
}

export interface GuestDetails {
  id: string;
  guest_name: string;
  guest_first_name?: string;
  guest_last_name?: string;
  guest_email?: string;
  guest_phone?: string;
  guest_country?: string;
  guest_province?: string;
  guest_city?: string;
  arriving_from?: string;
  guests: number;
  adults: number;
  children: number;
  check_in_date: string;
  check_out_date?: string;
  nights: number;
  booking_reference?: string;
  booking_source?: string;
  referral_source?: string;
  food_restrictions?: FoodRestrictions;
  created_at?: string;
  updated_at?: string;
}
