// src/pages/tabs/LostFoundTab.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Package,
  Printer,
  Mail,
  Phone,
  MessageCircle,
  X,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import {
  fetchLostFoundItems,
  fetchLostFoundItem,
  createLostFoundItem,
  updateLostFoundItem,
  contactLostFoundGuest,
  fetchLostFoundMeta,
  resolveGuestFromRoom,
} from '../../services/lostFoundApi';
import type {
  LostFoundItem,
  LostFoundActivity,
  LostFoundDashboardStats,
  LostFoundStatus,
  CommunicationMethod,
} from '../../types/lostFound';
import {
  LOST_FOUND_STATUS_LABELS,
  LOST_FOUND_STATUS_COLORS,
  CONDITION_OPTIONS,
  STATUS_WORKFLOW,
  BUILTIN_CATEGORIES,
  BUILTIN_STORAGE,
} from '../../types/lostFound';

interface Props {
  businessId: string;
  employeeId?: string | null;
  employeeName?: string | null;
  canCreate?: boolean;
  canEdit?: boolean;
  canDispose?: boolean;
}

const emptyStats: LostFoundDashboardStats = {
  total: 0,
  newly_found: 0,
  awaiting_contact: 0,
  awaiting_collection: 0,
  returned: 0,
  archived: 0,
  unclaimed: 0,
  recently_found: 0,
  recently_returned: 0,
};

export default function LostFoundTab({
  businessId,
  employeeId,
  employeeName,
  canCreate = true,
  canEdit = true,
  canDispose = true,
}: Props) {
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [stats, setStats] = useState<LostFoundDashboardStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([...BUILTIN_CATEGORIES]);
  const [storageOptions, setStorageOptions] = useState<string[]>([...BUILTIN_STORAGE]);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LostFoundItem | null>(null);
  const [activity, setActivity] = useState<LostFoundActivity[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [form, setForm] = useState({
    item_name: '',
    description: '',
    category: 'Miscellaneous',
    found_date: new Date().toISOString().slice(0, 10),
    time_found: '',
    room_number: '',
    storage_location: 'Shelf',
    storage_detail: '',
    condition: 'good' as const,
    estimated_value: '',
    internal_notes: '',
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    booking_id: '' as string | null,
    booking_reference: '',
    room_id: '' as string | null,
    room_name: '',
    check_in_date: '',
    check_out_date: '',
  });

  const [contactMethod, setContactMethod] = useState<CommunicationMethod>('email');
  const [contactNotes, setContactNotes] = useState('');
  const [contactOutcome, setContactOutcome] = useState('');

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      const [{ items: list, stats: s }, meta] = await Promise.all([
        fetchLostFoundItems({
          businessId,
          search: search || undefined,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
        }),
        fetchLostFoundMeta(businessId),
      ]);
      setItems(list);
      setStats(s);
      if (meta.categories.length) {
        setCategories(meta.categories.map((c) => c.name));
      }
      if (meta.storageLocations.length) {
        setStorageOptions(meta.storageLocations.map((s) => s.name));
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load Lost & Found');
    } finally {
      setLoading(false);
    }
  }, [businessId, search, statusFilter, categoryFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const { item, activity: act } = await fetchLostFoundItem(businessId, id);
      setDetail(item);
      setActivity(act);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setActivity([]);
  };

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.item_name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const item = await createLostFoundItem({
        businessId,
        item_name: form.item_name.trim(),
        description: form.description || undefined,
        category: form.category,
        found_date: form.found_date,
        time_found: form.time_found || undefined,
        room_number: form.room_number || null,
        room_id: form.room_id || null,
        room_name: form.room_name || null,
        booking_id: form.booking_id || null,
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
      });
      setShowCreate(false);
      setForm({
        item_name: '',
        description: '',
        category: 'Miscellaneous',
        found_date: new Date().toISOString().slice(0, 10),
        time_found: '',
        room_number: '',
        storage_location: 'Shelf',
        storage_detail: '',
        condition: 'good',
        estimated_value: '',
        internal_notes: '',
        guest_name: '',
        guest_email: '',
        guest_phone: '',
        booking_id: null,
        booking_reference: '',
        room_id: null,
        room_name: '',
        check_in_date: '',
        check_out_date: '',
      });
      await load();
      openDetail(item.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create item');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: LostFoundStatus) => {
    if (!detail || !canEdit) return;
    if ((status === 'unclaimed' || status === 'archived') && !canDispose) return;
    setSaving(true);
    try {
      const updated = await updateLostFoundItem({
        businessId,
        itemId: detail.id,
        status,
        employee_id: employeeId || null,
        employee_name: employeeName || null,
      });
      setDetail(updated);
      await load();
      const { activity: act } = await fetchLostFoundItem(businessId, detail.id);
      setActivity(act);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleContact = async () => {
    if (!detail || !canEdit) return;
    setSaving(true);
    try {
      const { item } = await contactLostFoundGuest({
        businessId,
        itemId: detail.id,
        method: contactMethod,
        notes: contactNotes || undefined,
        outcome: contactOutcome || undefined,
        employee_id: employeeId || null,
        employee_name: employeeName || null,
        new_status: 'guest_contacted',
      });
      setDetail(item);
      setContactNotes('');
      setContactOutcome('');
      await load();
      const { activity: act } = await fetchLostFoundItem(businessId, detail.id);
      setActivity(act);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const printTag = (item: LostFoundItem) => {
    const win = window.open('', '_blank', 'width=400,height=500');
    if (!win) return;
    const qrData = encodeURIComponent(
      JSON.stringify({
        tag: item.tag_number,
        id: item.id,
        business: businessId,
      })
    );
    win.document.write(`<!DOCTYPE html><html><head><title>${item.tag_number}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;text-align:center}
        .tag{border:2px solid #000;padding:16px;border-radius:8px;max-width:280px;margin:0 auto}
        h1{font-size:22px;margin:0 0 8px}
        .meta{font-size:13px;line-height:1.5;text-align:left;margin-top:12px}
        img{margin:12px auto;display:block}
        @media print{button{display:none}}
      </style></head><body>
      <div class="tag">
        <h1>${item.tag_number || '—'}</h1>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}" width="120" height="120" alt="QR"/>
        <div class="meta">
          <div><strong>Item:</strong> ${item.item_name || '—'}</div>
          <div><strong>Room:</strong> ${item.room_number || '—'}</div>
          <div><strong>Found:</strong> ${item.found_date || '—'}</div>
          <div><strong>Storage:</strong> ${[item.storage_location, item.storage_detail].filter(Boolean).join(' · ') || '—'}</div>
          <div><strong>Found by:</strong> ${item.found_by_staff_name || '—'}</div>
        </div>
      </div>
      <p style="margin-top:16px"><button onclick="window.print()">Print</button></p>
      <script>setTimeout(function(){window.print()},400)</script>
      </body></html>`);
    win.document.close();
  };

  const statCards = useMemo(
    () => [
      { label: 'Total', value: stats.total, color: 'bg-stone-100 text-stone-800' },
      { label: 'Awaiting Contact', value: stats.awaiting_contact + stats.newly_found, color: 'bg-amber-50 text-amber-800' },
      { label: 'Awaiting Collection', value: stats.awaiting_collection, color: 'bg-blue-50 text-blue-800' },
      { label: 'Returned', value: stats.returned, color: 'bg-green-50 text-green-800' },
      { label: 'Unclaimed', value: stats.unclaimed, color: 'bg-red-50 text-red-800' },
      { label: 'Archived', value: stats.archived, color: 'bg-stone-50 text-stone-600' },
      { label: 'Recently Found', value: stats.recently_found, color: 'bg-orange-50 text-orange-800' },
      { label: 'Recently Returned', value: stats.recently_returned, color: 'bg-emerald-50 text-emerald-800' },
    ],
    [stats]
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {statCards.map((c) => (
          <div
            key={c.label}
            className={`rounded-2xl border border-stone-200 px-3 py-3 ${c.color}`}
          >
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
              {c.label}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input
              type="text"
              placeholder="Search guest, tag, room, item…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-stone-200 rounded-xl px-3 py-2 bg-white"
          >
            <option value="">All statuses</option>
            {STATUS_WORKFLOW.map((s) => (
              <option key={s} value={s}>
                {LOST_FOUND_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-sm border border-stone-200 rounded-xl px-3 py-2 bg-white"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={load}
            className="p-2 border border-stone-200 rounded-xl hover:bg-stone-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm"
          >
            <Plus size={16} /> New Item
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400 text-sm">Loading Lost &amp; Found…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-sm">
            <Package className="mx-auto mb-3 opacity-40" size={36} />
            No items found. Record a newly found item to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-[11px] uppercase tracking-wide text-stone-400">
                  <th className="px-4 py-3 font-semibold">Tag</th>
                  <th className="px-4 py-3 font-semibold">Item</th>
                  <th className="px-4 py-3 font-semibold">Room</th>
                  <th className="px-4 py-3 font-semibold">Guest</th>
                  <th className="px-4 py-3 font-semibold">Found</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Storage</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-stone-50 hover:bg-stone-50/80 cursor-pointer"
                    onClick={() => openDetail(item.id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-bold text-amber-700">
                      {item.tag_number || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-stone-900">{item.item_name}</div>
                      <div className="text-[11px] text-stone-400">{item.category}</div>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {item.room_number || '—'}
                      {item.room_name ? (
                        <span className="text-stone-400 text-xs block">{item.room_name}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{item.guest_name || '—'}</td>
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap">
                      {item.found_date}
                      {item.time_found ? (
                        <span className="text-xs text-stone-400 block">{item.time_found}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          LOST_FOUND_STATUS_COLORS[item.status] || 'bg-stone-100'
                        }`}
                      >
                        {LOST_FOUND_STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {[item.storage_location, item.storage_detail].filter(Boolean).join(' · ') ||
                        '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight size={16} className="inline text-stone-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h3 className="font-bold text-stone-900">New Lost &amp; Found Item</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-stone-100">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-stone-500">Item name *</label>
                <input
                  required
                  value={form.item_name}
                  onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                  className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm"
                  placeholder="e.g. Black iPhone charger"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-500">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-500">Condition</label>
                  <select
                    value={form.condition}
                    onChange={(e) =>
                      setForm({ ...form, condition: e.target.value as typeof form.condition })
                    }
                    className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    {CONDITION_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-500">Date found</label>
                  <input
                    type="date"
                    value={form.found_date}
                    onChange={(e) => setForm({ ...form, found_date: e.target.value })}
                    className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-500">Time found</label>
                  <input
                    type="time"
                    value={form.time_found}
                    onChange={(e) => setForm({ ...form, time_found: e.target.value })}
                    className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500">Room number</label>
                <input
                  value={form.room_number}
                  onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                  onBlur={onRoomBlur}
                  className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm"
                  placeholder="Auto-fills guest if booking exists"
                />
              </div>
              {(form.guest_name || form.guest_email) && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs space-y-1">
                  <div className="font-semibold text-amber-900">Guest linked</div>
                  <div>{form.guest_name}</div>
                  {form.guest_email && <div className="text-stone-600">{form.guest_email}</div>}
                  {form.guest_phone && <div className="text-stone-600">{form.guest_phone}</div>}
                  {form.booking_reference && (
                    <div className="text-stone-500">Ref: {form.booking_reference}</div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-500">Storage</label>
                  <select
                    value={form.storage_location}
                    onChange={(e) => setForm({ ...form, storage_location: e.target.value })}
                    className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    {storageOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-500">Box / detail</label>
                  <input
                    value={form.storage_detail}
                    onChange={(e) => setForm({ ...form, storage_detail: e.target.value })}
                    className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="e.g. Box 3"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-500">Internal notes</label>
                <textarea
                  value={form.internal_notes}
                  onChange={(e) => setForm({ ...form, internal_notes: e.target.value })}
                  rows={2}
                  className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 text-sm font-semibold border border-stone-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-xl disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-stone-100 px-5 py-4 flex items-center justify-between z-10">
              <div>
                <div className="font-mono text-xs font-bold text-amber-700">
                  {detail?.tag_number || '…'}
                </div>
                <h3 className="font-bold text-stone-900">{detail?.item_name || 'Loading…'}</h3>
              </div>
              <button type="button" onClick={closeDetail} className="p-1.5 rounded-lg hover:bg-stone-100">
                <X size={18} />
              </button>
            </div>

            {detailLoading || !detail ? (
              <div className="p-8 text-center text-stone-400 text-sm">Loading…</div>
            ) : (
              <div className="p-5 space-y-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                      LOST_FOUND_STATUS_COLORS[detail.status]
                    }`}
                  >
                    {LOST_FOUND_STATUS_LABELS[detail.status]}
                  </span>
                  <button
                    type="button"
                    onClick={() => printTag(detail)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 border border-stone-200 rounded-lg px-2.5 py-1 hover:bg-stone-50"
                  >
                    <Printer size={12} /> Print tag
                  </button>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-[10px] uppercase text-stone-400 font-semibold">Category</dt>
                    <dd>{detail.category || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase text-stone-400 font-semibold">Condition</dt>
                    <dd className="capitalize">{detail.condition || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase text-stone-400 font-semibold">Room</dt>
                    <dd>
                      {detail.room_number || '—'}
                      {detail.room_name ? ` · ${detail.room_name}` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase text-stone-400 font-semibold">Found</dt>
                    <dd>
                      {detail.found_date}
                      {detail.time_found ? ` ${detail.time_found}` : ''}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] uppercase text-stone-400 font-semibold">Guest</dt>
                    <dd>
                      {detail.guest_name || '—'}
                      {detail.guest_email && (
                        <span className="block text-xs text-stone-500">{detail.guest_email}</span>
                      )}
                      {detail.guest_phone && (
                        <span className="block text-xs text-stone-500">{detail.guest_phone}</span>
                      )}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] uppercase text-stone-400 font-semibold">Storage</dt>
                    <dd>
                      {[detail.storage_location, detail.storage_detail].filter(Boolean).join(' · ') ||
                        '—'}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] uppercase text-stone-400 font-semibold">Found by</dt>
                    <dd>{detail.found_by_staff_name || '—'}</dd>
                  </div>
                  {detail.description && (
                    <div className="col-span-2">
                      <dt className="text-[10px] uppercase text-stone-400 font-semibold">
                        Description
                      </dt>
                      <dd className="text-stone-600">{detail.description}</dd>
                    </div>
                  )}
                </dl>

                {/* Status workflow */}
                {canEdit && (
                  <div>
                    <h4 className="text-xs font-bold uppercase text-stone-400 mb-2">Update status</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_WORKFLOW.map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={saving || detail.status === s}
                          onClick={() => handleStatusChange(s)}
                          className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border transition ${
                            detail.status === s
                              ? 'border-amber-400 bg-amber-50 text-amber-800'
                              : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                          } disabled:opacity-40`}
                        >
                          {LOST_FOUND_STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact guest */}
                {canEdit && (
                  <div className="border border-stone-100 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase text-stone-400">Contact guest</h4>
                    <div className="flex gap-2">
                      {(
                        [
                          { id: 'email', icon: Mail, label: 'Email' },
                          { id: 'sms', icon: MessageCircle, label: 'SMS' },
                          { id: 'whatsapp', icon: Phone, label: 'WhatsApp' },
                          { id: 'phone', icon: Phone, label: 'Phone' },
                        ] as const
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setContactMethod(m.id)}
                          className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-semibold border ${
                            contactMethod === m.id
                              ? 'border-amber-400 bg-amber-50 text-amber-800'
                              : 'border-stone-200 text-stone-500'
                          }`}
                        >
                          <m.icon size={14} />
                          {m.label}
                        </button>
                      ))}
                    </div>
                    {(contactMethod === 'sms' || contactMethod === 'whatsapp') && (
                      <p className="text-[11px] text-stone-400">
                        {contactMethod === 'sms' ? 'SMS' : 'WhatsApp'} integration is a placeholder —
                        contact will be logged for history.
                      </p>
                    )}
                    <input
                      value={contactOutcome}
                      onChange={(e) => setContactOutcome(e.target.value)}
                      placeholder="Outcome (optional)"
                      className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm"
                    />
                    <textarea
                      value={contactNotes}
                      onChange={(e) => setContactNotes(e.target.value)}
                      placeholder="Notes"
                      rows={2}
                      className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleContact}
                      className="w-full py-2.5 text-sm font-semibold bg-stone-900 text-white rounded-xl disabled:opacity-50"
                    >
                      Record contact
                    </button>
                  </div>
                )}

                {/* Activity timeline */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-stone-400 mb-3">History</h4>
                  {activity.length === 0 ? (
                    <p className="text-xs text-stone-400">No activity yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {activity.map((a) => (
                        <li key={a.id} className="flex gap-3 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                          <div>
                            <div className="font-semibold text-stone-800 capitalize">
                              {a.event_type.replace(/_/g, ' ')}
                              {a.communication_method && (
                                <span className="font-normal text-stone-500">
                                  {' '}
                                  via {a.communication_method}
                                </span>
                              )}
                            </div>
                            {a.notes && <div className="text-stone-500">{a.notes}</div>}
                            {a.from_status && a.to_status && (
                              <div className="text-stone-400">
                                {a.from_status} → {a.to_status}
                              </div>
                            )}
                            <div className="text-stone-400 mt-0.5">
                              {a.employee_name ? `${a.employee_name} · ` : ''}
                              {new Date(a.created_at).toLocaleString()}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
