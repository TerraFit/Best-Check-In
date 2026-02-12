
import { Booking, MonthlyData } from './types';

export const COLORS = {
  primary: '#2D3E40', // Deep Forest Green
  secondary: '#C5A059', // Golden Sand
  accent: '#7D5A50', // Earthy Brown
  background: '#F5F5F0', // Creamy White
};

export const HIGH_SEASON_MONTHS = [11, 0, 1, 2]; // Dec, Jan, Feb, Mar
export const LOW_SEASON_MONTHS = [4, 5, 6, 7]; // May, Jun, Jul, Aug

export const REFERRAL_SOURCES = [
  'Word of mouth',
  'Booking.com',
  'Google',
  'Facebook / Instagram',
  'Travel Agency',
  'LinkedIn',
  'Youtube.com',
  'Research engine',
  'TikTok'
];

export const SETTLEMENT_METHODS = [
  'Cash',
  'Card',
  'Instant EFT',
  'Instant EFT (RSA resident only)',
  'Part of a package'
];

export const COUNTRIES = [
  "South Africa",
  "Germany",
  "Switzerland",
  "Netherlands",
  "United Kingdom",
  "United States of America",
  "France",
  "Belgium",
  "Austria",
  "Italy",
  "Australia",
  "Canada",
  "Spain",
  "China",
  "Japan",
  "India"
];

export const SAMPLE_BOOKINGS: Booking[] = [
  {
    id: '1',
    guestName: 'John Smith',
    email: 'john@example.com',
    phone: '+27 82 123 4567',
    country: 'South Africa',
    province: 'Western Cape',
    city: 'Cape Town',
    passportOrId: '9001015001081',
    nextDestination: 'Port Elizabeth',
    checkInDate: '2024-03-01',
    checkOutDate: '2024-03-05',
    nights: 4,
    settlementMethod: 'Card',
    referralSource: 'Booking.com',
    guests: 2,
    adults: 2,
    kids: 0,
    roomType: 'Suite',
    totalAmount: 12000,
    status: 'Checked-In',
    year: 2024,
    month: 'Mar',
    popiaMarketingConsent: true,
    timestamp: new Date().toISOString()
  },
  {
    id: '2',
    guestName: 'Maria Garcia',
    email: 'maria@example.com',
    phone: '+34 600 000 000',
    country: 'Spain',
    passportOrId: 'XYZ123456',
    nextDestination: 'Kruger National Park',
    checkInDate: '2024-03-02',
    checkOutDate: '2024-03-06',
    nights: 4,
    settlementMethod: 'Card',
    referralSource: 'Google',
    guests: 3,
    adults: 2,
    kids: 1,
    roomType: 'Luxury Safari Tent',
    totalAmount: 15000,
    status: 'Checked-In',
    year: 2024,
    month: 'Mar',
    popiaMarketingConsent: false,
    timestamp: new Date().toISOString()
  }
];

export const MOCK_HISTORICAL_DATA: MonthlyData[] = [
  { month: 'Jan', year: 2023, bookings: 45, revenue: 180000, occupancyPercent: 88, referralData: { 'Booking.com': 20, 'Google': 15, 'Word of mouth': 10 } },
  { month: 'Feb', year: 2023, bookings: 38, revenue: 152000, occupancyPercent: 75, referralData: { 'Booking.com': 15, 'Google': 10, 'Word of mouth': 13 } },
  { month: 'Mar', year: 2023, bookings: 42, revenue: 168000, occupancyPercent: 82, referralData: { 'Booking.com': 18, 'Google': 12, 'Word of mouth': 12 } },
  { month: 'Apr', year: 2023, bookings: 30, revenue: 120000, occupancyPercent: 60, referralData: { 'Booking.com': 10, 'Google': 10, 'Word of mouth': 10 } },
  { month: 'May', year: 2023, bookings: 15, revenue: 60000, occupancyPercent: 30, referralData: { 'Booking.com': 5, 'Google': 5, 'Word of mouth': 5 } },
  { month: 'Jun', year: 2023, bookings: 12, revenue: 48000, occupancyPercent: 24, referralData: { 'Booking.com': 4, 'Google': 4, 'Word of mouth': 4 } },
  { month: 'Jul', year: 2023, bookings: 18, revenue: 72000, occupancyPercent: 36, referralData: { 'Booking.com': 6, 'Google': 6, 'Word of mouth': 6 } },
  { month: 'Aug', year: 2023, bookings: 22, revenue: 88000, occupancyPercent: 44, referralData: { 'Booking.com': 8, 'Google': 8, 'Word of mouth': 6 } },
  { month: 'Sep', year: 2023, bookings: 35, revenue: 140000, occupancyPercent: 70, referralData: { 'Booking.com': 12, 'Google': 13, 'Word of mouth': 10 } },
  { month: 'Oct', year: 2023, bookings: 40, revenue: 160000, occupancyPercent: 80, referralData: { 'Booking.com': 15, 'Google': 15, 'Word of mouth': 10 } },
  { month: 'Nov', year: 2023, bookings: 55, revenue: 220000, occupancyPercent: 92, referralData: { 'Booking.com': 25, 'Google': 20, 'Word of mouth': 10 } },
  { month: 'Dec', year: 2023, bookings: 65, revenue: 260000, occupancyPercent: 98, referralData: { 'Booking.com': 30, 'Google': 25, 'Word of mouth': 10 } }
];
