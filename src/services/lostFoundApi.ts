// src/services/lostFoundApi.ts

import type {
  LostFoundItem,
  LostFoundActivity,
  LostFoundCategory,
  LostFoundStorageLocation,
  LostFoundDashboardStats,
  CreateLostFoundPayload,
  UpdateLostFoundPayload,
  ContactGuestPayload,
  CollectItemPayload,
} from '../types/lostFound';

async function parseJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }
  return data;
}

function authHeaders(): HeadersInit {
  try {
    const authStr =
      localStorage.getItem('fastcheckin_auth') ||
      localStorage.getItem('fastcheckin_employee_auth') ||
      localStorage.getItem('fastcheckin_business_auth');
    if (authStr) {
      const auth = JSON.parse(authStr);
      const token = auth.token || auth.access_token;
      if (token) {
        return {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        };
      }
    }
  } catch {
    /* ignore */
  }
  return { 'Content-Type': 'application/json' };
}

export async function fetchLostFoundItems(params: {
  businessId: string;
  status?: string;
  category?: string;
  search?: string;
  roomNumber?: string;
  tagNumber?: string;
  bookingReference?: string;
  employee?: string;
  storage?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<{ items: LostFoundItem[]; stats: LostFoundDashboardStats }> {
  const qs = new URLSearchParams({ businessId: params.businessId });
  if (params.status) qs.set('status', params.status);
  if (params.category) qs.set('category', params.category);
  if (params.search) qs.set('search', params.search);
  if (params.roomNumber) qs.set('roomNumber', params.roomNumber);
  if (params.tagNumber) qs.set('tagNumber', params.tagNumber);
  if (params.bookingReference) qs.set('bookingReference', params.bookingReference);
  if (params.employee) qs.set('employee', params.employee);
  if (params.storage) qs.set('storage', params.storage);
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params.dateTo) qs.set('dateTo', params.dateTo);
  if (params.limit) qs.set('limit', String(params.limit));

  const res = await fetch(`/.netlify/functions/get-lost-found-items?${qs}`, {
    headers: authHeaders(),
  });
  const data = await parseJson(res);
  return {
    items: data.items || [],
    stats: data.stats || {
      total: 0,
      newly_found: 0,
      awaiting_contact: 0,
      awaiting_collection: 0,
      returned: 0,
      archived: 0,
      unclaimed: 0,
      recently_found: 0,
      recently_returned: 0,
    },
  };
}

export async function fetchLostFoundItem(
  businessId: string,
  itemId: string
): Promise<{ item: LostFoundItem; activity: LostFoundActivity[] }> {
  const qs = new URLSearchParams({ businessId, itemId });
  const res = await fetch(`/.netlify/functions/get-lost-found-item?${qs}`, {
    headers: authHeaders(),
  });
  const data = await parseJson(res);
  return { item: data.item, activity: data.activity || [] };
}

/** Upload compressed base64 images to Supabase Storage bucket lost-found-photos */
export async function uploadLostFoundPhotos(params: {
  businessId: string;
  images: string[];
  tagNumber?: string;
}): Promise<string[]> {
  const res = await fetch('/.netlify/functions/upload-lost-found-photo', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      businessId: params.businessId,
      images: params.images,
      tagNumber: params.tagNumber || 'pending',
    }),
  });
  const data = await parseJson(res);
  return data.urls || [];
}

export async function createLostFoundItem(
  payload: CreateLostFoundPayload
): Promise<LostFoundItem> {
  // Photos optional — may be empty array or omitted
  const res = await fetch('/.netlify/functions/create-lost-found-item', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.item;
}

export async function updateLostFoundItem(
  payload: UpdateLostFoundPayload
): Promise<LostFoundItem> {
  const res = await fetch('/.netlify/functions/update-lost-found-item', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.item;
}

export async function contactLostFoundGuest(
  payload: ContactGuestPayload
): Promise<{ item: LostFoundItem; activity: LostFoundActivity }> {
  const res = await fetch('/.netlify/functions/contact-lost-found-guest', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return { item: data.item, activity: data.activity };
}

export async function collectLostFoundItem(
  payload: CollectItemPayload
): Promise<LostFoundItem> {
  const res = await fetch('/.netlify/functions/collect-lost-found-item', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.item;
}

export async function fetchLostFoundMeta(businessId: string): Promise<{
  categories: LostFoundCategory[];
  storageLocations: LostFoundStorageLocation[];
}> {
  const res = await fetch(
    `/.netlify/functions/get-lost-found-meta?businessId=${encodeURIComponent(businessId)}`,
    { headers: authHeaders() }
  );
  const data = await parseJson(res);
  return {
    categories: data.categories || [],
    storageLocations: data.storageLocations || [],
  };
}

export async function addLostFoundCategory(payload: {
  businessId: string;
  name: string;
}): Promise<LostFoundCategory> {
  const res = await fetch('/.netlify/functions/manage-lost-found-meta', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ...payload, action: 'add_category' }),
  });
  const data = await parseJson(res);
  return data.category;
}

export async function addLostFoundStorage(payload: {
  businessId: string;
  name: string;
}): Promise<LostFoundStorageLocation> {
  const res = await fetch('/.netlify/functions/manage-lost-found-meta', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ...payload, action: 'add_storage' }),
  });
  const data = await parseJson(res);
  return data.storage;
}

export async function resolveGuestFromRoom(params: {
  businessId: string;
  roomId?: string;
  roomNumber?: string;
}): Promise<{
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  booking_id?: string;
  booking_reference?: string;
  check_in_date?: string;
  check_out_date?: string;
  room_id?: string;
  room_number?: string;
  room_name?: string;
} | null> {
  const qs = new URLSearchParams({ businessId: params.businessId });
  if (params.roomId) qs.set('roomId', params.roomId);
  if (params.roomNumber) qs.set('roomNumber', params.roomNumber);
  const res = await fetch(`/.netlify/functions/resolve-lost-found-guest?${qs}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return null;
  const data = await parseJson(res);
  return data.guest || null;
}
