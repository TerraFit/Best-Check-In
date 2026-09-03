// src/services/roomApi.ts
// Client-side API wrappers for Room Operations (Phase 1)

import type { Room, RoomUpdatePayload, AssignRoomPayload, SyncRoomsResult } from '../types/room';
import { getAuthToken } from '../utils/auth';

async function parseJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }
  return data;
}

export async function fetchRooms(businessId: string, options?: { includeInactive?: boolean }): Promise<Room[]> {
  const params = new URLSearchParams({ businessId });
  if (options?.includeInactive) params.set('includeInactive', 'true');
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/.netlify/functions/get-rooms?${params}`, { headers });
  const data = await parseJson(res);
  return data.rooms || data.data || [];
}

export async function fetchAvailableRooms(params: {
  businessId: string;
  checkIn: string;
  checkOut: string;
  excludeBookingId?: string;
}): Promise<Room[]> {
  const qs = new URLSearchParams({
    businessId: params.businessId,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
  });
  if (params.excludeBookingId) qs.set('excludeBookingId', params.excludeBookingId);
  const res = await fetch(`/.netlify/functions/get-available-rooms?${qs}`);
  const data = await parseJson(res);
  return data.rooms || data.data || [];
}

export async function syncRooms(payload: {
  businessId: string;
  totalRooms: number;
  confirmDeactivate?: boolean;
}): Promise<SyncRoomsResult> {
  const res = await fetch('/.netlify/functions/sync-rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function updateRoom(
  roomId: string,
  businessId: string,
  updates: RoomUpdatePayload
): Promise<Room> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch('/.netlify/functions/update-room', {
    method: 'POST',
    headers,
    body: JSON.stringify({ roomId, businessId, ...updates }),
  });
  const data = await parseJson(res);
  return data.room || data.data;
}

export async function assignRoomToBooking(payload: AssignRoomPayload): Promise<{
  success: boolean;
  booking?: any;
  room?: Room | null;
}> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch('/.netlify/functions/assign-room-to-booking', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}
