// Create form — photos optional so staff can register items immediately
import { useState } from 'react';
import { X } from 'lucide-react';
import PhotoCapture from './PhotoCapture';
import {
  createLostFoundItem,
  uploadLostFoundPhotos,
  resolveGuestFromRoom,
} from '../../services/lostFoundApi';
import { CONDITION_OPTIONS, BUILTIN_STORAGE } from '../../types/lostFound';
import type { LostFoundItem, LostFoundCondition } from '../../types/lostFound';

interface Props {
  businessId: string;
  categories: string[];
  storageOptions: string[];
  employeeId?: string | null;
  employeeName?: string | null;
  initialRoomNumber?: string | null;
  onClose: () => void;
  onCreated: (item: LostFoundItem) => void;
}

export default function LostFoundCreateForm({
  businessId,
  categories,
  storageOptions,
  employeeId,
  employeeName,
  initialRoomNumber,
  onClose,
  onCreated,
}: Props) {
  const storages = storageOptions.length ? storageOptions : [...BUILTIN_STORAGE];
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    item_name: '',
    description: '',
    category: categories[0] || 'Miscellaneous',
    found_date: new Date().toISOString().slice(0, 10),
    time_found: '',
    room_number: initialRoomNumber || '',
    storage_location: storages[0] || 'Reception Safe',
    storage_detail: '',
    condition: 'good' as LostFoundCondition,
    estimated_value: '',
    internal_notes: '',
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    booking_id: null as string | null,
    booking_reference: '',
    room_id: null as string | null,
    room_name: '',
    check_in_date: '',
    check_out_date: '',
  });

  const onRoomBlur = async () => {
    if (!form.room_number.trim()) return;
    try {
      const guest = await resolveGuestFromRoom({
        businessId,
        roomNumber: form.room_number.trim(),
      });
      if (guest) {
        setForm((f) => ({
          ...f,
          guest_name: guest.guest_name || f.guest_name,
          guest_email: guest.guest_email || f.guest_email,
          guest_phone: guest.guest_phone || f.guest_phone,
          booking_id: guest.booking_id || null,
          booking_reference: guest.booking_reference || f.booking_reference,
          room_id: guest.room_id || null,
          room_name: guest.room_name || f.room_name,
          check_in_date: guest.check_in_date || f.check_in_date,
          check_out_date: guest.check_out_date || f.check_out_date,
          room_number: guest.room_number || f.room_number,
        }));
      }
    } catch {
      /* optional */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.item_name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let urls: string[] = [];
      if (photos.length) {
        urls = await uploadLostFoundPhotos({
          businessId,
          images: photos,
          tagNumber: 'pending',
        });
        if (!urls.length) throw new Error('Photo upload failed');
      }

      const item = await createLostFoundItem({
        businessId,
        item_name: form.item_name.trim(),
        description: form.description || undefined,
        category: form.category,
        found_date: form.found_date,
        time_found: form.time_found || undefined,
        room_number: form.room_number || null,
        room_id: form.room_id,
        room_name: form.room_name || null,
        booking_id: form.booking_id,
        booking_reference: form.booking_reference || null,
        guest_name: form.guest_name || null,
        guest_email: form.guest_email || null,
        guest_phone: form.guest_phone || null,
        check_in_date: form.check_in_date || null,
        check_out_date: form.check_out_date || null,
        found_by_staff_id: employeeId || null,
        found_by_staff_name: employeeName || null,
        storage_location: form.storage_location || null,
        storage_detail: form.storage_detail || null,
        condition: form.condition,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
        internal_notes: form.internal_notes || null,
        photo_urls: urls,
      });
      onCreated(item);
    } catch (err: any) {
      setError(err.message || 'Failed to create item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h3 className="font-bold text-stone-900">New Lost & Found Item</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <PhotoCapture photos={photos} onChange={setPhotos} maxPhotos={6} />
          <p className="text-[11px] text-stone-400 -mt-2">
            Photos are optional — you can add them later from the item details.
          </p>

          <div>
            <label className="text-xs font-semibold text-stone-500">Item name *</label>
            <input required value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm" placeholder="e.g. Black iPhone charger" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-500">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white">
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500">Condition</label>
              <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value as LostFoundCondition })} className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white">
                {CONDITION_OPTIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-500">Date found</label>
              <input type="date" value={form.found_date} onChange={(e) => setForm({ ...form, found_date: e.target.value })} className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500">Time found</label>
              <input type="time" value={form.time_found} onChange={(e) => setForm({ ...form, time_found: e.target.value })} className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500">Room number</label>
            <input value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} onBlur={onRoomBlur} className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm" placeholder="Room number — guest details will be auto-filled when available" />
          </div>

          {(form.guest_name || form.guest_email) && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs space-y-1">
              <div className="font-semibold text-amber-900">Guest linked</div>
              <div>{form.guest_name}</div>
              {form.guest_email && <div className="text-stone-600">{form.guest_email}</div>}
              {form.guest_phone && <div className="text-stone-600">{form.guest_phone}</div>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-500">Storage</label>
              <select value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white">
                {storages.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500">Storage detail</label>
              <input value={form.storage_detail} onChange={(e) => setForm({ ...form, storage_detail: e.target.value })} className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm" placeholder="e.g. Shelf 2" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500">Internal notes</label>
            <textarea value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} rows={2} className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm" />
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold border border-stone-200 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-xl disabled:opacity-50">{saving ? 'Saving…' : 'Save item'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
