// src/components/AppealModal.tsx

import { useState, useRef } from 'react';

interface AppealModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    id: string;
    field_name: string;
    current_value: string;
    requested_value: string;
    reason: string;
    rejection_reason?: string;
  };
  business: {
    id: string;
    trading_name: string;
    email: string;
  };
  onSubmit: () => void;
}

export default function AppealModal({ isOpen, onClose, request, business, onSubmit }: AppealModalProps) {
  const [appealMessage, setAppealMessage] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; url: string; file: File }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments = Array.from(files).map(file => ({
      name: file.name,
      url: URL.createObjectURL(file),
      file: file
    }));

    setAttachments([...attachments, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    const newAttachments = [...attachments];
    URL.revokeObjectURL(newAttachments[index].url);
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
  };

  const handleSubmitAppeal = async () => {
    if (!appealMessage.trim()) {
      alert('Please provide an appeal message');
      return;
    }

    setSubmitting(true);

    // Upload attachments to a storage bucket (simplified - you'll need to implement actual upload)
    const attachmentData = attachments.map(att => ({
      name: att.name,
      url: att.url,
      type: att.file.type
    }));

    try {
      const response = await fetch('/.netlify/functions/submit-appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalRequestId: request.id,
          businessId: business.id,
          businessName: business.trading_name,
          businessEmail: business.email,
          businessIdDisplay: business.id,
          fieldName: request.field_name,
          currentValue: request.current_value,
          requestedValue: request.requested_value,
          originalReason: request.reason,
          rejectionReason: request.rejection_reason,
          appealMessage: appealMessage,
          attachments: attachmentData
        })
      });

      if (response.ok) {
        alert('✅ Appeal submitted successfully. The admin will review your appeal.');
        onSubmit();
        onClose();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit appeal');
      }
    } catch (error) {
      console.error('Error submitting appeal:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">Appeal Change Request</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Email-style header */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
            <div className="flex">
              <span className="w-24 font-medium text-gray-600">To:</span>
              <span className="text-gray-900">inquiry@fastcheckin.co.za</span>
            </div>
            <div className="flex">
              <span className="w-24 font-medium text-gray-600">CC:</span>
              <span className="text-gray-900">{business.email}</span>
            </div>
            <div className="flex">
              <span className="w-24 font-medium text-gray-600">Subject:</span>
              <span className="text-gray-900">Appeal – Change Request – {business.trading_name}</span>
            </div>
          </div>

          {/* Pre-filled request details (read-only) */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Original Request Details</h4>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium text-gray-600">Business Name:</span> {business.trading_name}</div>
              <div><span className="font-medium text-gray-600">Business ID:</span> {business.id}</div>
              <div><span className="font-medium text-gray-600">Field:</span> {request.field_name}</div>
              <div><span className="font-medium text-gray-600">Current Value:</span> {request.current_value || '(empty)'}</div>
              <div><span className="font-medium text-gray-600">Requested Value:</span> {request.requested_value}</div>
              <div><span className="font-medium text-gray-600">Original Reason:</span> {request.reason}</div>
              {request.rejection_reason && (
                <div><span className="font-medium text-red-600">Rejection Reason:</span> {request.rejection_reason}</div>
              )}
            </div>
          </div>

          {/* Appeal Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Appeal Message <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={6}
              value={appealMessage}
              onChange={(e) => setAppealMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              placeholder="Please explain why you believe this change should be approved, providing any additional context or supporting information..."
              required
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Supporting Documents (optional but recommended)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-500 transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-orange-500 hover:text-orange-600"
              >
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm">Click to upload or drag and drop</span>
              </button>
              <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, DOC up to 10MB</p>
            </div>
            
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((att, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span className="text-sm text-gray-600">{att.name}</span>
                    </div>
                    <button onClick={() => removeAttachment(idx)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitAppeal}
            disabled={submitting || !appealMessage.trim()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Appeal'}
          </button>
        </div>
      </div>
    </div>
  );
}
