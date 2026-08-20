// src/pages/RoomSettings.tsx
// Final functional spec + status colour coding + i18n

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchRooms, updateRoom } from '../services/roomApi';
import {
  getRoomDisplayName,
  getRoomCardTone,
  getRoomToneBorderClass,
  getRoomToneSurfaceClass,
} from '../services/roomDisplayService';
import { isAvailableForAllocation, type Room } from '../types/room';
import { ROOM_TYPES, UNAVAILABLE_REASONS } from '../constants/roomTypes';
import { RoomStatusBadge, RoomStatusLegend } from '../components/rooms/RoomStatusBadge';
import { t } from '../i18n';

interface EditForm {
  room_name: string;
  room_type: string;
  max_adults: number;
  max_children: number;
  max_infants: number;
  availableForAllocation: boolean;
  unavailable_reason: string;
  notes: string;
}

const emptyForm = (room?: Room): EditForm => ({
  room_name: room?.room_name || '',
  room_type: room?.room_type || 'Standard Room',
  max_adults: room?.max_adults ?? 2,
  max_children: room?.max_children ?? 0,
  max_infants: room?.max_infants ?? 0,
  availableForAllocation: room ? isAvailableForAllocation(room) : true,
  unavailable_reason: room?.unavailable_reason || '',
  notes: room?.notes || '',
});

export default function RoomSettings() {
  const { getBusinessId } = useAuth();
  const businessId = getBusinessId() || '';

  const [rooms, setRooms] = useState<Room[]>([]);
  const [licensedRooms, setLicensedRooms] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState<EditForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      const [list, brandingRes] = await Promise.all([
        fetchRooms(businessId, { includeInactive: true }),
        fetch(`/.netlify/functions/get-business-branding?id=${encodeURIComponent(businessId)}`),
      ]);
      setRooms(
        list.sort((a, b) => Number(a.room_number) - Number(b.room_number))
      );

      if (brandingRes.ok) {
        const branding = await brandingRes.json();
        const total =
          branding.total_rooms ??
          branding.data?.total_rooms ??
          null;
        setLicensedRooms(typeof total === 'number' ? total : parseInt(total, 10) || null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('rooms_failed_load'));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (room: Room) => {
    setEditingRoom(room);
    setForm(emptyForm(room));
    setMessage(null);
    setError(null);
  };

  const closeEdit = () => {
    setEditingRoom(null);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!editingRoom || !businessId) return;
    setSaving(true);
    setError(null);
    try {
      const available = form.availableForAllocation;
      const updated = await updateRoom(editingRoom.id, businessId, {
        room_name: form.room_name.trim() || null,
        room_type: form.room_type,
        max_adults: form.max_adults,
        max_children: form.max_children,
        max_infants: form.max_infants,
        active: available,
        availability_status: available ? 'available' : 'unavailable',
        unavailable_reason: available ? null : form.unavailable_reason || null,
        notes: form.notes.trim() || null,
      });
      setRooms((prev) =>
        prev
          .map((r) => (r.id === updated.id ? updated : r))
          .sort((a, b) => Number(a.room_number) - Number(b.room_number))
      );
      setMessage(t('rooms_saved', { name: getRoomDisplayName(updated) }));
      closeEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('rooms_failed_save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">{t('rooms_title')}</h1>
          <p className="text-sm text-gray-500">{t('rooms_subtitle')}</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
            {t('rooms_licensed_capacity')}
          </h2>
          <p className="text-2xl font-bold text-gray-900">
            {t('rooms_licensed_rooms')}{' '}
            <span className="text-orange-600">
              {licensedRooms !== null ? licensedRooms : '—'}
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-2">{t('rooms_licensed_help')}</p>
        </section>

        {message && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            {message}
          </p>
        )}
        {error && !editingRoom && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">{t('rooms_list_title')}</h2>
            <RoomStatusLegend />
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">{t('rooms_loading')}</div>
          ) : rooms.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm max-w-md mx-auto">
              <p className="mb-2">{t('rooms_no_rooms')}</p>
              <p className="text-xs text-gray-400">{t('rooms_no_rooms_help')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">{t('rooms_room')}</th>
                    <th className="px-4 py-3">{t('rooms_room_type')}</th>
                    <th className="px-4 py-3">{t('rooms_status')}</th>
                    <th className="px-4 py-3">{t('rooms_available_for_allocation')}</th>
                    <th className="px-4 py-3">{t('rooms_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rooms.map((room) => {
                    const available = isAvailableForAllocation(room);
                    const tone = getRoomCardTone(room);
                    return (
                      <tr
                        key={room.id}
                        className={`${getRoomToneBorderClass(tone)} ${getRoomToneSurfaceClass(tone)}`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {getRoomDisplayName(room)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{room.room_type || '—'}</td>
                        <td className="px-4 py-3">
                          <RoomStatusBadge room={room} />
                        </td>
                        <td className="px-4 py-3">
                          {available ? (
                            <span className="inline-flex items-center gap-1 text-green-700 text-xs font-medium">
                              <span aria-hidden>✅</span> {t('rooms_available')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700 text-xs font-medium">
                              <span aria-hidden>❌</span>{' '}
                              {room.unavailable_reason || t('rooms_unavailable')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openEdit(room)}
                            className="text-xs font-medium text-orange-600 hover:text-orange-700"
                          >
                            {t('common_edit')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('rooms_edit_room')}</h3>
                <div className="mt-1">
                  <RoomStatusBadge room={editingRoom} />
                </div>
              </div>
              <button type="button" onClick={closeEdit} className="text-gray-400 hover:text-gray-600 text-sm">
                {t('rooms_close')}
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('rooms_room_number')}</label>
                <p className="text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  {editingRoom.room_number}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('rooms_room_name')}</label>
                <input
                  type="text"
                  value={form.room_name}
                  onChange={(e) => setForm((f) => ({ ...f, room_name: e.target.value }))}
                  placeholder={t('rooms_placeholder_name')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  {t('rooms_shown_as')}{' '}
                  <span className="font-medium text-gray-600">
                    {getRoomDisplayName({
                      room_number: Number(editingRoom.room_number),
                      room_name: form.room_name,
                    })}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('rooms_room_type')}</label>
                <select
                  value={form.room_type}
                  onChange={(e) => setForm((f) => ({ ...f, room_type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  {!ROOM_TYPES.includes(form.room_type as any) && form.room_type && (
                    <option value={form.room_type}>{form.room_type}</option>
                  )}
                  {ROOM_TYPES.map((rt) => (
                    <option key={rt} value={rt}>
                      {rt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">{t('rooms_capacity')}</label>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      ['max_adults', t('rooms_adults')],
                      ['max_children', t('rooms_children')],
                      ['max_infants', t('rooms_infants')],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-[10px] text-gray-400 mb-1">{label}</label>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={form[key]}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            [key]: Math.max(0, parseInt(e.target.value, 10) || 0),
                          }))
                        }
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.availableForAllocation}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        availableForAllocation: e.target.checked,
                        unavailable_reason: e.target.checked ? '' : f.unavailable_reason,
                      }))
                    }
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-800">{t('rooms_available_for_allocation')}</span>
                </label>
                <p className="text-[11px] text-gray-400">{t('rooms_allocation_help')}</p>

                {!form.availableForAllocation && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t('rooms_reason')}</label>
                    <select
                      value={form.unavailable_reason}
                      onChange={(e) => setForm((f) => ({ ...f, unavailable_reason: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    >
                      <option value="">{t('rooms_select_reason')}</option>
                      {UNAVAILABLE_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('rooms_notes')}</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder={t('rooms_placeholder_notes')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {t('rooms_cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {saving ? t('rooms_saving') : t('rooms_save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
