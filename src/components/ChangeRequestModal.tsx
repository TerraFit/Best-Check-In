// src/components/ChangeRequestModal.tsx

import { useState, useRef } from 'react';

interface ChangeRequestModalProps {
  fieldName: string;
  currentValue: string;
  label: string;
  businessId: string;
  businessName: string;
  onClose: () => void;
  onSubmit: () => void;
}

export default function ChangeRequestModal({
  fieldName,
  currentValue,
  label,
  businessId,
  businessName,
  onClose,
  onSubmit,
}: ChangeRequestModalProps) {
  const [requestedValue, setRequestedValue] = useState('');
  const [reason, setReason] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      return validTypes.includes(file.type);
    });
    
    if (validFiles.length !== newFiles.length) {
      alert('Only PDF, JPG, and PNG files are allowed');
    }
    
    setAttachments([...attachments, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (saveAsDraft: boolean = false) => {
    if (!requestedValue.trim()) {
      alert('Please enter the new value');
      return;
    }
    
    if (!reason.trim()) {
      alert('Please provide a reason for this change');
      return;
    }
    
    setIsSubmitting(true);
    setIsDraft(saveAsDraft);

    try {
      // Upload attachments to storage first (if any)
      const attachmentUrls: string[] = [];
      
      for (const file of attachments) {
        // Convert to base64 for preview/upload
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        attachmentUrls.push(base64);
      }

      const response = await fetch('/.netlify/functions/submit-change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          businessName,
          fieldName,
          currentValue,
          requestedValue,
          reason,
          attachments: attachmentUrls.map((url, idx) => ({
            name: attachments[idx].name,
            type: attachments[idx].type,
            size: attachments[idx].size,
            data: url,
          })),
          status: saveAsDraft ? 'draft' : 'pending',
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(saveAsDraft ? '✅ Change request saved as draft' : '✅ Change request submitted successfully! The admin will review it.');
        onSubmit();
        onClose();
      } else {
        alert(result.error || 'Failed to submit change request');
      }
    } catch (error) {
      console.error('Error submitting change request:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">
            Request Change: {label}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Value
            </label>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-700">
              {currentValue || '(empty)'}
            </div>
          </div>

          {/* Requested Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Value <span className="text-red-500">*</span>
            </label>
            {fieldName === 'directors' ? (
              <textarea
                rows={4}
                value={requestedValue}
                onChange={(e) => setRequestedValue(e.target.value)}
                placeholder="Enter director names and details (one per line)&#10;e.g.,&#10;John Doe - ID: 9001015001081&#10;Jane Smith - ID: 9002025002082"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
                required
              />
            ) : (
              <input
                type="text"
                value={requestedValue}
                onChange={(e) => setRequestedValue(e.target.value)}
                placeholder="Enter the new value"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                required
              />
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Change <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why this change is needed..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supporting Documents (optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-500 transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-orange-500 hover:text-orange-600"
              >
                <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm">Click to upload or drag and drop</span>
              </button>
              <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</p>
            </div>
            
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="h-10 w-10 object-cover rounded"
                        />
                      ) : (
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeAttachment(idx)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
