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
  CheckCircle2,
  Circle,
} from 'lucide-react';
import {
  fetchLostFoundItems,
  fetchLostFoundItem,
  updateLostFoundItem,
  contactLostFoundGuest,
  fetchLostFoundMeta,
} from '../../services/lostFoundApi';
import type {
  LostFoundItem,
  LostFoundActivity,
  LostFoundDashboardStats,
  LostFoundStatus,
  CommunicationMethod,
  LostFoundViewMode,
} from '../../types/lostFound';
import {
  LOST_FOUND_STATUS_LABELS,
  LOST_FOUND_STATUS_COLORS,
  STATUS_WORKFLOW,
  GUEST_TIMELINE,
  BUILTIN_CATEGORIES,
  BUILTIN_STORAGE,
} from '../../types/lostFound';
import LostFoundCreateForm from '../../components/lostFound/LostFoundCreateForm';
import CollectionConfirmModal from '../../components/lostFound/CollectionConfirmModal';
import DetailPhotosEditor from '../../components/lostFound/DetailPhotosEditor';
import { printLostFoundTag } from '../../utils/printLostFoundTag';

type QuickFilter =
  | ''
  | 'missing_photos'
  | 'awaiting_contact'
  | 'ready_for_collection'
  | 'overdue'
  | 'archived';

interface Props {
  businessId: string;
  businessName?: string | null;
  employeeId?: string | null;
  employeeName?: string | null;
  canCreate?: boolean;
  canEdit?: boolean;
  canDispose?: boolean;
  /** employee = operational portal; business = full management console */
  mode?: LostFoundViewMode;
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
  missing_photos: 0,
  ready_for_collection: 0,
  overdue: 0,
};

function hasPhotos(item: { photo_urls?: string[] | null }) {
  return Array.isArray(item.photo_urls) && item.photo_urls.some(Boolean);
}

function isOpenStatus(status: LostFoundStatus) {
  return [
    'newly_found',
    'awaiting_contact',
    'guest_contacted',
    'guest_replied',
    'collection_arranged',
    'courier_booked',
  ].includes(status);
}

function timelineIndex(status: LostFoundStatus): number {
  const order: LostFoundStatus[] = [
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
  const i = order.indexOf(status);
  if (i <= 0) return 0;
  if (i <= 2) return 1;
  if (i === 3) return 2;
  if (i <= 5) return 3;
  if (i <= 7) return 4;
  return 5;
}

export default function LostFoundTab({
  businessId,
  businessName,
  employeeId,
  employeeName,
  canCreate = true,
  canEdit = true,
  canDispose = true,
  mode = 'business',
}: Props) {
  const isBusiness = mode === 'business';

  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [stats, setStats] = useState<LostFoundDashboardStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('');
  const [categories, setCategories] = useState<string[]>([...BUILTIN_CATEGORIES]);
  const [storageOptions, setStorageOptions] = useState<string[]>([...BUILTIN_STORAGE]);

  const [showCreate, setShowCreate] = useState(false);
  const [showCollect, setShowCollect] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LostFoundItem | null>(null);
  const [activity, setActivity] = useState<LostFoundActivity[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setStorageOptions(meta.storageLocations.map((loc) => loc.name));
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

  const displayedItems = useMemo(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    if (!quickFilter) return items;
    if (quickFilter === 'missing_photos') {
      return items.filter((i) => isOpenStatus(i.status) && !hasPhotos(i));
    }
    if (quickFilter === 'awaiting_contact') {
      return items.filter((i) => ['newly_found', 'awaiting_contact'].includes(i.status));
    }
    if (quickFilter === 'ready_for_collection') {
      return items.filter((i) => ['collection_arranged', 'courier_booked'].includes(i.status));
    }
    if (quickFilter === 'overdue') {
      return items.filter(
        (i) => isOpenStatus(i.status) && i.found_date && i.found_date < thirtyDaysAgo
      );
    }
    if (quickFilter === 'archived') {
      return items.filter((i) => i.status === 'archived');
    }
    return items;
  }, [items, quickFilter]);

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
    setShowCollect(false);
  };

  const handleStatusChange = async (status: LostFoundStatus) => {
    if (!detail || !canEdit) return;
    if ((status === 'unclaimed' || status === 'archived') && !canDispose) return;
    if (status === 'collected') {
      setShowCollect(true);
      return;
    }
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

  const handlePrint = async (item: LostFoundItem) => {
    try {
      await printLostFoundTag(item, businessName || undefined);
    } catch (e: any) {
      setError(e.message || 'Failed to print tag');
    }
  };

  const onPhotosUpdated = async (item: LostFoundItem) => {
    setDetail(item);
    await load();
    const { activity: act } = await fetchLostFoundItem(businessId, item.id);
    setActivity(act);
  };

  const toggleQuick = (key: QuickFilter) => {
    setQuickFilter((prev) => (prev === key ? '' : key));
  };

  /** Operational task cards (both portals) + management extras (business only) */
  const statCards = useMemo(() => {
    const operational = [
      {
        id: 'awaiting_contact' as QuickFilter,
        label: 'Awaiting Guest Contact',
        value: stats.awaiting_contact ?? 0,
        color: 'bg-amber-50 text-amber-800',
      },
      {
        id: 'missing_photos' as QuickFilter,
        label: 'Missing Photos',
        value: stats.missing_photos ?? 0,
        color: 'bg-rose-50 text-rose-800',
      },
      {
        id: 'ready_for_collection' as QuickFilter,
        label: 'Ready for Collection',
        value: stats.ready_for_collection ?? 0,
        color: 'bg-indigo-50 text-indigo-800',
      },
      {
        id: 'overdue' as QuickFilter,
        label: 'Overdue',
        value: stats.overdue ?? 0,
        color: 'bg-orange-50 text-orange-800',
      },
    ];

    if (!isBusiness) return operational;

    return [
      ...operational,
      {
        id: 'archived' as QuickFilter,
        label: 'Archived',
        value: stats.archived,
        color: 'bg-stone-50 text-stone-600',
      },
      {
        id: '' as QuickFilter,
        label: 'Returned',
        value: stats.returned,
        color: 'bg-green-50 text-green-800',
        clickable: false,
      },
      {
        id: '' as QuickFilter,
        label: 'Outstanding',
        value: stats.outstanding ?? 0,
        color: 'bg-blue-50 text-blue-800',
        clickable: false,
      },
      {
        id: '' as QuickFilter,
        label: 'This Month',
        value: stats.found_this_month ?? stats.recently_found,
        color: 'bg-stone-100 text-stone-800',
        clickable: false,
      },
    ];
  }, [stats, isBusiness]);

  const tIdx = detail ? timelineIndex(detail.status) : 0;

  return (
    <div className="space-y-6">
      <div
        className={`grid grid-cols-2 sm:grid-cols-4 ${isBusiness ? 'lg:grid-cols-8' : 'lg:grid-cols-4'} gap-3`}
      >
        {statCards.map((c) => {
          const clickable = c.id !== '';
          const active = clickable && quickFilter === c.id;
          return (
            <button
              key={c.label}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && toggleQuick(c.id)}
              className={`rounded-2xl border px-3 py-3 text-left transition ${
                c.color
              } ${
                active
                  ? 'border-amber-400 ring-2 ring-amber-300'
                  : 'border-stone-200'
              } ${clickable ? 'hover:shadow-sm cursor-pointer' : 'cursor-default'}`}
              title={clickable ? (active ? 'Clear filter' : `Filter: ${c.label}`) : undefined}
            >
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                {c.label}
              </div>
            </button>
          );
        })}
      </div>

      {quickFilter && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-stone-500">Filtered:</span>
          <span className="font-semibold text-stone-800">
            {statCards.find((c) => c.id === quickFilter)?.label || quickFilter}
          </span>
          <button
            type="button"
            onClick={() => setQuickFilter('')}
            className="text-xs font-semibold text-amber-700 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input
              type="text"
              placeholder="Search tag, guest, phone, email, room, category…"
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
          {isBusiness && (
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
          )}
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

      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400 text-sm">Loading Lost & Found…</div>
        ) : displayedItems.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-sm">
            <Package className="mx-auto mb-3 opacity-40" size={36} />
            {quickFilter
              ? 'No items match this filter.'
              : 'No items found. Record a newly found item to get started.'}
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
                  <th className="px-4 py-3 font-semibold text-right">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.map((item) => (
                  <tr
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${item.tag_number || 'item'} ${item.item_name || ''}`}
                    className="border-b border-stone-50 cursor-pointer transition-colors hover:bg-amber-50/70 focus-visible:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400 group"
                    onClick={() => openDetail(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openDetail(item.id);
                      }
                    }}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-bold text-amber-700">
                      {item.tag_number || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {item.photo_urls?.[0] ? (
                          <img
                            src={item.photo_urls[0]}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover border border-stone-100"
                          />
                        ) : (
                          <span className="shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                            No photo
                          </span>
                        )}
                        <div>
                          <div className="font-semibold text-stone-900">{item.item_name}</div>
                          <div className="text-[11px] text-stone-400 flex items-center gap-1.5 flex-wrap">
                            <span>{item.category}</span>
                            {!hasPhotos(item) && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                                Photo Missing
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
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
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-700 opacity-70 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                        View Details →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <LostFoundCreateForm
          businessId={businessId}
          categories={categories}
          storageOptions={storageOptions}
          employeeId={employeeId}
          employeeName={employeeName}
          onClose={() => setShowCreate(false)}
          onCreated={async (item) => {
            setShowCreate(false);
            await load();
            openDetail(item.id);
          }}
        />
      )}

      {selectedId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-stone-100 px-5 py-4 flex items-start justify-between z-10 gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                  Lost & Found Item
                </div>
                <div className="font-mono text-sm font-bold text-amber-700 mt-0.5">
                  {detail?.tag_number || (detailLoading ? '…' : '—')}
                </div>
                <h3 className="font-bold text-stone-900 text-base leading-snug mt-0.5 truncate">
                  {detail?.item_name || (detailLoading ? 'Loading…' : '—')}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="p-1.5 rounded-lg hover:bg-stone-100 shrink-0"
                aria-label="Close details"
              >
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
                  {!hasPhotos(detail) && (
                    <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                      Photo Missing
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handlePrint(detail)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 border border-stone-200 rounded-lg px-2.5 py-1 hover:bg-stone-50"
                  >
                    <Printer size={12} /> Print tag
                  </button>
                  {canEdit && detail.status !== 'collected' && detail.status !== 'archived' && (
                    <button
                      type="button"
                      onClick={() => setShowCollect(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-lg px-2.5 py-1 hover:bg-emerald-100"
                    >
                      Record collection
                    </button>
                  )}
                </div>

                {isBusiness && (
                  <div className="bg-stone-50 rounded-2xl border border-stone-100 p-3">
                    <h4 className="text-[10px] font-bold uppercase text-stone-400 mb-2">
                      Guest timeline
                    </h4>
                    <div className="flex items-start justify-between gap-1">
                      {GUEST_TIMELINE.map((step, i) => {
                        const done = i <= tIdx;
                        const current = i === tIdx;
                        return (
                          <div
                            key={step}
                            className="flex-1 flex flex-col items-center text-center min-w-0"
                          >
                            <div
                              className={`mb-1 ${
                                done ? 'text-emerald-600' : 'text-stone-300'
                              } ${current ? 'scale-110' : ''}`}
                            >
                              {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                            </div>
                            <span
                              className={`text-[9px] leading-tight font-semibold ${
                                current
                                  ? 'text-amber-800'
                                  : done
                                    ? 'text-stone-700'
                                    : 'text-stone-400'
                              }`}
                            >
                              {LOST_FOUND_STATUS_LABELS[step]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <DetailPhotosEditor
                  key={detail.id + String((detail.photo_urls || []).length)}
                  businessId={businessId}
                  item={detail}
                  canEdit={canEdit}
                  employeeId={employeeId}
                  employeeName={employeeName}
                  onUpdated={onPhotosUpdated}
                />

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
                  {detail.collected_by_name && (
                    <div className="col-span-2 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                      <dt className="text-[10px] uppercase text-emerald-700 font-semibold">
                        Collection
                      </dt>
                      <dd className="text-sm text-emerald-900 whitespace-pre-line">
                        {`Collected by: ${detail.collected_by_name}`}
                        {detail.collected_by_id_number
                          ? `\nID: ${detail.collected_by_id_number}`
                          : ''}
                        {detail.released_by_staff_name
                          ? `\nReleased by: ${detail.released_by_staff_name}`
                          : ''}
                        {detail.returned_at
                          ? `\n${new Date(detail.returned_at).toLocaleString()}`
                          : ''}
                      </dd>
                      {detail.collection_signature_url && (
                        <img
                          src={detail.collection_signature_url}
                          alt="Signature"
                          className="mt-2 max-h-16 border border-emerald-100 rounded bg-white"
                        />
                      )}
                    </div>
                  )}
                  {detail.description && (
                    <div className="col-span-2">
                      <dt className="text-[10px] uppercase text-stone-400 font-semibold">
                        Description
                      </dt>
                      <dd className="text-stone-600">{detail.description}</dd>
                    </div>
                  )}
                </dl>

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

                {canEdit && (
                  <div className="border border-stone-100 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase text-stone-400">Contact guest</h4>
                    <div className="flex gap-2">
                      {(
                        [
                          { id: 'email' as const, icon: Mail, label: 'Email' },
                          { id: 'sms' as const, icon: MessageCircle, label: 'SMS' },
                          { id: 'whatsapp' as const, icon: Phone, label: 'WhatsApp' },
                          { id: 'phone' as const, icon: Phone, label: 'Phone' },
                        ]
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
                                  {' '}via {a.communication_method}
                                </span>
                              )}
                            </div>
                            {a.notes && (
                              <div className="text-stone-500 whitespace-pre-line">{a.notes}</div>
                            )}
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

      {showCollect && detail && (
        <CollectionConfirmModal
          businessId={businessId}
          item={detail}
          employeeId={employeeId}
          employeeName={employeeName}
          onClose={() => setShowCollect(false)}
          onCollected={async (item) => {
            setShowCollect(false);
            setDetail(item);
            await load();
            const { activity: act } = await fetchLostFoundItem(businessId, item.id);
            setActivity(act);
          }}
        />
      )}
    </div>
  );
}
