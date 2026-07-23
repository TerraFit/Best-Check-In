// src/types/guest.ts
export interface GuestDetails {
  id: string;
  guest_name: string;
  guest_first_name?: string;
  guest_last_name?: string;
  guest_email?: string;
  guest_phone?: string;
  guest_country?: string;
  arriving_from?: string;
  next_destination?: string;
  guests?: number;
  adults?: number;
  children?: number;
  check_in_date: string;
  check_out_date?: string;
  booking_reference?: string;
  food_restrictions?: FoodRestrictions;
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
  other_text?: string;
}
