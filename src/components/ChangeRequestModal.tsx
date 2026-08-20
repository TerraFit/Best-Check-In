import { useState } from 'react';
import { getAuthToken } from '../utils/auth';

interface ChangeRequestModalProps {
  fieldName: string;
  currentValue: string;
  label: string;
  businessId: string;
  businessName: string;
  onClose: () => void;
  onSubmit: () => void;
}

export default function ChangeRequestModal({ fieldName, currentValue, label, businessId, businessName, onClose, onSubmit }: ChangeRequestModalProps) {
  const [requestedValue, setRequestedValue] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!requestedValue.trim()) { setError('Please enter the new value.'); return; }
    if (!reason.trim()) { setError('Please provide a reason for this change.'); return; }
    if (!businessId) { setError('Business session is missing. Please sign in again.'); return; }

    setIsSubmitting(true);
    setError(null);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/.netlify/functions/submit-change-request', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          businessId,
          businessName,
          fieldName,
          currentValue,
          requestedValue: requestedValue.trim(),
          reason: reason.trim(),
          attachments: [],
          status: 'pending',
        }),
      });

      const raw = await response.text();
      let result: any = {};
      try { result = raw ? JSON.parse(raw) : {}; } catch { result = { error: raw || `HTTP ${response.status}` }; }
      if (!response.ok || !result.success) throw new Error(result.error || `Request failed (HTTP ${response.status})`);

      onSubmit();
      onClose();
      window.alert('✅ Change request submitted successfully. The admin will review it.');
    } catch (e) {
      console.error('Change request submission failed:', e);
      setError(e instanceof Error ? e.message : 'Unable to submit the change request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="change-request-title">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 id="change-request-title" className="text-xl font-semibold text-gray-900">Request Change: {label}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl" aria-label="Close">×</button>
        </div>
        <div className="p-6 space-y-5">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Value</label><div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-700 break-words">{currentValue || '(empty)'}</div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">New Value <span className="text-red-500">*</span></label>{fieldName === 'directors' ? <textarea rows={4} value={requestedValue} onChange={e => setRequestedValue(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" /> : <input type="text" value={requestedValue} onChange={e => setRequestedValue(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" />}</div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Reason for Change <span className="text-red-500">*</span></label><textarea rows={4} value={reason} onChange={e => setReason(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" /></div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">{isSubmitting ? 'Submitting…' : 'Submit Request'}</button>
        </div>
      </div>
    </div>
  );
}
