// Collection / handover confirmation with optional signature
import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { collectLostFoundItem, uploadLostFoundPhotos } from '../../services/lostFoundApi';
import type { LostFoundItem } from '../../types/lostFound';
import { t } from '../../i18n';

interface Props {
  businessId: string;
  item: LostFoundItem;
  employeeId?: string | null;
  employeeName?: string | null;
  onClose: () => void;
  onCollected: (item: LostFoundItem) => void;
}

export default function CollectionConfirmModal({ businessId, item, employeeId, employeeName, onClose, onCollected }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [name, setName] = useState(item.guest_name || '');
  const [idNumber, setIdNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    if ('touches' in e) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    return { x: (e as React.MouseEvent).clientX - r.left, y: (e as React.MouseEvent).clientY - r.top };
  };
  const start = (e: React.MouseEvent | React.TouchEvent) => { drawing.current = true; const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = (e: React.MouseEvent | React.TouchEvent) => { if (!drawing.current) return; const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return; const p = getPos(e); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#111'; ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const end = () => { drawing.current = false; };
  const clearSig = () => { const c = canvasRef.current; if (!c) return; c.getContext('2d')?.clearRect(0, 0, c.width, c.height); };

  const submit = async () => {
    if (!name.trim()) { setError('Collector name is required'); return; }
    setSaving(true); setError(null);
    try {
      let signatureUrl: string | undefined;
      const canvas = canvasRef.current;
      if (canvas) {
        const blank = document.createElement('canvas'); blank.width = canvas.width; blank.height = canvas.height;
        if (canvas.toDataURL() !== blank.toDataURL()) {
          const dataUrl = canvas.toDataURL('image/png');
          const urls = await uploadLostFoundPhotos({ businessId, images: [dataUrl], itemId: item.id, tagNumber: `${item.tag_number || item.id}-sig` });
          signatureUrl = urls[0];
        }
      }
      const updated = await collectLostFoundItem({ businessId, itemId: item.id, collected_by_name: name.trim(), collected_by_id_number: idNumber.trim() || undefined, collection_signature_url: signatureUrl, employee_id: employeeId || null, employee_name: employeeName || null });
      onCollected(updated);
    } catch (e: any) { setError(e.message || 'Failed to record collection'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between"><h3 className="font-bold text-stone-900">{t('lost_found_collection_confirm')}</h3><button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100"><X size={18} /></button></div>
        <p className="text-xs text-stone-500">Tag <span className="font-mono font-bold text-amber-700">{item.tag_number}</span> — {item.item_name}</p>
        <div><label className="text-xs font-semibold text-stone-500">{t('lost_found_collected_by')} *</label><input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm" /></div>
        <div><label className="text-xs font-semibold text-stone-500">{t('lost_found_id_optional')}</label><input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className="mt-1 w-full border border-stone-200 rounded-xl px-3 py-2 text-sm" /></div>
        <div><div className="flex justify-between items-center mb-1"><label className="text-xs font-semibold text-stone-500">{t('lost_found_signature')}</label><button type="button" onClick={clearSig} className="text-[10px] text-stone-400">Clear</button></div><canvas ref={canvasRef} width={360} height={120} className="w-full border border-stone-200 rounded-xl touch-none bg-stone-50" onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end} onTouchStart={start} onTouchMove={move} onTouchEnd={end} /></div>
        <p className="text-[11px] text-stone-400">Released by: {employeeName || 'Staff'}</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="button" disabled={saving} onClick={submit} className="w-full py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50">{saving ? 'Saving…' : 'Confirm collected'}</button>
      </div>
    </div>
  );
}
