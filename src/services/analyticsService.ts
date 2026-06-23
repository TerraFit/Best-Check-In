// src/services/analyticsService.ts
import { Booking } from '../types';
import { findClosestCity } from './cityAutocompleteService';

// ============================================================
// TYPES
// ============================================================

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  country?: string;
  province?: string;
  city?: string;
  roomType?: string;
  source?: string;
}

export interface OriginData {
  name: string;
  code: string;
  count: number;
  percentage: number;
  coordinates?: { lat: number; lng: number };
  children?: OriginData[];
  continent?: string;
}

export interface TravelPattern {
  location: string;
  country: string;
  count: number;
  percentage: number;
  isCorrection?: boolean;
  originalInput?: string;
}

export interface ReferralData {
  name: string;
  count: number;
  percentage: number;
}

export interface AnalyticsSummary {
  totalBookings: number;
  totalGuests: number;
  totalRevenue: number;
  totalNights: number;
  averageStay: number;
  averageDailyRate: number;
  revenuePerAvailableRoom: number;
  occupancyRate: number;
  bookingDensity: number;
  todayBookings: number;
  weeklyBookings: number;
  uniqueCountries: number;
  topDestination: string;
}

export interface FullAnalyticsData {
  summary: AnalyticsSummary;
  originData: OriginData[];
  referralData: ReferralData[];
  arrivingFrom: TravelPattern[];
  goingTo: TravelPattern[];
  monthlyTrend: MonthlyData[];
  recentCheckins: Booking[];
  topPerformingRoomTypes: Array<{ roomType: string; bookings: number; revenue: number }>;
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

export type DrillLevel = 'world' | 'continent' | 'country' | 'region' | 'city';

// ============================================================
// CONSTANTS
// ============================================================

export const COUNTRY_CONTINENT_MAP: Record<string, string> = {
  'South Africa': 'Africa',
  'Namibia': 'Africa',
  'Botswana': 'Africa',
  'Zimbabwe': 'Africa',
  'Mozambique': 'Africa',
  'Lesotho': 'Africa',
  'Eswatini': 'Africa',
  'Zambia': 'Africa',
  'Angola': 'Africa',
  'Malawi': 'Africa',
  'Tanzania': 'Africa',
  'Kenya': 'Africa',
  'Nigeria': 'Africa',
  'Ghana': 'Africa',
  'Egypt': 'Africa',
  'Morocco': 'Africa',
  'Tunisia': 'Africa',
  'Algeria': 'Africa',
  'Germany': 'Europe',
  'France': 'Europe',
  'United Kingdom': 'Europe',
  'Italy': 'Europe',
  'Spain': 'Europe',
  'Netherlands': 'Europe',
  'Switzerland': 'Europe',
  'Austria': 'Europe',
  'Belgium': 'Europe',
  'Portugal': 'Europe',
  'Sweden': 'Europe',
  'Norway': 'Europe',
  'Denmark': 'Europe',
  'Finland': 'Europe',
  'Greece': 'Europe',
  'Ireland': 'Europe',
  'Poland': 'Europe',
  'Czech Republic': 'Europe',
  'Czechia': 'Europe',
  'Hungary': 'Europe',
  'Romania': 'Europe',
  'Bulgaria': 'Europe',
  'Croatia': 'Europe',
  'Russia': 'Europe',
  'Ukraine': 'Europe',
  'United States': 'North America',
  'United States of America': 'North America',
  'Canada': 'North America',
  'Mexico': 'North America',
  'Brazil': 'South America',
  'Argentina': 'South America',
  'Chile': 'South America',
  'Colombia': 'South America',
  'Peru': 'South America',
  'Venezuela': 'South America',
  'China': 'Asia',
  'India': 'Asia',
  'Japan': 'Asia',
  'South Korea': 'Asia',
  'Singapore': 'Asia',
  'Malaysia': 'Asia',
  'Indonesia': 'Asia',
  'Thailand': 'Asia',
  'Vietnam': 'Asia',
  'Philippines': 'Asia',
  'Saudi Arabia': 'Asia',
  'United Arab Emirates': 'Asia',
  'Israel': 'Asia',
  'Turkey': 'Asia',
  'Australia': 'Oceania',
  'New Zealand': 'Oceania',
  'Fiji': 'Oceania'
};

export const COUNTRY_ISO_CODES: Record<string, string> = {
  'South Africa': 'ZA',
  'Namibia': 'NA',
  'Botswana': 'BW',
  'Zimbabwe': 'ZW',
  'Mozambique': 'MZ',
  'Lesotho': 'LS',
  'Eswatini': 'SZ',
  'Zambia': 'ZM',
  'Angola': 'AO',
  'Malawi': 'MW',
  'Tanzania': 'TZ',
  'Kenya': 'KE',
  'Nigeria': 'NG',
  'Ghana': 'GH',
  'Egypt': 'EG',
  'Morocco': 'MA',
  'Tunisia': 'TN',
  'Algeria': 'DZ',
  'Germany': 'DE',
  'France': 'FR',
  'United Kingdom': 'GB',
  'Italy': 'IT',
  'Spain': 'ES',
  'Netherlands': 'NL',
  'Switzerland': 'CH',
  'Austria': 'AT',
  'Belgium': 'BE',
  'Portugal': 'PT',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Finland': 'FI',
  'Greece': 'GR',
  'Ireland': 'IE',
  'Poland': 'PL',
  'Czech Republic': 'CZ',
  'Czechia': 'CZ',
  'Hungary': 'HU',
  'Romania': 'RO',
  'Bulgaria': 'BG',
  'Croatia': 'HR',
  'Russia': 'RU',
  'Ukraine': 'UA',
  'United States': 'US',
  'United States of America': 'US',
  'Canada': 'CA',
  'Mexico': 'MX',
  'Brazil': 'BR',
  'Argentina': 'AR',
  'Chile': 'CL',
  'Colombia': 'CO',
  'Peru': 'PE',
  'Venezuela': 'VE',
  'China': 'CN',
  'India': 'IN',
  'Japan': 'JP',
  'South Korea': 'KR',
  'Singapore': 'SG',
  'Malaysia': 'MY',
  'Indonesia': 'ID',
  'Thailand': 'TH',
  'Vietnam': 'VN',
  'Philippines': 'PH',
  'Saudi Arabia': 'SA',
  'United Arab Emirates': 'AE',
  'Israel': 'IL',
  'Turkey': 'TR',
  'Australia': 'AU',
  'New Zealand': 'NZ',
  'Fiji': 'FJ'
};

// ============================================================
// ANALYTICS SERVICE
// ============================================================

export class AnalyticsService {
  private bookings: Booking[] = [];
  private totalRooms: number = 1;
  private businessId: string | null = null;

  setBusinessContext(businessId: string, totalRooms: number = 1) {
    this.businessId = businessId;
    this.totalRooms = totalRooms || 1;
  }

  setBookings(bookings: Booking[]) {
    this.bookings = bookings;
  }

  getBookings(): Booking[] {
    return this.bookings;
  }

  // ============================================================
  // FILTERING
  // ============================================================

  filterBookings(bookings: Booking[], filters?: AnalyticsFilters): Booking[] {
    if (!filters) return bookings;
    
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
    if (filters.source) {
      filtered = filtered.filter(b => (b.booking_source || b.referral_source) === filters.source);
    }

    return filtered;
  }

  // ============================================================
  // SUMMARY STATISTICS
  // ============================================================

  calculateSummary(bookings?: Booking[]): AnalyticsSummary {
    const data = bookings || this.bookings;
    
    if (data.length === 0) {
      return {
        totalBookings: 0,
        totalGuests: 0,
        totalRevenue: 0,
        totalNights: 0,
        averageStay: 0,
        averageDailyRate: 0,
        revenuePerAvailableRoom: 0,
        occupancyRate: 0,
        bookingDensity: 0,
        todayBookings: 0,
        weeklyBookings: 0,
        uniqueCountries: 0,
        topDestination: 'N/A'
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];

    // Basic totals
    const totalBookings = data.length;
    const totalGuests = data.reduce((sum, b) => sum + (b.adults || 1) + (b.children || 0), 0);
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
    
    // Occupancy Rate
    const dates = data.map(b => new Date(b.check_in_date).getTime());
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    const days = dates.length ? (max - min) / (1000 * 60 * 60 * 24) + 1 : 1;
    const maxNights = this.totalRooms * days;
    const occupancyRate = maxNights > 0 ? Math.min(100, Math.round((totalNights / maxNights) * 100)) : 0;
    
    // Revenue Per Available Room (RevPAR) = ADR × Occupancy Rate
    const revenuePerAvailableRoom = (averageDailyRate * occupancyRate) / 100;
    
    // Booking Density
    const bookingDensity = totalBookings > 0 
      ? Math.min(100, Math.round((totalBookings / (this.totalRooms * 30)) * 100)) 
      : 0;

    // Unique countries
    const countries = new Set(data.map(b => b.guest_country).filter(Boolean));
    const uniqueCountries = countries.size;

    // Top destination
    const countryCount: Record<string, number> = {};
    data.forEach(b => {
      if (b.guest_country) {
        const country = b.guest_country.replace(/\.$/, '').trim();
        countryCount[country] = (countryCount[country] || 0) + 1;
      }
    });
    const topDestination = Object.entries(countryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      totalBookings,
      totalGuests,
      totalRevenue,
      totalNights,
      averageStay,
      averageDailyRate,
      revenuePerAvailableRoom,
      occupancyRate,
      bookingDensity,
      todayBookings,
      weeklyBookings,
      uniqueCountries,
      topDestination
    };
  }

  // ============================================================
  // ORIGIN DATA (World Map)
  // ============================================================

  getOriginData(drillLevel: DrillLevel = 'world', bookings?: Booking[]): OriginData[] {
    const data = bookings || this.bookings;
    
    if (data.length === 0) return [];

    const total = data.length;
    const countryMap: Record<string, { count: number; continent: string }> = {};
    
    data.forEach(b => {
      if (b.guest_country) {
        const country = b.guest_country.replace(/\.$/, '').trim();
        if (!countryMap[country]) {
          countryMap[country] = {
            count: 0,
            continent: COUNTRY_CONTINENT_MAP[country] || 'Other'
          };
        }
        countryMap[country].count++;
      }
    });

    // Build hierarchy based on drill level
    if (drillLevel === 'world') {
      // Group by continent
      const continentMap: Record<string, { count: number; countries: any[] }> = {};
      Object.entries(countryMap).forEach(([country, data]) => {
        if (!continentMap[data.continent]) {
          continentMap[data.continent] = { count: 0, countries: [] };
        }
        continentMap[data.continent].count += data.count;
        continentMap[data.continent].countries.push({
          name: country,
          code: COUNTRY_ISO_CODES[country] || country.substring(0, 2).toUpperCase(),
          count: data.count,
          percentage: (data.count / total) * 100,
          continent: data.continent
        });
      });

      return Object.entries(continentMap).map(([name, data]) => ({
        name,
        code: name.substring(0, 3).toUpperCase(),
        count: data.count,
        percentage: (data.count / total) * 100,
        children: data.countries.sort((a, b) => b.count - a.count)
      }));
    }

    if (drillLevel === 'continent') {
      // Return countries grouped by continent
      const result: OriginData[] = [];
      Object.entries(countryMap).forEach(([country, data]) => {
        result.push({
          name: country,
          code: COUNTRY_ISO_CODES[country] || country.substring(0, 2).toUpperCase(),
          count: data.count,
          percentage: (data.count / total) * 100,
          continent: data.continent
        });
      });
      return result.sort((a, b) => b.count - a.count);
    }

    // For country, region, city - return countries
    return Object.entries(countryMap).map(([country, data]) => ({
      name: country,
      code: COUNTRY_ISO_CODES[country] || country.substring(0, 2).toUpperCase(),
      count: data.count,
      percentage: (data.count / total) * 100
    })).sort((a, b) => b.count - a.count);
  }

  // ============================================================
  // REFERRAL DATA
  // ============================================================

  getReferralData(bookings?: Booking[]): ReferralData[] {
    const data = bookings || this.bookings;
    
    if (data.length === 0) return [];

    const referralMap: Record<string, number> = {};
    data.forEach(b => {
      const source = b.booking_source || b.referral_source;
      if (source && source !== 'NULL' && source !== 'null' && source.trim() !== '') {
        const cleanSource = source.replace(/\.$/, '').trim();
        referralMap[cleanSource] = (referralMap[cleanSource] || 0) + 1;
      }
    });

    const total = data.length || 1;
    return Object.entries(referralMap)
      .map(([name, count]) => ({
        name,
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // ============================================================
  // TRAVEL PATTERNS
  // ============================================================

  getTravelPatterns(bookings?: Booking[]): { arrivingFrom: TravelPattern[]; goingTo: TravelPattern[] } {
    const data = bookings || this.bookings;
    
    const arrivingMap: Record<string, { count: number; originalInputs: string[]; country: string }> = {};
    const goingMap: Record<string, { count: number; originalInputs: string[]; country: string }> = {};

    data.forEach(booking => {
      // Arriving From
      if ((booking as any).arriving_from) {
        const input = (booking as any).arriving_from.trim();
        if (input) {
          const suggestion = findClosestCity(input, booking.guest_country || 'South Africa');
          const cityName = suggestion?.name || input;
          const country = booking.guest_country || 'South Africa';
          const key = `${cityName}|${country}`;
          
          if (!arrivingMap[key]) {
            arrivingMap[key] = { count: 0, originalInputs: [], country };
          }
          arrivingMap[key].count++;
          if (suggestion?.isCorrection) {
            arrivingMap[key].originalInputs.push(input);
          }
        }
      }

      // Going To
      if ((booking as any).next_destination) {
        const input = (booking as any).next_destination.trim();
        if (input) {
          const suggestion = findClosestCity(input, booking.guest_country || 'South Africa');
          const cityName = suggestion?.name || input;
          const country = booking.guest_country || 'South Africa';
          const key = `${cityName}|${country}`;
          
          if (!goingMap[key]) {
            goingMap[key] = { count: 0, originalInputs: [], country };
          }
          goingMap[key].count++;
          if (suggestion?.isCorrection) {
            goingMap[key].originalInputs.push(input);
          }
        }
      }
    });

    const total = data.length || 1;

    const arrivingFrom = Object.entries(arrivingMap)
      .map(([key, data]) => {
        const [location, country] = key.split('|');
        return {
          location,
          country,
          count: data.count,
          percentage: (data.count / total) * 100,
          isCorrection: data.originalInputs.length > 0,
          originalInput: data.originalInputs[0]
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const goingTo = Object.entries(goingMap)
      .map(([key, data]) => {
        const [location, country] = key.split('|');
        return {
          location,
          country,
          count: data.count,
          percentage: (data.count / total) * 100,
          isCorrection: data.originalInputs.length > 0,
          originalInput: data.originalInputs[0]
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { arrivingFrom, goingTo };
  }

  // ============================================================
  // MONTHLY TREND
  // ============================================================

  getMonthlyTrend(bookings?: Booking[]): MonthlyData[] {
    const data = bookings || this.bookings;
    
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
    
    return Object.values(monthlyMap)
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
  }

  // ============================================================
  // TOP PERFORMING ROOM TYPES
  // ============================================================

  getTopPerformingRoomTypes(bookings?: Booking[]): Array<{ roomType: string; bookings: number; revenue: number }> {
    const data = bookings || this.bookings;
    
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
    
    return Object.entries(roomTypeMap)
      .map(([roomType, stats]) => ({ roomType, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  // ============================================================
  // RECENT CHECK-INS
  // ============================================================

  getRecentCheckins(limit: number = 10, bookings?: Booking[]): Booking[] {
    const data = bookings || this.bookings;
    return data.slice(0, limit);
  }

  // ============================================================
  // COMPLETE ANALYTICS
  // ============================================================

  getFullAnalytics(
    drillLevel: DrillLevel = 'world',
    filters?: AnalyticsFilters
  ): FullAnalyticsData {
    let data = this.bookings;
    
    // Apply filters
    if (filters) {
      data = this.filterBookings(data, filters);
    }
    
    // Set filtered data for subsequent calculations
    const filteredData = data;

    return {
      summary: this.calculateSummary(filteredData),
      originData: this.getOriginData(drillLevel, filteredData),
      referralData: this.getReferralData(filteredData),
      arrivingFrom: this.getTravelPatterns(filteredData).arrivingFrom,
      goingTo: this.getTravelPatterns(filteredData).goingTo,
      monthlyTrend: this.getMonthlyTrend(filteredData),
      recentCheckins: this.getRecentCheckins(10, filteredData),
      topPerformingRoomTypes: this.getTopPerformingRoomTypes(filteredData)
    };
  }

  // ============================================================
  // ASYNC DATA FETCHING
  // ============================================================

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

  async getAnalytics(filters?: AnalyticsFilters): Promise<FullAnalyticsData> {
    await this.fetchBookings();
    return this.getFullAnalytics('world', filters);
  }

  // ============================================================
  // CACHE INVALIDATION
  // ============================================================

  invalidateCache(): void {
    // Clear any cached data
    // This is useful when new bookings are added
    // The service will refetch on next request
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

export const analyticsService = new AnalyticsService();
