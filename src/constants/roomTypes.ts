// src/constants/roomTypes.ts
// Central room type and unavailability reason lists — reuse across the app

export const ROOM_TYPES = [
  'Standard Room',
  'Luxury Room',
  'Family Room',
  'Junior Suite',
  'Suite',
  'Luxury Suite',
  'Cottage',
  'Villa',
  'Tent',
  'Luxury Tent',
  'Apartment',
  'Luxury Apartment',
  'Penthouse',
] as const;

export type CanonicalRoomType = (typeof ROOM_TYPES)[number];

export const UNAVAILABLE_REASONS = [
  'Maintenance',
  'Renovation',
  'Plumbing',
  'Electrical repairs',
  'Pest control',
  'Owner use',
  'Other',
] as const;

export type UnavailableReason = (typeof UNAVAILABLE_REASONS)[number];
