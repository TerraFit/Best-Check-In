// src/services/roomApi.ts
// Client-side API wrappers for Room Operations (Phase 1)

import type { Room, RoomUpdatePayload, AssignRoomPayload, SyncRoomsResult } from '../types/room';

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
  const res = await fetch(`/.netlify/functions/get-rooms?${params}`);
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
  const res = await fetch('/.netlify/functions/update-room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const res = await fetch('/.netlify/functions/assign-room-to-booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}
