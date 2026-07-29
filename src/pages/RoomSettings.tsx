// src/pages/RoomSettings.tsx
// Dedicated Room Settings page (Phase 1) — not part of general Settings

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchRooms, syncRooms, updateRoom } from '../services/roomApi';
import { getRoomDisplayName } from '../services/roomDisplayService';
import type { Room } from '../types/room';

export default function RoomSettings() {
  const { getBusinessId } = useAuth();
  const navigate = useNavigate();
  const businessId = getBusinessId() || '';

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [totalRoomsInput, setTotalRoomsInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [excessPending, setExcessPending] = useState<Room[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('Standard');

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchRooms(businessId, { includeInactive: true });
      setRooms(list);
      const activeCount = list.filter((r) => r.active).length;
      setTotalRoomsInput(String(activeCount || list.length || ''));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSync = async (confirmDeactivate = false) => {
    if (!businessId) return;
    const n = parseInt(totalRoomsInput, 10);
    if (isNaN(n) || n < 0) {
      setError('Enter a valid room count');
      return;
    }
    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await syncRooms({
        businessId,
        totalRooms: n,
        confirmDeactivate,
      });
      if (result.requiresConfirmation && result.excessRooms?.length) {
        setExcessPending(result.excessRooms);
        setMessage(result.message || 'Confirm deactivation of excess rooms.');
        setRooms(result.rooms || []);
      } else {
        setExcessPending(null);
        setRooms(result.rooms || []);
        setMessage(
          `Synced: ${result.created} created, ${result.deactivated || 0} deactivated.`
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const startEdit = (room: Room) => {
    setEditingId(room.id);
    setEditName(room.room_name || '');
    setEditType(room.room_type || 'Standard');
  };

  const saveEdit = async () => {
    if (!editingId || !businessId) return;
    try {
      const updated = await updateRoom(editingId, businessId, {
        room_name: editName.trim() || null,
        room_type: editType,
      });
      setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setEditingId(null);
      setMessage('Room updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const toggleActive = async (room: Room) => {
    if (!businessId) return;
    try {
      const updated = await updateRoom(room.id, businessId, {
        active: !room.active,
        availability_status: room.active ? 'unavailable' : 'available',
      });
      setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update active state');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate('/business/dashboard')}
              className="text-sm text-orange-600 hover:text-orange-700 mb-1"
            >
              ← Back to dashboard
            </button>
            <h1 className="text-xl font-bold text-gray-900">Room Settings</h1>
            <p className="text-sm text-gray-500">
              Manage physical rooms. Room numbers and internal codes cannot be changed.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Sync from total */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Sync room inventory</h2>
          <p className="text-xs text-gray-500 mb-4">
            Creates sequential rooms up to the target count. Reducing the count never deletes rooms —
            excess rooms must be confirmed for deactivation.
          </p>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Target room count</label>
              <input
                type="number"
                min={0}
                value={totalRoomsInput}
                onChange={(e) => setTotalRoomsInput(e.target.value)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => handleSync(false)}
              disabled={syncing}
              className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {syncing ? 'Syncing…' : 'Sync rooms'}
            </button>
          </div>

          {excessPending && excessPending.length > 0 && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-900 font-medium mb-2">
                {excessPending.length} room(s) are above the new total and will be deactivated (not
                deleted):
              </p>
              <ul className="text-xs text-amber-800 mb-3 list-disc list-inside">
                {excessPending.map((r) => (
                  <li key={r.id}>{getRoomDisplayName(r)}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => handleSync(true)}
                disabled={syncing}
                className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700"
              >
                Confirm deactivate excess rooms
              </button>
            </div>
          )}

          {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </section>

        {/* Room list */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Rooms</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading rooms…</div>
          ) : rooms.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              No rooms yet. Set a target count and sync to create them.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Display name</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rooms.map((room) => (
                    <tr key={room.id} className={!room.active ? 'bg-gray-50 opacity-70' : ''}>
                      <td className="px-4 py-3 font-mono text-gray-700">{room.room_number}</td>
                      <td className="px-4 py-3">
                        {editingId === room.id ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Optional name"
                            className="w-full max-w-xs px-2 py-1 border rounded text-sm"
                          />
                        ) : (
                          getRoomDisplayName(room)
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{room.room_code}</td>
                      <td className="px-4 py-3">
                        {editingId === room.id ? (
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value)}
                            className="px-2 py-1 border rounded text-sm"
                          >
                            {['Standard', 'Deluxe', 'Luxury', 'Family', 'Suite', 'Tent', 'Chalet', 'Cottage'].map(
                              (t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              )
                            )}
                          </select>
                        ) : (
                          room.room_type
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="text-gray-600">{room.occupancy_status}</span>
                        {' · '}
                        <span className="text-gray-500">{room.housekeeping_status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleActive(room)}
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            room.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {room.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {editingId === room.id ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={saveEdit}
                              className="text-xs text-green-700 font-medium"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="text-xs text-gray-500"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(room)}
                            className="text-xs text-orange-600 font-medium"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
