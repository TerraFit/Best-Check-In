export type UserRole = 'owner' | 'EmployeeOverview';

export interface AuthUser {
  id: string;
  email?: string;
  phone_number?: string;
  full_name: string;
  role: UserRole;
  business_id: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface Employee {
  id: string;
  business_id: string;
  full_name: string;
  phone_number: string;
  password_hash?: string;
  role: 'EmployeeOverview';
  status: 'Pending' | 'Active' | 'Disabled';
  invitation_token: string;
  invitation_expiry: string; // ISO String (7 days from creation)
  invited_at: string;
  activated_at?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface FoodRestrictions {
  vegetarian: boolean;
  vegan: boolean;
  halal: boolean;
  kosher: boolean;
  gluten_free: boolean;
  dairy_free: boolean;
  lactose_intolerant: boolean;
  nut_allergy: boolean;
  shellfish_allergy: boolean;
  egg_allergy: boolean;
  soy_allergy: boolean;
  pork_free: boolean;
  diabetic: boolean;
  no_seafood: boolean;
  other: boolean;
  other_text?: string;
}

export interface Booking {
  id: string;
  business_id: string;
  guest_name: string;
  guest_first_name?: string;
  guest_last_name?: string;
  guest_email?: string;
  guest_phone?: string;
  guest_country: string;
  guest_province: string;
  guest_city: string;
  passport_or_id: string;
  check_in_date: string;
  check_out_date?: string;
  nights: number;
  adults: number;
  children: number;
  total_amount: number;
  status: 'checked_in' | 'completed' | 'confirmed' | 'cancelled';
  booking_source: string;
  referral_source: string;
  popia_marketing_consent: boolean;
  arriving_from: string;
  next_destination: string;
  food_restrictions: FoodRestrictions;
  id_photo_url?: string;
  signature_url?: string;
  created_at: string;
  updated_at: string;

  // Compatibility fields for legacy checkin & analytics templates
  guestName?: string;
  email?: string;
  phone?: string;
  country?: string;
  province?: string;
  city?: string;
  passportOrId?: string;
  nextDestination?: string;
  settlementMethod?: string;
  referralSource?: string;
  guests?: number;
  kids?: number;
  roomType?: string;
  totalAmount?: number;
  popiaMarketingConsent?: boolean;
  timestamp?: string;
  tenantId?: string;
  source?: string;
  season?: string;
  signatureData?: string;
  idPhotoData?: string;
  [key: string]: any;
}

export interface FoodRestrictionAuditLog {
  id: string;
  business_id: string;
  employee_id: string;
  employee_name: string;
  guest_id: string;
  guest_name: string;
  previous_value: string; // Comma separated list of active restrictions
  new_value: string;      // Comma separated list of new restrictions
  timestamp: string;      // ISO String
}

export interface BusinessConfig {
  id: string;
  trading_name: string;
  registered_name: string;
  logo_url?: string;
  hero_image_url?: string;
  slogan?: string;
  welcome_message?: string;
  total_rooms: number;
  avg_price: number;
}
