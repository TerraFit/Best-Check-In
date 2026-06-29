// src/components/export/OfficialRegisterExportModal.tsx
// ✅ FULL VERSION WITH CANCEL BUTTON AT EVERY STEP

import { useState } from 'react';
import { ExportService } from '../../services/exportService';
import { OfficialExportRequest } from '../../types/export';
import { X, Download, Shield, AlertTriangle, Lock, ArrowLeft } from 'lucide-react';

interface OfficialRegisterExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  onExportComplete?: () => void;
}

export default function OfficialRegisterExportModal({
  isOpen,
  onClose,
  businessId,
  businessName,
  onExportComplete
}: OfficialRegisterExportModalProps) {
  const [step, setStep] = useState<'warning' | 'details' | 'authorize'>('warning');
  const [request, setRequest] = useState<OfficialExportRequest>({
    reason: 'police',
    authorityName: '',
    officerName: '',
    caseNumber: '',
    referenceNumber: '',
    notes: '',
    dateFrom: '',
    dateTo: ''
  });
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const reasons = [
    { value: 'police', label: '🚔 Police Request' },
    { value: 'immigration', label: '🛂 Immigration Request' },
    { value: 'court_order', label: '⚖️ Court Order' },
    { value: 'insurance', label: '📋 Insurance' },
    { value: 'internal_audit', label: '📊 Internal Audit' },
    { value: 'other', label: '📝 Other' }
  ];

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const blob = await ExportService.exportOfficialRegister(
        businessId,
        request,
        { password, acceptTerms },
        'pdf' // Always PDF
      );
      const filename = ExportService.getOfficialFilename(businessName, 'pdf');
      ExportService.downloadBlob(blob, filename);
      onExportComplete?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const renderWarning = () => (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-red-100 rounded-full">
          <Shield size={24} className="text-red-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Official Guest Register Export</h3>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-red-800 font-semibold mb-2">
          ⚠️ This export contains protected personal information.
        </p>
        <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
          <li>You are authorised to access this information</li>
          <li>The request is lawful</li>
          <li>The information will be used only for legitimate purposes</li>
        </ul>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-amber-800">
          <strong>Business:</strong> {businessName}<br />
          <strong>Date:</strong> {new Date().toLocaleString()}
        </p>
      </div>

      {/* ✅ Cancel and Continue buttons */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => setStep('details')}
          className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderDetails = () => (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Shield size={20} className="text-red-600" />
          Export Details
        </h3>
        <button onClick={() => setStep('warning')} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Back
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Export <span className="text-red-500">*</span>
          </label>
          <select
            value={request.reason}
            onChange={(e) => setRequest({ ...request, reason: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
          >
            {reasons.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Authority Name
            </label>
            <input
              type="text"
              value={request.authorityName || ''}
              onChange={(e) => setRequest({ ...request, authorityName: e.target.value })}
              placeholder="e.g., SAPS, Home Affairs"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Officer Name
            </label>
            <input
              type="text"
              value={request.officerName || ''}
              onChange={(e) => setRequest({ ...request, officerName: e.target.value })}
              placeholder="Officer's full name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Case Number
            </label>
            <input
              type="text"
              value={request.caseNumber || ''}
              onChange={(e) => setRequest({ ...request, caseNumber: e.target.value })}
              placeholder="e.g., EC-2026-1127"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number
            </label>
            <input
              type="text"
              value={request.referenceNumber || ''}
              onChange={(e) => setRequest({ ...request, referenceNumber: e.target.value })}
              placeholder="Reference number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={request.notes || ''}
            onChange={(e) => setRequest({ ...request, notes: e.target.value })}
            rows={2}
            placeholder="Additional information about this request"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={request.dateFrom || ''}
              onChange={(e) => setRequest({ ...request, dateFrom: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={request.dateTo || ''}
              onChange={(e) => setRequest({ ...request, dateTo: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700 flex items-center gap-2">
            <span className="text-lg">📄</span>
            Export format: <strong>PDF</strong> (with professional watermark)
          </p>
        </div>
      </div>

      {/* ✅ Cancel and Continue buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => setStep('authorize')}
          className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Continue to Authorization →
        </button>
      </div>
    </div>
  );

  const renderAuthorize = () => (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Lock size={20} className="text-red-600" />
          Authorize Export
        </h3>
        <button onClick={() => setStep('details')} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Back
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-amber-800">
          <strong>This export will be permanently audited.</strong><br />
          All details will be recorded in the export audit log.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Your Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password to authorize"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="acceptTerms"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
          />
          <label htmlFor="acceptTerms" className="text-sm text-gray-700">
            <strong>I AUTHORISE THIS EXPORT</strong><br />
            <span className="text-xs text-gray-500">
              I confirm that I am authorised to access this information and that this export is for legitimate purposes.
            </span>
          </label>
        </div>

        {/* Export Summary */}
        <div className="bg-stone-50 rounded-lg p-3 text-sm">
          <p className="font-medium text-stone-700 mb-1">Export Summary:</p>
          <div className="grid grid-cols-2 gap-1 text-stone-600">
            <span>Business:</span>
            <span className="font-medium">{businessName}</span>
            <span>Reason:</span>
            <span className="font-medium capitalize">{request.reason.replace('_', ' ')}</span>
            {request.caseNumber && (
              <>
                <span>Case Number:</span>
                <span className="font-medium">{request.caseNumber}</span>
              </>
            )}
            <span>Format:</span>
            <span className="font-medium uppercase">PDF (Watermarked)</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ✅ Cancel and Export buttons */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleExport}
          disabled={loading || !password || !acceptTerms}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Download size={16} />
              Export Sensitive Data (PDF)
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {step === 'warning' && renderWarning()}
        {step === 'details' && renderDetails()}
        {step === 'authorize' && renderAuthorize()}
      </div>
    </div>
  );
}
