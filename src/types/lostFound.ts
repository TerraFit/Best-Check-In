// src/types/lostFound.ts
// Lost & Found Management Module types

export type LostFoundStatus =
  | 'newly_found'
  | 'awaiting_contact'
  | 'guest_contacted'
  | 'guest_replied'
  | 'collection_arranged'
  | 'courier_booked'
  | 'returned'
  | 'collected'
  | 'unclaimed'
  | 'archived';

export type LostFoundCondition =
  | 'excellent'
  | 'good'
  | 'fair'
  | 'poor'
  | 'damaged';

export type LostFoundActivityType =
  | 'created'
  | 'photos_added'
  | 'status_change'
  | 'note_added'
  | 'guest_contacted'
  | 'guest_replied'
  | 'storage_updated'
  | 'returned'
  | 'collected'
  | 'archived'
  | 'updated'
  | 'reminder_sent';

export type CommunicationMethod =
  | 'email'
  | 'sms'
  | 'whatsapp'
  | 'phone'
  | 'in_person'
  | 'other';

export interface LostFoundItem {
  id: string;
  business_id: string;
  tag_number: string | null;
  item_name: string | null;
  description: string | null;
  category: string | null;
  found_date: string;
  time_found?: string | null;
  room_id?: string | null;
  room_number?: string | null;
  room_name?: string | null;
  booking_id?: string | null;
  booking_reference?: string | null;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  found_by_staff_id?: string | null;
  found_by_staff_name?: string | null;
  housekeeping_task_id?: string | null;
  storage_location?: string | null;
  storage_detail?: string | null;
  condition?: LostFoundCondition | null;
  estimated_value?: number | null;
  internal_notes?: string | null;
  notes?: string | null;
  photo_urls?: string[] | null;
  status: LostFoundStatus;
  returned_at?: string | null;
  returned_to?: string | null;
  archived_at?: string | null;
  collected_by_name?: string | null;
  collected_by_id_number?: string | null;
  collection_signature_url?: string | null;
  released_by_staff_id?: string | null;
  released_by_staff_name?: string | null;
  last_reminder_at?: string | null;
  reminder_count?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface LostFoundActivity {
  id: string;
  business_id: string;
  item_id: string;
  event_type: LostFoundActivityType;
  employee_id?: string | null;
  employee_name?: string | null;
  communication_method?: CommunicationMethod | null;
  outcome?: string | null;
  from_status?: string | null;
  to_status?: string | null;
  details?: Record<string, unknown> | null;
  notes?: string | null;
  created_at: string;
}

export interface LostFoundCategory {
  id: string;
  business_id?: string | null;
  name: string;
  is_builtin: boolean;
  sort_order: number;
  active: boolean;
}

export interface LostFoundStorageLocation {
  id: string;
  business_id?: string | null;
  name: string;
  is_builtin: boolean;
  sort_order: number;
  active: boolean;
}

export interface LostFoundDashboardStats {
  total: number;
  newly_found: number;
  awaiting_contact: number;
  awaiting_collection: number;
  returned: number;
  archived: number;
  unclaimed: number;
  recently_found: number;
  recently_returned: number;
  found_this_month?: number;
  avg_days_to_collection?: number | null;
  outstanding?: number;
  /** Open items with no photos — operational task */
  missing_photos?: number;
  ready_for_collection?: number;
  overdue?: number;
}

export type LostFoundViewMode = 'employee' | 'business';

export interface CreateLostFoundPayload {
  businessId: string;
  item_name: string;
  description?: string;
  category?: string;
  found_date?: string;
  time_found?: string;
  room_id?: string | null;
  room_number?: string | null;
  room_name?: string | null;
  booking_id?: string | null;
  booking_reference?: string | null;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  found_by_staff_id?: string | null;
  found_by_staff_name?: string | null;
  storage_location?: string | null;
  storage_detail?: string | null;
  condition?: LostFoundCondition;
  estimated_value?: number | null;
  internal_notes?: string | null;
  photo_urls?: string[];
  status?: LostFoundStatus;
}

export interface UpdateLostFoundPayload {
  businessId: string;
  itemId: string;
  item_name?: string;
  description?: string;
  category?: string;
  found_date?: string;
  time_found?: string;
  room_id?: string | null;
  room_number?: string | null;
  room_name?: string | null;
  booking_id?: string | null;
  booking_reference?: string | null;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  storage_location?: string | null;
  storage_detail?: string | null;
  condition?: LostFoundCondition;
  estimated_value?: number | null;
  internal_notes?: string | null;
  photo_urls?: string[];
  status?: LostFoundStatus;
  returned_to?: string | null;
  employee_id?: string | null;
  employee_name?: string | null;
  note?: string;
}

export interface ContactGuestPayload {
  businessId: string;
  itemId: string;
  method: CommunicationMethod;
  outcome?: string;
  notes?: string;
  employee_id?: string | null;
  employee_name?: string | null;
  new_status?: LostFoundStatus;
}

export interface CollectItemPayload {
  businessId: string;
  itemId: string;
  collected_by_name: string;
  collected_by_id_number?: string;
  collection_signature_url?: string;
  employee_id?: string | null;
  employee_name?: string | null;
}

export const LOST_FOUND_STATUS_LABELS: Record<LostFoundStatus, string> = {
  newly_found: 'Found',
  awaiting_contact: 'Awaiting Contact',
  guest_contacted: 'Guest Contacted',
  guest_replied: 'Guest Replied',
  collection_arranged: 'Collection Scheduled',
  courier_booked: 'Courier Booked',
  returned: 'Returned',
  collected: 'Collected',
  unclaimed: 'Unclaimed',
  archived: 'Archived',
};

export const LOST_FOUND_STATUS_COLORS: Record<LostFoundStatus, string> = {
  newly_found: 'bg-amber-100 text-amber-800',
  awaiting_contact: 'bg-orange-100 text-orange-800',
  guest_contacted: 'bg-blue-100 text-blue-800',
  guest_replied: 'bg-sky-100 text-sky-800',
  collection_arranged: 'bg-indigo-100 text-indigo-800',
  courier_booked: 'bg-purple-100 text-purple-800',
  returned: 'bg-green-100 text-green-800',
  collected: 'bg-emerald-100 text-emerald-800',
  unclaimed: 'bg-red-100 text-red-800',
  archived: 'bg-stone-100 text-stone-600',
};

export const GUEST_TIMELINE: LostFoundStatus[] = [
  'newly_found',
  'guest_contacted',
  'guest_replied',
  'collection_arranged',
  'collected',
  'archived',
];

export const BUILTIN_CATEGORIES = [
  'Clothing',
  'Electronics',
  'Jewellery',
  'Documents',
  'Wallets',
  'Keys',
  'Chargers',
  'Toiletries',
  'Toys',
  'Books',
  'Sports Equipment',
  'Medical Devices',
  'Miscellaneous',
] as const;

export const BUILTIN_STORAGE = [
  'Reception Safe',
  'Reception Shelf A',
  'Reception Shelf B',
  'Housekeeping Cupboard',
  'Manager Safe',
  'Maintenance Room',
  'Laundry',
  'External Storage',
] as const;

export const CONDITION_OPTIONS: Array<{ id: LostFoundCondition; label: string }> = [
  { id: 'excellent', label: 'Excellent' },
  { id: 'good', label: 'Good' },
  { id: 'fair', label: 'Fair' },
  { id: 'poor', label: 'Poor' },
  { id: 'damaged', label: 'Damaged' },
];

export const STATUS_WORKFLOW: LostFoundStatus[] = [
  'newly_found',
  'awaiting_contact',
  'guest_contacted',
  'guest_replied',
  'collection_arranged',
  'courier_booked',
  'returned',
  'collected',
  'unclaimed',
  'archived',
];

export const REMINDER_DAYS = [1, 3, 7, 30, 90, 365] as const;
