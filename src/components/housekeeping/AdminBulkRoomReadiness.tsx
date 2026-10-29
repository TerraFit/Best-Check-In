import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchRooms } from '../../services/roomApi';
import { getEmployeeAuth } from '../../utils/auth';
import type { Room } from '../../types/room';

interface Props { businessId: string; }

function roomLabel(room: Room): string {
  return room.room_name?.trim() || `Room ${room.room_number}`;
}

function blockedReason(room: Room): string | null {
  if (!room.active) return 'Inactive';
  if (room.availability_status !== 'available') return room.availability_status.replaceAll('_', ' ');
  if (room.occupancy_status !== 'vacant') return room.occupancy_status.replaceAll('_', ' ');
  return null;
}

/**
 * Owner/business-dashboard-only readiness shortcut. This intentionally updates
 * room readiness only; it does not mutate housekeeping tasks or service sessions.
 */
export default function AdminBulkRoomReadiness({ businessId }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchRooms(businessId, { includeInactive: true });
      setRooms(rows.slice().sort((a, b) => Number(a.room_number) - Number(b.room_number)));
      setSelected((current) => current.filter((id) => rows.some((room) => room.id === id && !blockedReason(room))));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load rooms');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { void load(); }, [load]);

  const eligibleRooms = useMemo(() => rooms.filter((room) => !blockedReason(room)), [rooms]);
  const allSelected = eligibleRooms.length > 0 && eligibleRooms.every((room) => selected.includes(room.id));

  // Employee sessions use the separate employee portal and must never see these controls.
  if (getEmployeeAuth()) return null;

  const toggleAll = () => setSelected((current) => allSelected
    ? current.filter((id) => !eligibleRooms.some((room) => room.id === id))
    : Array.from(new Set([...current, ...eligibleRooms.map((room) => room.id)]));
  const toggleRoom = (id: string) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);

  const applyAction = async (action: 'approved' | 'skipped') => {
    if (!selected.length || busy) return;
    const label = action === 'approved' ? 'Approve as cleaned' : 'Skip housekeeping';
    if (!window.confirm(`${label} for ${selected.length} selected room(s)? Eligible rooms will be marked ready for check-in. Maintenance, unavailable, inactive, and occupied/reserved rooms will not be changed.`)) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/.netlify/functions/admin-bulk-room-readiness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, roomIds: selected, action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      const updated = Number(data.updated || 0);
      const skipped = Number(data.notChanged || 0);
      setMessage(`${updated} room(s) marked ready. ${skipped ? `${skipped} room(s) left unchanged because they are unavailable or occupied.` : ''}`);
      setSelected([]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update room readiness');
      await load();
    } finally {
      setBusy(false);
    }
  };

  return <section className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-semibold text-gray-900">Owner / administrator: bulk room readiness</h3>
        <p className="mt-1 text-sm text-gray-600">A separate shortcut for onboarding. This does not change housekeeping staff tasks or active cleaning sessions.</p>
      </div>
      <button type="button" onClick={() => void load()} disabled={loading || busy} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-50">Refresh rooms</button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    {loading ? <p className="text-sm text-gray-500">Loading rooms…</p> : <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">{selected.length} selected · {eligibleRooms.length} eligible</p>
        <button type="button" onClick={toggleAll} disabled={!eligibleRooms.length || busy} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50">{allSelected ? 'Deselect all' : 'Select all eligible'}</button>
      </div>
      <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2">
        {rooms.map((room) => {
          const blocked = blockedReason(room);
          return <label key={room.id} className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm ${blocked ? 'text-gray-400' : 'text-gray-800 hover:bg-gray-50'}`}>
            <input type="checkbox" checked={selected.includes(room.id)} disabled={Boolean(blocked) || busy} onChange={() => toggleRoom(room.id)} />
            <span className="min-w-0 flex-1">{roomLabel(room)}</span>
            <span className="text-xs capitalize">{blocked || (room.housekeeping_status || 'unknown').replaceAll('_', ' ')}</span>
          </label>;
        })}
        {!rooms.length && <p className="p-3 text-sm text-gray-500">No rooms found.</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void applyAction('approved')} disabled={!selected.length || busy} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">{busy ? 'Applying…' : 'Approved as cleaned'}</button>
        <button type="button" onClick={() => void applyAction('skipped')} disabled={!selected.length || busy} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50">Skip housekeeping</button>
        <button type="button" onClick={() => setSelected([])} disabled={!selected.length || busy} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50">Clear selection</button>
      </div>
    </>}
  </section>;
}
