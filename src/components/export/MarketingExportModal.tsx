// src/components/export/MarketingExportModal.tsx
// ✅ FIXED: Includes businessId in request

import { useState } from 'react';
import { X, Download, FileSpreadsheet } from 'lucide-react';

interface MarketingExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  defaultFilters?: {
    marketingConsent?: string;
    dateFrom?: string;
    dateTo?: string;
    country?: string;
  };
}

export default function MarketingExportModal({
  isOpen,
  onClose,
  businessId,
  defaultFilters = {}
}: MarketingExportModalProps) {
  const [filters, setFilters] = useState({
    marketingConsent: 'subscribed',
    ...defaultFilters
  });
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      // ✅ FIX: Include businessId in the request body
      const response = await fetch('/.netlify/functions/export-marketing-contacts-v2', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          businessId: businessId,  // ← CRITICAL: This was missing!
          filters: filters,
          format: format
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Export error:', errorText);
        throw new Error(`Export failed: ${response.status}`);
      }

      // Get the CSV blob
      const blob = await response.blob();
      const filename = `marketing-contacts-${new Date().toISOString().split('T')[0]}.csv`;
      
      // Download the file
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FileSpreadsheet size={20} className="text-orange-500" />
              Export Marketing Contacts
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Export guests who have consented to receive marketing communications.
            Only POPIA-compliant fields will be included.
          </p>

          {/* Filters */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marketing Consent Status
              </label>
              <select
                value={filters.marketingConsent}
                onChange={(e) => setFilters({ ...filters, marketingConsent: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">All Guests</option>
                <option value="subscribed">✅ Subscribed</option>
                <option value="consent_given">Consent Given (Email Not Confirmed)</option>
                <option value="unsubscribed">❌ Unsubscribed</option>
                <option value="no_consent">No Consent</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date To
                </label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Export Format
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setFormat('csv')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    format === 'csv'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  CSV
                </button>
                <button
                  onClick={() => setFormat('xlsx')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    format === 'xlsx'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Excel (XLSX)
                </button>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <p>📋 Fields included: First Name, Last Name, Email, Phone, Country</p>
            <p className="text-xs mt-1 text-blue-600">✓ POPIA compliant • Marketing consent required</p>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Download size={16} />
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
