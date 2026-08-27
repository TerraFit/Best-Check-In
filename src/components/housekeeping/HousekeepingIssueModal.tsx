import { useMemo, useState } from 'react';
import { createHousekeepingIssue, uploadHousekeepingIssuePhoto } from '../../services/housekeepingApi';
import { getIssueOption } from '../../types/housekeepingIssues';
import type { HousekeepingIssue, HousekeepingIssuePriority } from '../../types/housekeepingIssues';

interface Props { businessId: string; taskId: string; roomId: string; roomNumber?: string | null; sessionId: string; itemId: string; itemLabel: string; onClose: () => void; onCreated: (issue: HousekeepingIssue) => void; }
function readFileAsDataUrl(file: File): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = () => reject(reader.error || new Error('Unable to read photo')); reader.readAsDataURL(file); }); }

export default function HousekeepingIssueModal({ businessId, taskId, roomId, roomNumber, sessionId, itemId, itemLabel, onClose, onCreated }: Props) {
  const option = useMemo(() => getIssueOption(itemId, itemLabel), [itemId, itemLabel]);
  const [issueType, setIssueType] = useState(option.types[0] || 'Other');
  const [otherDescription, setOtherDescription] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<HousekeepingIssuePriority>('medium');
  const [maintenanceRequested, setMaintenanceRequested] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choosePhoto = async (file?: File) => { if (!file) return; setError(null); setUploadingPhoto(true); try { if (!file.type.startsWith('image/')) throw new Error('Please select an image.'); if (file.size > 6 * 1024 * 1024) throw new Error('Photo must be under 6MB before upload.'); const dataUrl = await readFileAsDataUrl(file); const url = await uploadHousekeepingIssuePhoto(businessId, dataUrl); setPhotoUrl(url); setPhotoName(file.name); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to upload photo.'); } finally { setUploadingPhoto(false); } };
  const submit = async () => { if (issueType === 'Other' && !otherDescription.trim()) { setError('Please describe the issue when selecting Other.'); return; } setSaving(true); setError(null); try { const issue = await createHousekeepingIssue({ businessId, taskId, roomId, roomNumber: roomNumber || undefined, sessionId, checklistItemId: itemId, checklistItemLabel: itemLabel, category: option.category, issueType, otherDescription: issueType === 'Other' ? otherDescription.trim() : undefined, description: description.trim() || undefined, priority, maintenanceRequested, photoUrl: photoUrl || undefined }); onCreated(issue); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save the issue.'); } finally { setSaving(false); } };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
    <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-orange-600">Report Issue</p><h2 className="text-lg font-bold text-gray-900">{itemLabel}</h2><p className="text-xs text-gray-500 mt-1">{option.category}</p></div><button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 text-xl" aria-label="Close">×</button></div>
    <div className="p-5 space-y-4">{error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <label className="block"><span className="block text-sm font-semibold text-gray-800 mb-1">Issue type</span><select value={issueType} onChange={(e) => setIssueType(e.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-3 bg-white text-sm">{option.types.map((type) => <option key={type}>{type}</option>)}</select></label>
      {issueType === 'Other' && <label className="block"><span className="block text-sm font-semibold text-gray-800 mb-1">Describe the issue</span><textarea value={otherDescription} onChange={(e) => setOtherDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" placeholder="Describe what you found…" /></label>}
      <label className="block"><span className="block text-sm font-semibold text-gray-800 mb-1">Additional details <span className="font-normal text-gray-400">(optional)</span></span><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm" placeholder="Add useful details for management or Maintenance…" /></label>
      <div><span className="block text-sm font-semibold text-gray-800 mb-2">Priority</span><div className="grid grid-cols-4 gap-2">{(['low','medium','high','urgent'] as const).map((value) => <button type="button" key={value} aria-pressed={priority === value} onClick={() => setPriority(value)} className={`rounded-xl border-2 py-2.5 text-xs font-bold capitalize ${priority === value ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-200 text-gray-600 bg-white'}`}>{value}</button>)}</div></div>
      <label className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 cursor-pointer"><input type="checkbox" checked={maintenanceRequested} onChange={(e) => setMaintenanceRequested(e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600" /><span><span className="block text-sm font-semibold text-blue-900">Send to Maintenance</span><span className="block text-xs text-blue-700 mt-0.5">Route this issue to the Maintenance follow-up queue.</span></span></label>
      <div><span className="block text-sm font-semibold text-gray-800 mb-1">Photo <span className="font-normal text-gray-400">(optional)</span></span><label className="flex items-center justify-center min-h-[76px] rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:bg-gray-100"><input type="file" accept="image/*" capture="environment" className="sr-only" disabled={uploadingPhoto || saving} onChange={(e) => { void choosePhoto(e.target.files?.[0]); e.currentTarget.value = ''; }} />{uploadingPhoto ? <span className="text-sm text-gray-500">Uploading photo…</span> : photoName ? <span className="text-sm font-semibold text-green-700">✓ {photoName}</span> : <span className="text-sm font-semibold text-gray-600">Take or select a photo</span>}</label></div>
    </div>
    <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={saving || uploadingPhoto} className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700">Cancel</button><button type="button" onClick={() => void submit()} disabled={saving || uploadingPhoto} className="px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold disabled:opacity-50">{saving ? 'Saving…' : 'Save Issue'}</button></div>
  </div></div>;
}
