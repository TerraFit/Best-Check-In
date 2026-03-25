// src/services/analyticsService.ts

export interface Booking {
  id: string;
  business_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  adults: number;
  children: number;
  total_amount: number;
  status: string;
  guest_country: string;
  guest_province: string;
  guest_city: string;
  marketing_consent: boolean;
  created_at: string;
  room_type?: string;
  room_number?: string;
}

export interface MonthlyData {
  month: string;
  year: number;
  monthIndex: number;
  bookings: number;
  revenue: number;
  nights: number;
  occupancyRate: number;
}

export interface GuestOriginData {
  countries: Record<string, number>;
  provinces: Record<string, number>;
  cities: Record<string, number>;
}

export interface AnalyticsSummary {
  totalBookings: number;
  totalRevenue: number;
  totalNights: number;
  averageStay: number;
  averageDailyRate: number; // ADR = Total Revenue / Total Nights
  revenuePerAvailableRoom: number; // RevPAR
  occupancyRate: number;
  bookingDensity: number;
  todayBookings: number;
  weeklyBookings: number;
  monthlyTrend: MonthlyData[];
  guestOrigins: GuestOriginData;
  recentCheckins: Booking[];
  topPerformingRoomTypes: Array<{ roomType: string; bookings: number; revenue: number }>;
}

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  country?: string;
  province?: string;
  city?: string;
  roomType?: string;
}

class AnalyticsService {
  private businessId: string | null = null;
  private bookings: Booking[] = [];
  private totalRooms: number = 1;

  setBusinessContext(businessId: string, totalRooms: number = 1) {
    this.businessId = businessId;
    this.totalRooms = totalRooms;
  }

  async fetchBookings(businessId?: string): Promise<Booking[]> {
    const id = businessId || this.businessId;
    if (!id) throw new Error('No business ID set');

    try {
      const response = await fetch(`/.netlify/functions/get-business-bookings?businessId=${id}&limit=1000`);
      const data = await response.json();
      
      if (!Array.isArray(data?.bookings)) {
        throw new Error('Invalid data from server');
      }
      
      this.bookings = data.bookings;
      return this.bookings;
    } catch (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
  }

  applyFilters(bookings: Booking[], filters: AnalyticsFilters): Booking[] {
    let filtered = [...bookings];

    if (filters.dateFrom) {
      filtered = filtered.filter(b => b.check_in_date >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(b => b.check_in_date <= filters.dateTo!);
    }
    if (filters.country) {
      filtered = filtered.filter(b => b.guest_country === filters.country);
    }
    if (filters.province) {
      filtered = filtered.filter(b => b.guest_province === filters.province);
    }
    if (filters.city) {
      filtered = filtered.filter(b => b.guest_city === filters.city);
    }
    if (filters.roomType) {
      filtered = filtered.filter(b => b.room_type === filters.roomType);
    }

    return filtered;
  }

  calculateSummary(bookings: Booking[], filters?: AnalyticsFilters): AnalyticsSummary {
    let data = bookings;
    if (filters) {
      data = this.applyFilters(bookings, filters);
    }

    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];

    // Basic totals
    const totalBookings = data.length;
    const totalRevenue = data.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const totalNights = data.reduce((sum, b) => sum + (b.nights || 1), 0);
    
    // Average Daily Rate (ADR) = Total Revenue / Total Nights
    const averageDailyRate = totalNights > 0 ? totalRevenue / totalNights : 0;
    
    // Average Stay
    const averageStay = totalBookings > 0 ? totalNights / totalBookings : 0;
    
    // Today's bookings
    const todayBookings = data.filter(b => b.check_in_date === today).length;
    
    // Weekly bookings
    const weeklyBookings = data.filter(b => b.check_in_date >= oneWeekAgoStr).length;
    
    // Occupancy Rate (simplified - based on nights vs max possible)
    const dates = data.map(b => new Date(b.check_in_date).getTime());
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    const days = dates.length ? (max - min) / (1000 * 60 * 60 * 24) + 1 : 1;
    const maxNights = this.totalRooms * days;
    const occupancyRate = maxNights > 0 ? Math.min(100, Math.round((totalNights / maxNights) * 100)) : 0;
    
    // Revenue Per Available Room (RevPAR) = ADR × Occupancy Rate
    const revenuePerAvailableRoom = (averageDailyRate * occupancyRate) / 100;
    
    // Booking Density (alternative metric)
    const bookingDensity = totalBookings > 0 
      ? Math.min(100, Math.round((totalBookings / (this.totalRooms * 30)) * 100)) 
      : 0;

    // Monthly trend
    const monthlyMap: Record<string, MonthlyData> = {};
    data.forEach(b => {
      if (b.check_in_date) {
        const date = new Date(b.check_in_date);
        const monthIndex = date.getMonth();
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        const key = `${year}-${monthIndex}`;
        
        if (!monthlyMap[key]) {
          monthlyMap[key] = {
            month,
            year,
            monthIndex,
            bookings: 0,
            revenue: 0,
            nights: 0,
            occupancyRate: 0
          };
        }
        monthlyMap[key].bookings++;
        monthlyMap[key].revenue += b.total_amount || 0;
        monthlyMap[key].nights += b.nights || 1;
      }
    });
    
    const monthlyTrend = Object.values(monthlyMap)
      .map(m => {
        const daysInMonth = new Date(m.year, m.monthIndex + 1, 0).getDate();
        const maxNightsMonth = this.totalRooms * daysInMonth;
        return {
          ...m,
          occupancyRate: maxNightsMonth > 0 
            ? Math.round((m.nights / maxNightsMonth) * 100) 
            : 0
        };
      })
      .sort((a, b) => a.year - b.year || a.monthIndex - b.monthIndex);

    // Guest origins
    const guestOrigins: GuestOriginData = {
      countries: {},
      provinces: {},
      cities: {}
    };
    
    data.forEach(b => {
      if (b.guest_country) guestOrigins.countries[b.guest_country] = (guestOrigins.countries[b.guest_country] || 0) + 1;
      if (b.guest_province) guestOrigins.provinces[b.guest_province] = (guestOrigins.provinces[b.guest_province] || 0) + 1;
      if (b.guest_city) guestOrigins.cities[b.guest_city] = (guestOrigins.cities[b.guest_city] || 0) + 1;
    });

    // Top performing room types
    const roomTypeMap: Record<string, { bookings: number; revenue: number }> = {};
    data.forEach(b => {
      if (b.room_type) {
        if (!roomTypeMap[b.room_type]) {
          roomTypeMap[b.room_type] = { bookings: 0, revenue: 0 };
        }
        roomTypeMap[b.room_type].bookings++;
        roomTypeMap[b.room_type].revenue += b.total_amount || 0;
      }
    });
    
    const topPerformingRoomTypes = Object.entries(roomTypeMap)
      .map(([roomType, stats]) => ({ roomType, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalBookings,
      totalRevenue,
      totalNights,
      averageStay,
      averageDailyRate,
      revenuePerAvailableRoom,
      occupancyRate,
      bookingDensity,
      todayBookings,
      weeklyBookings,
      monthlyTrend,
      guestOrigins,
      recentCheckins: data.slice(0, 10),
      topPerformingRoomTypes
    };
  }

  async getAnalytics(filters?: AnalyticsFilters): Promise<AnalyticsSummary> {
    await this.fetchBookings();
    return this.calculateSummary(this.bookings, filters);
  }
}

export const analyticsService = new AnalyticsService();
