// src/services/exportService.ts
import { MarketingExportFilters, OfficialExportRequest, SensitiveExportAudit } from '../types/export';

const API_BASE = '/.netlify/functions';

export class ExportService {
  /**
   * Export marketing contacts (POPIA compliant)
   */
  static async exportMarketingContacts(
    businessId: string,
    filters: MarketingExportFilters,
    format: 'csv' | 'xlsx'
  ): Promise<Blob> {
    const response = await fetch(`${API_BASE}/export-marketing-contacts`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('fastcheckin_token')}`
      },
      body: JSON.stringify({ businessId, filters, format })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Export failed');
    }

    return await response.blob();
  }

  /**
   * Export official guest register (Sensitive - requires authorization)
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
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('fastcheckin_token')}`
      },
      body: JSON.stringify({ businessId, request, authorization, format })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Export failed');
    }

    return await response.blob();
  }

  /**
   * Get export audit logs (SuperAdmin only)
   */
  static async getExportAuditLogs(
    filters?: { businessId?: string; userId?: string; dateFrom?: string; dateTo?: string; limit?: number; offset?: number }
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
        'Authorization': `Bearer ${localStorage.getItem('fastcheckin_token')}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch audit logs');
    }

    return await response.json();
  }

  /**
   * Download blob as file
   */
  static downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate filename for marketing export
   */
  static getMarketingFilename(format: 'csv' | 'xlsx'): string {
    const date = new Date().toISOString().split('T')[0];
    return `marketing-contacts-${date}.${format === 'csv' ? 'csv' : 'xlsx'}`;
  }

  /**
   * Generate filename for official register export
   */
  static getOfficialFilename(businessName: string, format: 'csv' | 'xlsx' | 'pdf'): string {
    const date = new Date().toISOString().split('T')[0];
    const slug = businessName.toLowerCase().replace(/\s+/g, '-');
    const ext = format === 'csv' ? 'csv' : format === 'xlsx' ? 'xlsx' : 'pdf';
    return `official-register-${slug}-${date}.${ext}`;
  }
}
