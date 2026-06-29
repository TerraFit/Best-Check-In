// src/types/export.ts

export interface MarketingExportFilters {
  marketingConsent: 'all' | 'subscribed' | 'consent_given' | 'unsubscribed' | 'no_consent';
  dateFrom?: string;
  dateTo?: string;
  country?: string;
}

export interface OfficialExportRequest {
  reason: 'police' | 'immigration' | 'court_order' | 'insurance' | 'internal_audit' | 'other';
  authorityName?: string;
  officerName?: string;
  caseNumber?: string;
  referenceNumber?: string;
  notes?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface OfficialExportAuthorization {
  password: string;
  acceptTerms: boolean;
}

export interface SensitiveExportAudit {
  id: string;
  businessId: string;
  businessName: string;
  exportedByUserId: string;
  exportedByName: string;
  exportedByRole: 'owner' | 'superadmin';
  exportedAt: Date;
  reason: string;
  authorityName?: string;
  officerName?: string;
  caseNumber?: string;
  referenceNumber?: string;
  rowCount: number;
  ipAddress: string;
  userAgent: string;
  fileHash: string;
  emergencyAccess: boolean;
  previousHash?: string;
  currentHash: string;
}

export interface MarketingContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
}

export interface OfficialGuestRecord {
  fullName: string;
  nationality: string;
  idNumber: string;
  passportNumber: string;
  dateOfBirth?: string;
  address: string;
  email: string;
  phone: string;
  checkInDate: string;
  checkOutDate: string;
  arrivingFrom: string;
  goingTo: string;
  vehicleRegistration?: string;
  signature?: string;
}
