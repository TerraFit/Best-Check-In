// Manage photos on an existing Lost & Found item (add / remove)
import { useState } from 'react';
import PhotoCapture from './PhotoCapture';
import {
  uploadLostFoundPhotos,
  updateLostFoundItem,
} from '../../services/lostFoundApi';
import type { LostFoundItem } from '../../types/lostFound';

interface Props {
  businessId: string;
  item: LostFoundItem;
  canEdit: boolean;
  employeeId?: string | null;
  employeeName?: string | null;
  onUpdated: (item: LostFoundItem) => void;
}

export default function DetailPhotosEditor({
  businessId,
  item,
  canEdit,
  employeeId,
  employeeName,
  onUpdated,
}: Props) {
  const existing = (item.photo_urls || []).filter(Boolean);
  const [localUrls, setLocalUrls] = useState<string[]>(existing);
  // Pending new captures (base64) not yet uploaded
  const [pending, setPending] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const displayPhotos = [...localUrls, ...pending];
  const hasPhotos = localUrls.length > 0;

  const onChange = (all: string[]) => {
    // Split: existing http(s) URLs vs new data URLs
    const kept: string[] = [];
    const neu: string[] = [];
    for (const p of all) {
      if (p.startsWith('data:')) neu.push(p);
      else kept.push(p);
    }
    setLocalUrls(kept);
    setPending(neu);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      let finalUrls = [...localUrls];
      if (pending.length) {
        const uploaded = await uploadLostFoundPhotos({
          businessId,
          images: pending,
          tagNumber: item.tag_number || item.id,
        });
        if (!uploaded.length && pending.length) {
          throw new Error('Photo upload failed');
        }
        finalUrls = [...finalUrls, ...uploaded];
      }

      const updated = await updateLostFoundItem({
        businessId,
        itemId: item.id,
        photo_urls: finalUrls,
        employee_id: employeeId || null,
        employee_name: employeeName || null,
      });
      setLocalUrls(finalUrls);
      setPending([]);
      setEditing(false);
      onUpdated(updated);
    } catch (e: any) {
      setError(e.message || 'Failed to save photos');
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    pending.length > 0 ||
    JSON.stringify(localUrls) !== JSON.stringify(existing);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-bold uppercase text-stone-400">Photos</h4>
        {!hasPhotos && (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
            Photo Missing
          </span>
        )}
      </div>

      {!editing && hasPhotos && (
        <div className="flex flex-wrap gap-2">
          {localUrls.map((src, i) => (
            <div
              key={i}
              className="w-20 h-20 rounded-xl overflow-hidden border border-stone-200"
            >
              <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {!editing && !hasPhotos && (
        <p className="text-xs text-stone-400">No photos yet.</p>
      )}

      {canEdit && !editing && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-semibold text-amber-700 hover:text-amber-800"
        >
          {hasPhotos ? 'Edit photos' : 'Add photo'}
        </button>
      )}

      {editing && canEdit && (
        <div className="space-y-3 border border-stone-100 rounded-2xl p-3">
          <PhotoCapture
            photos={displayPhotos}
            onChange={onChange}
            maxPhotos={6}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setLocalUrls(existing);
                setPending([]);
                setEditing(false);
                setError(null);
              }}
              className="flex-1 py-2 text-xs font-semibold border border-stone-200 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || !dirty}
              onClick={save}
              className="flex-1 py-2 text-xs font-semibold bg-amber-500 text-white rounded-xl disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save photos'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
