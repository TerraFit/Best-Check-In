export type SettlementMethod = 'Cash' | 'Card' | 'Instant EFT' | 'Instant EFT (RSA resident only)' | 'Part of a package';
export type ReferralSource = 'Word of mouth' | 'Booking.com' | 'Google' | 'Facebook / Instagram' | 'Travel Agency' | 'LinkedIn' | 'Youtube.com' | 'Research engine' | 'TikTok';

export interface Booking {
  id: string;
  guestName: string;
  email: string;
  phone: string;
  country: string;
  city?: string;
  province?: string;
  passportOrId: string; // Statutory requirement
  nextDestination: string; // Statutory requirement
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  settlementMethod: SettlementMethod;
  referralSource: ReferralSource;
  guests: number; // Total guests
  adults: number;
  kids: number;
  roomType: 'Luxury Safari Tent' | 'Suite' | 'Lodge Room';
  totalAmount: number;
  status: 'Confirmed' | 'Checked-In' | 'Completed';
  year: number;
  month: string;
  signatureData?: string; // Digital signature
  idPhotoData?: string; // ID photo capture
  popiaMarketingConsent: boolean; // POPIA requirement
  timestamp: string;
  // Lodge Representative Acknowledgement
  lodgeRepName?: string;
  lodgeRepSignature?: string;
  lodgeRepDate?: string;
  tenantId?: string; // ← ADD THIS LINE for multi-tenant isolation
  source?: 'csv_import' | 'live_checkin' | 'manual'; // ← ADD THIS for data tracking
  season?: 'High' | 'Low' | 'Mid'; // ← ADD THIS for analytics
}

export interface SeasonStats {
  season: 'High' | 'Low' | 'Mid';
  bookings: number;
  revenue: number;
  occupancy: number;
}

export interface MonthlyData {
  month: string;
  year: number;
  bookings: number;
  revenue: number;
  referralData?: Record<string, number>;
  occupancyPercent?: number; // Added for marketing overview
  tenantId?: string; // ← ADD THIS (optional, for filtering)
}

export type ViewState = 'HOME' | 'CHECKIN' | 'ADMIN_DASHBOARD' | 'REPORTS' | 'IMPORT' | 'LOGIN';
