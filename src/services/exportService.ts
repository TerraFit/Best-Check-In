// src/services/exportService.ts
// ✅ COMPLETE REWRITE - Uses marketing-export.v2 with Realtime disabled
// ✅ Handles both CSV and XLSX exports
// ✅ Includes proper error handling and types

import { MarketingExportFilters, OfficialExportRequest, SensitiveExportAudit } from '../types/export';

const API_BASE = '/.netlify/functions';

/**
 * Export Service - Handles all data exports from FastCheckin
 * 
 * Features:
 * - Marketing contacts export (POPIA compliant)
 * - Official guest register export (Sensitive - requires authorization)
 * - Export audit logs (SuperAdmin only)
 * - File download utilities
 */
export class ExportService {
  
  // ============================================================
  // MARKETING CONTACTS EXPORT
  // ============================================================

  /**
   * Export marketing contacts (POPIA compliant)
   * ✅ Uses marketing-export.v2 with Realtime disabled
   * ✅ No WebSocket issues on Node.js 20
   * 
   * @param businessId - The business ID to export contacts for
   * @param filters - Marketing consent filters (subscribed, no_consent, all, etc.)
   * @param format - Export format: 'csv' or 'xlsx'
   * @returns Promise<Blob> - The exported file as a blob
   * 
   * @example
   * const blob = await ExportService.exportMarketingContacts(
   *   'business-123',
   *   { marketingConsent: 'subscribed', dateFrom: '2026-06-01' },
   *   'csv'
   * );
   * ExportService.downloadBlob(blob, 'marketing-contacts.csv');
   */
  static async exportMarketingContacts(
    businessId: string,
    filters: MarketingExportFilters,
    format: 'csv' | 'xlsx'
  ): Promise<Blob> {
    // ✅ UPDATED: Using marketing-export.v2 (no WebSocket dependency)
    const response = await fetch(`${API_BASE}/export-marketing-contacts-v2`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ businessId, filters, format })
    });

    if (!response.ok) {
      let errorMessage = 'Export failed';
      try {
        const error = await response.json();
        errorMessage = error.message || error.error || 'Export failed';
      } catch {
        // If response is not JSON, use status text
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return await response.blob();
  }

  // ============================================================
  // OFFICIAL GUEST REGISTER EXPORT (Sensitive)
  // ============================================================

  /**
   * Export official guest register (Sensitive - requires authorization)
   * 
   * @param businessId - The business ID to export register for
   * @param request - Export request details (reason, authority, dates, etc.)
   * @param authorization - Password and terms acceptance for authorization
   * @param format - Export format: 'csv' | 'xlsx' | 'pdf'
   * @returns Promise<Blob> - The exported file as a blob
   * 
   * @example
   * const blob = await ExportService.exportOfficialRegister(
   *   'business-123',
   *   { reason: 'police', caseNumber: 'EC-2026-1127' },
   *   { password: '****', acceptTerms: true },
   *   'pdf'
   * );
   * ExportService.downloadBlob(blob, 'official-register.pdf');
   */
  static async exportOfficialRegister(
    businessId: string,
    request: OfficialExportRequest,
    authorization: { password: string; acceptTerms: boolean },
    format: 'csv' | 'xlsx' | 'pdf'
  ): Promise<Blob> {
    const response = await fetch(`${API_BASE}/export-official-register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ businessId, request, authorization, format })
    });

    if (!response.ok) {
      let errorMessage = 'Export failed';
      try {
        const error = await response.json();
        errorMessage = error.message || error.error || 'Export failed';
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return await response.blob();
  }

  // ============================================================
  // EXPORT AUDIT LOGS (SuperAdmin only)
  // ============================================================

  /**
   * Get export audit logs (SuperAdmin only)
   * Tracks all sensitive data exports for compliance
   * 
   * @param filters - Optional filters (businessId, userId, date range, pagination)
   * @returns Promise<{ data: SensitiveExportAudit[]; total: number }>
   * 
   * @example
   * const { data, total } = await ExportService.getExportAuditLogs({
   *   businessId: 'business-123',
   *   limit: 20,
   *   offset: 0
   * });
   */
  static async getExportAuditLogs(
    filters?: { 
      businessId?: string; 
      userId?: string; 
      dateFrom?: string; 
      dateTo?: string; 
      limit?: number; 
      offset?: number 
    }
  ): Promise<{ data: SensitiveExportAudit[]; total: number }> {
    const params = new URLSearchParams();
    
    if (filters?.businessId) params.append('businessId', filters.businessId);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await fetch(`${API_BASE}/get-export-audit-logs?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to fetch audit logs';
      try {
        const error = await response.json();
        errorMessage = error.message || error.error || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  }

  // ============================================================
  // FILE DOWNLOAD UTILITIES
  // ============================================================

  /**
   * Download a blob as a file
   * Creates a download link and triggers the download
   * 
   * @param blob - The blob data to download
   * @param filename - The filename for the downloaded file
   * 
   * @example
   * ExportService.downloadBlob(blob, 'my-export.csv');
   */
  static downloadBlob(blob: Blob, filename: string): void {
    // Create URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create hidden anchor element
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // ============================================================
  // FILENAME GENERATORS
  // ============================================================

  /**
   * Generate a filename for marketing contact exports
   * 
   * @param format - 'csv' or 'xlsx'
   * @returns Filename with date stamp
   * 
   * @example
   * ExportService.getMarketingFilename('csv') 
   * // Returns: 'marketing-contacts-2026-07-01.csv'
   */
  static getMarketingFilename(format: 'csv' | 'xlsx'): string {
    const date = new Date().toISOString().split('T')[0];
    const extension = format === 'csv' ? 'csv' : 'xlsx';
    return `marketing-contacts-${date}.${extension}`;
  }

  /**
   * Generate a filename for official register exports
   * 
   * @param businessName - The business name (will be slugified)
   * @param format - 'csv', 'xlsx', or 'pdf'
   * @returns Filename with business name and date stamp
   * 
   * @example
   * ExportService.getOfficialFilename('J-Bay Zebra Lodge', 'pdf')
   * // Returns: 'official-register-j-bay-zebra-lodge-2026-07-01.pdf'
   */
  static getOfficialFilename(businessName: string, format: 'csv' | 'xlsx' | 'pdf'): string {
    const date = new Date().toISOString().split('T')[0];
    const slug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const extension = format === 'csv' ? 'csv' : format === 'xlsx' ? 'xlsx' : 'pdf';
    return `official-register-${slug}-${date}.${extension}`;
  }

  // ============================================================
  // HELPER: Get Auth Token (Internal)
  // ============================================================

  /**
   * Get the authentication token from storage
   * Tries multiple storage locations for compatibility
   * 
   * @returns The auth token or null if not found
   */
  private static getAuthToken(): string | null {
    // Try primary auth
    try {
      const authStr = localStorage.getItem('fastcheckin_auth');
      if (authStr) {
        const auth = JSON.parse(authStr);
        if (auth.token) return auth.token;
      }
    } catch {
      // Ignore parse errors
    }

    // Try business auth
    try {
      const authStr = localStorage.getItem('fastcheckin_business_auth');
      if (authStr) {
        const auth = JSON.parse(authStr);
        if (auth.token) return auth.token;
      }
    } catch {
      // Ignore parse errors
    }

    // Try legacy storage
    try {
      const legacy = localStorage.getItem('business');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed.token) return parsed.token;
      }
    } catch {
      // Ignore parse errors
    }

    return null;
  }
}

// ============================================================
// DEFAULT EXPORT (for convenience)
// ============================================================

export default ExportService;
