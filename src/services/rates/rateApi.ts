/**
 * Frontend rate management API — thin wrappers over Netlify functions.
 * No privileged credentials. Auth token is forwarded from the caller.
 * Domain resolution remains in rateResolutionFoundation (Step 5).
 */

async function parseJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `HTTP ${response.status}`);
  }
  return data;
}

function authHeaders(token?: string): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

// ── Seasons ──────────────────────────────────────────────────

export async function listSeasons(
  token: string,
  options?: { activeOnly?: boolean }
): Promise<any[]> {
  const qs = new URLSearchParams();
  if (options?.activeOnly) qs.set('activeOnly', 'true');
  const res = await fetch(`/.netlify/functions/manage-seasons?${qs}`, {
    headers: authHeaders(token),
  });
  const data = await parseJson(res);
  return data.data || [];
}

export async function createSeason(token: string, payload: Record<string, unknown>) {
  const res = await fetch('/.netlify/functions/manage-seasons', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function updateSeason(token: string, payload: Record<string, unknown>) {
  const res = await fetch('/.netlify/functions/manage-seasons', {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function setSeasonActive(token: string, id: string, active: boolean) {
  return updateSeason(token, { id, active });
}

// ── Room rates ───────────────────────────────────────────────

export async function listRoomRates(
  token: string,
  options?: { roomId?: string; seasonId?: string; activeOnly?: boolean }
): Promise<any[]> {
  const qs = new URLSearchParams();
  if (options?.roomId) qs.set('roomId', options.roomId);
  if (options?.seasonId) qs.set('seasonId', options.seasonId);
  if (options?.activeOnly) qs.set('activeOnly', 'true');
  const res = await fetch(`/.netlify/functions/manage-room-rates?${qs}`, {
    headers: authHeaders(token),
  });
  const data = await parseJson(res);
  return data.data || [];
}

export async function createRoomRate(token: string, payload: Record<string, unknown>) {
  const res = await fetch('/.netlify/functions/manage-room-rates', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function updateRoomRate(token: string, payload: Record<string, unknown>) {
  const res = await fetch('/.netlify/functions/manage-room-rates', {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function setRoomRateActive(token: string, id: string, active: boolean) {
  return updateRoomRate(token, { id, active });
}

// ── Specials ─────────────────────────────────────────────────

export async function listSpecials(
  token: string,
  options?: { activeOnly?: boolean }
): Promise<any[]> {
  const qs = new URLSearchParams();
  if (options?.activeOnly) qs.set('activeOnly', 'true');
  const res = await fetch(`/.netlify/functions/manage-rate-specials?${qs}`, {
    headers: authHeaders(token),
  });
  const data = await parseJson(res);
  return data.data || [];
}

export async function createSpecial(token: string, payload: Record<string, unknown>) {
  const res = await fetch('/.netlify/functions/manage-rate-specials', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function updateSpecial(token: string, payload: Record<string, unknown>) {
  const res = await fetch('/.netlify/functions/manage-rate-specials', {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function setSpecialActive(token: string, id: string, active: boolean) {
  return updateSpecial(token, { id, active });
}

// ── Provider mappings ────────────────────────────────────────

export async function listProviderMappings(
  token: string,
  options?: { provider?: string; activeOnly?: boolean }
): Promise<any[]> {
  const qs = new URLSearchParams();
  if (options?.provider) qs.set('provider', options.provider);
  if (options?.activeOnly) qs.set('activeOnly', 'true');
  const res = await fetch(`/.netlify/functions/manage-rate-provider-mappings?${qs}`, {
    headers: authHeaders(token),
  });
  const data = await parseJson(res);
  return data.data || [];
}

export async function createProviderMapping(token: string, payload: Record<string, unknown>) {
  const res = await fetch('/.netlify/functions/manage-rate-provider-mappings', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function updateProviderMapping(token: string, payload: Record<string, unknown>) {
  const res = await fetch('/.netlify/functions/manage-rate-provider-mappings', {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function setProviderMappingActive(token: string, id: string, active: boolean) {
  return updateProviderMapping(token, { id, active });
}

// ── Snapshots (read-only) ────────────────────────────────────

export async function listBookingRateSnapshots(
  token: string,
  options?: { bookingId?: string; fromDate?: string; toDate?: string; roomId?: string }
): Promise<any[]> {
  const qs = new URLSearchParams();
  if (options?.bookingId) qs.set('bookingId', options.bookingId);
  if (options?.fromDate) qs.set('fromDate', options.fromDate);
  if (options?.toDate) qs.set('toDate', options.toDate);
  if (options?.roomId) qs.set('roomId', options.roomId);
  const res = await fetch(`/.netlify/functions/list-booking-rate-snapshots?${qs}`, {
    headers: authHeaders(token),
  });
  const data = await parseJson(res);
  return data.data || [];
}
