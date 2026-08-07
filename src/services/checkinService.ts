// src/services/checkinService.ts
import { Booking } from '../types';
import { FoodRestrictions } from '../types/checkin';

export interface SaveBookingResult {
  success: boolean;
  bookingId?: string;
  isDuplicate?: boolean;
  error?: string;
}

export class CheckInService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/.netlify/functions';
  }

  async getBusinessBranding(businessId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/get-business-branding?id=${businessId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async getGuestProfile(email: string): Promise<any> {
    const normalizedEmail = email.toLowerCase().trim();
    const response = await fetch(
      `${this.baseUrl}/get-guest-profile?email=${encodeURIComponent(normalizedEmail)}`
    );
    if (!response.ok) return null;
    return response.json();
  }

  async saveGuestProfile(email: string, profileData: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/save-guest-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, profileData })
    });
    return response.json();
  }

  async saveBooking(bookingData: any): Promise<SaveBookingResult> {
    console.log('🔗 Saving booking to database...');
    const response = await fetch(`${this.baseUrl}/create-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    if (result.success) {
      return {
        success: true,
        bookingId: result.booking?.id,
        isDuplicate: result.duplicate === true
      };
    }
    
    return { success: false, error: result.error || 'Unknown error' };
  }

  async saveIndemnityRecord(
    bookingId: string,
    businessId: string,
    guestName: string,
    firstName: string,
    lastName: string,
    passportOrId: string,
    signature: string
  ): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/create-indemnity-record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          business_id: businessId,
          guest_name: guestName,
          guest_first_name: firstName,
          guest_last_name: lastName,
          passport_or_id: passportOrId,
          signature_data: signature,
          signed_at: new Date().toISOString()
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.access_token) {
        console.error('Error saving indemnity record:', result);
        return null;
      }
      return result.access_token as string;
    } catch (error) {
      console.error('Error saving indemnity record:', error);
      return null;
    }
  }

  async sendConfirmationEmail(booking: any, indemnityToken?: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/send-confirmation-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...booking,
          business_name: booking.business_name || 'our establishment',
          indemnity_token: indemnityToken
        })
      });
      if (!response.ok) {
        console.warn('⚠️ Email sending failed with status:', response.status);
      }
    } catch (error) {
      console.warn('⚠️ Email error (non-critical):', error);
    }
  }

  async calculateTotalAmount(businessId: string | null, nights: number): Promise<number> {
    try {
      if (businessId) {
        const data = await this.getBusinessBranding(businessId);
        const roomPrice = data.avg_price || 1500;
        return nights * roomPrice;
      }
      return nights * 1500;
    } catch (error) {
      console.error('Error getting room price:', error);
      return nights * 1500;
    }
  }
}

export const checkinService = new CheckInService();
