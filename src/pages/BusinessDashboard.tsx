import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, getBusinessId, clearAuth } from '../utils/auth';

interface BusinessProfile {
  id: string;
  trading_name: string;
  registered_name: string;
  email: string;
  phone: string;
  total_rooms?: number;
  avg_price?: number;
  status?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  welcome_message?: string;
  setup_complete: boolean;
  created_at?: string;
  subscription_tier?: string;
  physical_address?: {
    city: string;
    province: string;
    country: string;
  };
}

interface AnalyticsData {
  total_bookings: number;
  total_revenue: number;
  booking_density: number;
  occupancy_rate: number;  // ← ADD THIS
  today_bookings: number;
  monthly_data: {
    month: string;
    year: number;
    bookings: number;
    revenue: number;
    density: number;
    monthIndex: number;
  }[];
  guest_origins: {
    provinces: Record<string, number>;
    cities: Record<string, number>;
    countries: Record<string, number>;
  };
  recent_checkins: any[];
}

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'setup' | 'analytics'>('dashboard');
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [filterCity, setFilterCity] = useState('');
  
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [checkInUrl, setCheckInUrl] = useState('');
  const [qrRefreshKey, setQrRefreshKey] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    total_rooms: '',
    avg_price: '',
    logo_url: '',
    primary_color: '#f59e0b',
    secondary_color: '#1e1e1e',
    welcome_message: ''
  });

  const getAuthToken = (): string | null => {
    const auth = getAuth();
    return (auth as any)?.token || getBusinessId();
  };

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken();

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      clearAuth();
      navigate('/business/login');
      throw new Error('Unauthorized');
    }

    return response;
  };
const loadBookings = async () => {
  const businessId = getBusinessId();

  console.log('================ DEBUG START ================');
  console.log('Business ID:', businessId);

  setAnalyticsLoading(true);
  setAnalyticsError(null);

  try {
    const res = await authenticatedFetch(
      `/.netlify/functions/get-business-bookings?businessId=${businessId}&limit=500`
    );

    const data = await res.json();

    console.log('RAW API RESPONSE:', data);
    console.log('RAW BOOKINGS ARRAY:', data?.bookings);
    console.log('BOOKINGS COUNT (before filter):', data?.bookings?.length);

    if (!Array.isArray(data?.bookings)) {
      console.error('❌ bookings is not an array');
      throw new Error('Invalid data from server');
    }

    let bookings = data.bookings;

    // 🔎 Log sample booking
    if (bookings.length > 0) {
      console.log('SAMPLE BOOKING:', bookings[0]);
    } else {
      console.log('⚠️ NO BOOKINGS IN RAW API RESPONSE');
    }

    // Apply filters
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;

    console.log('FILTERS:', { 
      dateFrom, 
      dateTo, 
      from: from?.toISOString(), 
      to: to?.toISOString(), 
      filterCountry, 
      filterProvince, 
      filterCity 
    });

    const beforeFilterCount = bookings.length;
    
    bookings = bookings.filter((b: any) => {
      const d = new Date(b.check_in_date);

      const pass =
        (!from || d >= from) &&
        (!to || d <= to) &&
        (!filterCountry || b.guest_country === filterCountry) &&
        (!filterProvince || b.guest_province === filterProvince) &&
        (!filterCity || b.guest_city === filterCity);

      if (!pass && beforeFilterCount > 0) {
        console.log('❌ FILTERED OUT:', {
          id: b.id,
          check_in_date: b.check_in_date,
          parsed_date: d.toISOString(),
          guest_country: b.guest_country,
          guest_province: b.guest_province,
          guest_city: b.guest_city
        });
      }

      return pass;
    });

    console.log('BOOKINGS COUNT (after filter):', bookings.length);
    console.log('================ DEBUG END ================');
    
    // ========== CONTINUE WITH REST OF FUNCTION ==========
    const today = new Date().toISOString().split('T')[0];
    const totalRevenue = bookings.reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
    const totalNights = bookings.reduce((s: number, b: any) => s + (b.nights || 1), 0);
    const todayBookings = bookings.filter((b: any) => b.check_in_date === today).length;

    const totalRooms = business?.total_rooms || 1;
    const dates = bookings.map((b: any) => new Date(b.check_in_date).getTime());
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    const days = dates.length ? (max - min) / (1000 * 60 * 60 * 24) + 1 : 1;
    const maxNights = totalRooms * days;
    const booking_density = maxNights ? Math.min(100, Math.round((totalNights / maxNights) * 100)) : 0;

    const monthlyMap: Record<string, any> = {};
    bookings.forEach((b: any) => {
      if (b.check_in_date) {
        const d = new Date(b.check_in_date);
        const monthIndex = d.getMonth();
        const year = d.getFullYear();
        const key = `${year}-${monthIndex}`;

        if (!monthlyMap[key]) {
          monthlyMap[key] = {
            month: d.toLocaleString('default', { month: 'short' }),
            monthIndex,
            year,
            bookings: 0,
            revenue: 0,
            nights: 0,
          };
        }

        monthlyMap[key].bookings++;
        monthlyMap[key].revenue += b.total_amount || 0;
        monthlyMap[key].nights += b.nights || 1;
      }
    });

    const monthly_data = Object.values(monthlyMap)
      .map((m: any) => {
        const daysInMonth = new Date(m.year, m.monthIndex + 1, 0).getDate();
        const max = totalRooms * daysInMonth;
        return {
          ...m,
          density: max ? Math.round((m.nights / max) * 100) : 0,
        };
      })
      .sort((a: any, b: any) => a.year - b.year || a.monthIndex - b.monthIndex);

    const guest_origins = {
      countries: {} as Record<string, number>,
      provinces: {} as Record<string, number>,
      cities: {} as Record<string, number>,
    };

    bookings.forEach((b: any) => {
      if (b.guest_country) guest_origins.countries[b.guest_country] = (guest_origins.countries[b.guest_country] || 0) + 1;
      if (b.guest_province) guest_origins.provinces[b.guest_province] = (guest_origins.provinces[b.guest_province] || 0) + 1;
      if (b.guest_city) guest_origins.cities[b.guest_city] = (guest_origins.cities[b.guest_city] || 0) + 1;
    });

    const analyticsData = {
      total_bookings: bookings.length,
      total_revenue: totalRevenue,
      booking_density,
      occupancy_rate: booking_density,
      today_bookings: todayBookings,
      monthly_data,
      guest_origins,
      recent_checkins: bookings.slice(0, 10),
    };
    
    console.log('📊 FINAL ANALYTICS DATA:', analyticsData);
    setAnalytics(analyticsData);
    
  } catch (err: any) {
    console.error('Error loading bookings:', err);
    setAnalyticsError(err.message);
  } finally {
    setAnalyticsLoading(false);
  }
};
  const loadBookings = async () => {
    const businessId = getBusinessId();
    if (!businessId) {
      console.error('No business ID found');
      setAnalyticsError('No business ID found');
      return;
    }

    console.log('loadBookings called for business:', businessId);
    setAnalyticsLoading(true);
    setAnalyticsError(null);

    try {
      const res = await authenticatedFetch(
        `/.netlify/functions/get-business-bookings?businessId=${businessId}&limit=500`
      );

      const data = await res.json();
      console.log('API Response received, bookings count:', data.bookings?.length);
      
      if (!Array.isArray(data?.bookings)) throw new Error('Invalid data from server');

      let bookings = data.bookings;
      console.log('Raw bookings count:', bookings.length);

      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;

      bookings = bookings.filter((b: any) => {
        const d = new Date(b.check_in_date);
        return (
          (!from || d >= from) &&
          (!to || d <= to) &&
          (!filterCountry || b.guest_country === filterCountry) &&
          (!filterProvince || b.guest_province === filterProvince) &&
          (!filterCity || b.guest_city === filterCity)
        );
      });

      console.log('After filter bookings count:', bookings.length);

      const today = new Date().toISOString().split('T')[0];
      const totalRevenue = bookings.reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
      const totalNights = bookings.reduce((s: number, b: any) => s + (b.nights || 1), 0);
      const todayBookings = bookings.filter((b: any) => b.check_in_date === today).length;

      const totalRooms = business?.total_rooms || 1;
      const dates = bookings.map((b: any) => new Date(b.check_in_date).getTime());
      const min = Math.min(...dates);
      const max = Math.max(...dates);
      const days = dates.length ? (max - min) / (1000 * 60 * 60 * 24) + 1 : 1;
      const maxNights = totalRooms * days;
      const booking_density = maxNights ? Math.min(100, Math.round((totalNights / maxNights) * 100)) : 0;

      const monthlyMap: Record<string, any> = {};
      bookings.forEach((b: any) => {
        const d = new Date(b.check_in_date);
        const monthIndex = d.getMonth();
        const year = d.getFullYear();
        const key = `${year}-${monthIndex}`;

        if (!monthlyMap[key]) {
          monthlyMap[key] = {
            month: d.toLocaleString('default', { month: 'short' }),
            monthIndex,
            year,
            bookings: 0,
            revenue: 0,
            nights: 0,
          };
        }

        monthlyMap[key].bookings++;
        monthlyMap[key].revenue += b.total_amount || 0;
        monthlyMap[key].nights += b.nights || 1;
      });

      const monthly_data = Object.values(monthlyMap)
        .map((m: any) => {
          const daysInMonth = new Date(m.year, m.monthIndex + 1, 0).getDate();
          const max = totalRooms * daysInMonth;
          return {
            ...m,
            density: max ? Math.round((m.nights / max) * 100) : 0,
          };
        })
        .sort((a: any, b: any) => a.year - b.year || a.monthIndex - b.monthIndex);

      const guest_origins = {
        countries: {} as Record<string, number>,
        provinces: {} as Record<string, number>,
        cities: {} as Record<string, number>,
      };

      bookings.forEach((b: any) => {
        if (b.guest_country) guest_origins.countries[b.guest_country] = (guest_origins.countries[b.guest_country] || 0) + 1;
        if (b.guest_province) guest_origins.provinces[b.guest_province] = (guest_origins.provinces[b.guest_province] || 0) + 1;
        if (b.guest_city) guest_origins.cities[b.guest_city] = (guest_origins.cities[b.guest_city] || 0) + 1;
      });

      const analyticsData = {
  total_bookings: bookings.length,
  total_revenue: totalRevenue,
  booking_density,
  occupancy_rate: booking_density,  // ← ADD THIS
  today_bookings: todayBookings,
  monthly_data,
  guest_origins,
  recent_checkins: bookings.slice(0, 10),
};
      
      console.log('Setting analytics data:', analyticsData);
      setAnalytics(analyticsData);
    } catch (err: any) {
      console.error('Error loading bookings:', err);
      setAnalyticsError(err.message);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchBusinessData = async (businessId: string) => {
    try {
      const res = await authenticatedFetch(`/.netlify/functions/get-business-profile?businessId=${businessId}`);
      const data = await res.json();

      if (!data?.id) throw new Error('Invalid business');

      setBusiness(data);
      
      setFormData({
        total_rooms: data.total_rooms?.toString() || '',
        avg_price: data.avg_price?.toString() || '',
        logo_url: data.logo_url || '',
        primary_color: data.primary_color || '#f59e0b',
        secondary_color: data.secondary_color || '#1e1e1e',
        welcome_message: data.welcome_message || `Welcome to ${data.trading_name}`
      });

      const url = `https://fastcheckin.co.za/checkin/${data.id}`;
      setCheckInUrl(url);
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`);
    } catch (err) {
      console.error(err);
      navigate('/business/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = getBusinessId();
    if (!id) {
      navigate('/business/login');
      return;
    }
    fetchBusinessData(id);
  }, []);

  // Auto-load analytics when dashboard mounts
  useEffect(() => {
    console.log('🔄 Dashboard mounted, loading analytics automatically...');
    
    setTimeout(() => {
      const businessId = getBusinessId();
      if (businessId) {
        console.log('✅ Business ID found:', businessId);
        loadBookings();
      } else {
        console.log('⏳ No business ID yet, checking again...');
        setTimeout(() => {
          const retryId = getBusinessId();
          if (retryId) {
            loadBookings();
          } else {
            console.error('❌ Could not get business ID after retry');
          }
        }, 1000);
      }
    }, 500);
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics') {
      console.log('Analytics tab opened, loading bookings...');
      loadBookings();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'analytics' && business?.id) {
      console.log('Filters changed, reloading analytics');
      loadBookings();
    }
  }, [dateFrom, dateTo, filterCountry, filterProvince, filterCity]);

  useEffect(() => {
    if (checkInUrl) {
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(checkInUrl)}`);
    }
  }, [checkInUrl, qrRefreshKey]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, etc.)');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be less than 2MB');
      return;
    }
    
    setUploadingLogo(true);
    setUploadProgress(0);
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 20, 90));
    }, 100);
    
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        clearInterval(progressInterval);
        setUploadProgress(100);
        const base64String = reader.result as string;
        setFormData({ ...formData, logo_url: base64String });
        setQrRefreshKey(prev => prev + 1);
        setTimeout(() => {
          setUploadingLogo(false);
          setUploadProgress(0);
        }, 500);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo. Please try again.');
      setUploadingLogo(false);
      setUploadProgress(0);
    }
  };

  const handleSaveSetup = async () => {
    setSaving(true);
    setSaveMessage('');
    
    try {
      const response = await authenticatedFetch('/.netlify/functions/update-business-profile', {
        method: 'POST',
        body: JSON.stringify({
          businessId: business?.id,
          total_rooms: parseInt(formData.total_rooms) || null,
          avg_price: parseInt(formData.avg_price) || null,
          logo_url: formData.logo_url,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          welcome_message: formData.welcome_message,
          setup_complete: true
        })
      });

      const result = await response.json();

      if (response.ok) {
        setSaveMessage('Settings saved successfully!');
        const updatedBusiness = { 
          ...business, 
          total_rooms: parseInt(formData.total_rooms) || null,
          avg_price: parseInt(formData.avg_price) || null,
          logo_url: formData.logo_url,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          welcome_message: formData.welcome_message,
          setup_complete: true 
        };
        setBusiness(updatedBusiness);
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage(result.error || 'Failed to save settings. Please try again.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const downloadQRCode = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 400;
    canvas.height = 550;
    
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = qrCodeUrl;
    
    const logoImg = new Image();
    if (formData.logo_url) {
      logoImg.src = formData.logo_url;
    }
    
    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (formData.logo_url) {
          logoImg.onload = () => {
            ctx.drawImage(logoImg, 140, 20, 120, 80);
            drawQRAndText(ctx, img);
          };
          if (logoImg.complete) {
            ctx.drawImage(logoImg, 140, 20, 120, 80);
            drawQRAndText(ctx, img);
          } else {
            logoImg.onload = () => drawQRAndText(ctx, img);
          }
        } else {
          ctx.fillStyle = formData.secondary_color;
          ctx.font = 'bold 24px "Inter", sans-serif';
          ctx.fillText(business?.trading_name || 'Business', 100, 70);
          drawQRAndText(ctx, img);
        }
      }
    };
    
    const drawQRAndText = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
      ctx.fillStyle = formData.secondary_color;
      ctx.font = 'italic 16px "Inter", sans-serif';
      ctx.fillText(formData.welcome_message || `Welcome to ${business?.trading_name}`, 60, 130);
      
      ctx.drawImage(img, 100, 150, 200, 200);
      
      ctx.fillStyle = formData.primary_color;
      ctx.font = 'bold 18px "Inter", sans-serif';
      ctx.fillText('Scan to Check In', 130, 390);
      
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 16px "Inter", sans-serif';
      ctx.fillText('FASTCHECKIN', 150, 470);
      ctx.fillStyle = '#6b7280';
      ctx.font = 'italic 12px "Inter", sans-serif';
      ctx.fillText('Seamless Check-in, Smarter Stay', 110, 500);
      
      const link = document.createElement('a');
      link.download = `${(business?.trading_name || 'business').replace(/\s+/g, '-')}-checkin-qr.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(checkInUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      alert('Failed to copy link');
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/business/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">No business data found. Please log in again.</p>
          <button 
            onClick={() => navigate('/business/login')}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const businessLocation = business.physical_address 
    ? `${business.physical_address.city}, ${business.physical_address.province}`
    : 'Location not set';

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-stone-900 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <img 
                src="/fastcheckin-logo.png" 
                alt="FastCheckin" 
                className="h-10 w-auto"
              />
              <p className="text-stone-400 text-sm">{business.trading_name}</p>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'dashboard' 
                    ? 'bg-amber-500 text-white' 
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'analytics' 
                    ? 'bg-amber-500 text-white' 
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('setup')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'setup' 
                    ? 'bg-amber-500 text-white' 
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="text-stone-400 hover:text-white text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">
                    Your Check-in QR Code
                  </h2>
                  <p className="text-stone-500">
                    Display this QR code at your reception. Guests scan to check in.
                  </p>
                </div>
                <button
                  onClick={downloadQRCode}
                  className="bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download QR Code
                </button>
              </div>

              <div className="mt-8 flex justify-center">
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-8 inline-block">
                  <div className="bg-white p-4 rounded-xl shadow-lg">
                    <div className="text-center">
                      {formData.logo_url ? (
                        <img src={formData.logo_url} alt="Logo" className="h-12 mx-auto mb-2 object-contain" />
                      ) : (
                        <p className="font-bold text-stone-900 mb-2">{business.trading_name}</p>
                      )}
                      <p className="text-sm text-stone-500 mb-2">{formData.welcome_message}</p>
                      <img
                        src={qrCodeUrl}
                        alt="Check-in QR Code"
                        className="w-32 h-32 mx-auto my-2"
                        key={qrRefreshKey}
                      />
                      <p className="text-xs font-bold text-amber-600 mt-2">Scan to Check In</p>
                      <p className="text-[10px] text-stone-400 mt-2">FASTCHECKIN</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-stone-500 mb-2">Or share this direct link:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={checkInUrl}
                    readOnly
                    className="flex-1 px-4 py-2 border border-stone-200 rounded-lg bg-stone-50 text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition-colors"
                  >
                    {copySuccess ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow p-6">
                <h4 className="text-xs uppercase tracking-widest text-stone-400">Total Rooms</h4>
                <p className="text-3xl font-serif font-bold text-stone-900 mt-2">
                  {business.total_rooms || '—'}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <h4 className="text-xs uppercase tracking-widest text-stone-400">Avg. Price</h4>
                <p className="text-3xl font-serif font-bold text-stone-900 mt-2">
                  {business.avg_price ? `R${business.avg_price}` : '—'}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <h4 className="text-xs uppercase tracking-widest text-stone-400">Check-ins Today</h4>
                <p className="text-3xl font-serif font-bold text-stone-900 mt-2">
                  {analytics?.today_bookings || 0}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <button
                onClick={() => window.open(`/checkin/${business.id}`, '_blank')}
                className="bg-amber-600 text-white p-6 rounded-xl text-left hover:bg-amber-700 transition-colors"
              >
                <h3 className="text-xl font-bold mb-2">Guest Check-in Page</h3>
                <p className="text-amber-100 text-sm">Direct link for your guests</p>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className="bg-stone-900 text-white p-6 rounded-xl text-left hover:bg-stone-800 transition-colors"
              >
                <h3 className="text-xl font-bold mb-2">View Analytics</h3>
                <p className="text-stone-400 text-sm">See your business performance and guest registry</p>
              </button>
            </div>
          </div>
        )}

       {activeTab === 'analytics' && (
  <div className="space-y-8">
    {/* DEBUG BUTTON - Add this first */}
    <div className="flex justify-end">
      <button
        onClick={async () => {
          console.log('🔵🔵🔵 DEBUG BUTTON CLICKED 🔵🔵🔵');
          const businessId = getBusinessId();
          console.log('Business ID from getBusinessId():', businessId);
          
          if (!businessId) {
            alert('No business ID found!');
            return;
          }
          
          const url = `/.netlify/functions/get-business-bookings?businessId=${businessId}&limit=500`;
          console.log('Fetching:', url);
          
          try {
            const response = await fetch(url);
            const data = await response.json();
            console.log('API Response:', data);
            console.log('Bookings count:', data.bookings?.length);
            
            if (data.bookings && data.bookings.length > 0) {
              const totalRevenue = data.bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
              alert(`✅ Found ${data.bookings.length} bookings!\nRevenue: R${totalRevenue}`);
            } else {
              alert('❌ No bookings found');
            }
          } catch (error) {
            console.error('Error:', error);
            alert('Error fetching data');
          }
        }}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm shadow-md font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        DEBUG TEST
      </button>
    </div>

    {/* Your existing Refresh Data button */}
    <div className="flex justify-end">
      <button
        onClick={() => {
          console.log('Manual refresh triggered');
          loadBookings();
        }}
        disabled={analyticsLoading}
        className={`px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 text-sm shadow-md font-medium ${
          analyticsLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {analyticsLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            Loading...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </>
        )}
      </button>
    </div>

            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-serif font-bold text-stone-900 mb-6">Business Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-stone-400">Business Name</p>
                  <p className="font-medium text-stone-900">{business.trading_name}</p>
                  <p className="text-sm text-stone-600">{business.registered_name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-stone-400">Contact</p>
                  <p className="font-medium text-stone-900">{business.phone}</p>
                  <p className="text-sm text-stone-600">{business.email}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-stone-400">Location</p>
                  <p className="font-medium text-stone-900">{businessLocation}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-stone-400">Registration Date</p>
                  <p className="font-medium text-stone-900">{business.created_at ? new Date(business.created_at).toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-stone-400">Subscription</p>
                  <p className="font-medium text-stone-900 capitalize">{business.subscription_tier || 'Monthly'} Plan</p>
                  <span className="inline-flex px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h3 className="text-lg font-semibold text-stone-900 mb-4">Filter by Date</h3>
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-3 py-2 border border-stone-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-3 py-2 border border-stone-200 rounded-lg"
                  />
                </div>
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="self-end px-4 py-2 text-sm text-stone-600 hover:text-stone-900"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h3 className="text-lg font-semibold text-stone-900 mb-4">Filter by Guest Origin</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Country</label>
                  <select
                    value={filterCountry}
                    onChange={(e) => setFilterCountry(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg"
                  >
                    <option value="">All Countries</option>
                    {analytics?.guest_origins?.countries && Object.keys(analytics.guest_origins.countries).map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Province</label>
                  <select
                    value={filterProvince}
                    onChange={(e) => setFilterProvince(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg"
                  >
                    <option value="">All Provinces</option>
                    {analytics?.guest_origins?.provinces && Object.keys(analytics.guest_origins.provinces).map(province => (
                      <option key={province} value={province}>{province}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">City</label>
                  <select
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg"
                  >
                    <option value="">All Cities</option>
                    {analytics?.guest_origins?.cities && Object.keys(analytics.guest_origins.cities).map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={() => { setFilterCountry(''); setFilterProvince(''); setFilterCity(''); }}
                className="mt-4 text-sm text-amber-600 hover:text-amber-700"
              >
                Clear Origin Filters
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
  <div className="bg-white rounded-2xl shadow-xl p-8">
    <h4 className="text-sm uppercase tracking-widest text-stone-400">Total Bookings</h4>
    <p className="text-4xl font-serif font-bold text-stone-900 mt-2">{analytics?.total_bookings || 0}</p>
  </div>
  <div className="bg-white rounded-2xl shadow-xl p-8">
    <h4 className="text-sm uppercase tracking-widest text-stone-400">Total Revenue</h4>
    <p className="text-4xl font-serif font-bold text-stone-900 mt-2">R {analytics?.total_revenue?.toLocaleString() || 0}</p>
  </div>
  <div className="bg-white rounded-2xl shadow-xl p-8">
    <h4 className="text-sm uppercase tracking-widest text-stone-400">Occupancy Rate</h4>
    <p className="text-4xl font-serif font-bold text-stone-900 mt-2">
      {(() => {
        const totalRooms = business?.total_rooms || 1;
        const totalNights = analytics?.recent_checkins?.reduce((sum, b) => sum + (b.nights || 1), 0) || 0;
        const days = 365;
        const maxNights = totalRooms * days;
        const occupancy = maxNights ? Math.min(100, Math.round((totalNights / maxNights) * 100)) : 0;
        return occupancy;
      })()}%
    </p>
    <p className="text-xs text-stone-400 mt-1">Nights booked vs annual capacity</p>
  </div>
</div>
            {analyticsError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                ⚠️ {analyticsError}
              </div>
            )}

            {analyticsLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : analytics ? (
              <>
                {analytics.monthly_data.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h3 className="text-lg font-semibold text-stone-900 mb-4">Monthly Booking Trend</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-stone-200">
                            <th className="text-left py-2 text-sm text-stone-500">Month</th>
                            <th className="text-right py-2 text-sm text-stone-500">Bookings</th>
                            <th className="text-right py-2 text-sm text-stone-500">Revenue</th>
                            <th className="text-right py-2 text-sm text-stone-500">Density</th>
                           </tr>
                        </thead>
                        <tbody>
                          {analytics.monthly_data.map((month, idx) => (
                            <tr key={idx} className="border-b border-stone-100">
                              <td className="py-2 text-sm font-medium">{month.month} {month.year}</td>
                              <td className="py-2 text-sm text-right">{month.bookings}</td>
                              <td className="py-2 text-sm text-right">R {month.revenue.toLocaleString()}</td>
                              <td className="py-2 text-sm text-right">{month.density}%</td>
                              </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h3 className="text-lg font-semibold text-stone-900 mb-4">Guest Origins by Country</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {Object.entries(analytics.guest_origins.countries).map(([country, count]) => (
                        <div key={country} className="flex justify-between py-1">
                          <span className="text-sm text-stone-600">{country}</span>
                          <span className="text-sm font-medium text-stone-900">{count}</span>
                        </div>
                      ))}
                      {Object.keys(analytics.guest_origins.countries).length === 0 && (
                        <p className="text-sm text-stone-400">No data available</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h3 className="text-lg font-semibold text-stone-900 mb-4">Top Cities</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {Object.entries(analytics.guest_origins.cities)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                        .map(([city, count]) => (
                          <div key={city} className="flex justify-between py-1">
                            <span className="text-sm text-stone-600">{city}</span>
                            <span className="text-sm font-medium text-stone-900">{count}</span>
                          </div>
                        ))}
                      {Object.keys(analytics.guest_origins.cities).length === 0 && (
                        <p className="text-sm text-stone-400">No data available</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <h3 className="text-lg font-semibold text-stone-900 mb-4">Recent Check-ins</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-stone-200">
                          <th className="text-left py-2 text-sm text-stone-500">Guest Name</th>
                          <th className="text-left py-2 text-sm text-stone-500">Check-in Date</th>
                          <th className="text-right py-2 text-sm text-stone-500">Nights</th>
                          <th className="text-right py-2 text-sm text-stone-500">Amount</th>
                         </tr>
                      </thead>
                      <tbody>
                        {analytics.recent_checkins.map((guest: any, idx: number) => (
                          <tr key={idx} className="border-b border-stone-100">
                            <td className="py-2 text-sm">{guest.guest_name}</td>
                            <td className="py-2 text-sm">{new Date(guest.check_in_date).toLocaleDateString()}</td>
                            <td className="py-2 text-sm text-right">{guest.nights || 1}</td>
                            <td className="py-2 text-sm text-right">R {(guest.total_amount || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                        {analytics.recent_checkins.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-stone-400">
                              No check-ins yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <p className="text-stone-500">No analytics data available yet.</p>
                <button
                  onClick={() => loadBookings()}
                  className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Load Bookings
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'setup' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">
              Business Settings
            </h2>
            <p className="text-stone-500 mb-8">
              Configure your property details and customize your check-in page.
            </p>

            {saveMessage && (
              <div className={`mb-6 p-4 rounded-lg ${
                saveMessage.includes('success') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {saveMessage}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSaveSetup(); }} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                    Total Number of Rooms *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.total_rooms}
                    onChange={(e) => setFormData({...formData, total_rooms: e.target.value})}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g., 20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                    Average Room Price (ZAR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.avg_price}
                    onChange={(e) => setFormData({...formData, avg_price: e.target.value})}
                    className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g., 1200"
                  />
                </div>
              </div>

              <div className="border-t border-stone-100 pt-8">
                <h3 className="text-xl font-serif font-bold text-stone-900 mb-6">
                  Branding & Appearance
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                      Business Logo
                    </label>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="px-4 py-3 bg-stone-100 text-stone-700 rounded-xl hover:bg-stone-200 transition-colors"
                      >
                        {uploadingLogo ? (uploadProgress > 0 ? `${uploadProgress}%` : 'Uploading...') : 'Choose Logo Image'}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      {formData.logo_url && (
                        <div className="flex items-center gap-2">
                          <img 
                            src={formData.logo_url} 
                            alt="Logo preview" 
                            className="h-12 w-12 object-contain border rounded"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, logo_url: ''})}
                            className="text-red-500 text-sm hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-1">
                      Upload your logo (PNG, JPG, max 2MB)
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                      Welcome Message
                    </label>
                    <input
                      type="text"
                      value={formData.welcome_message}
                      onChange={(e) => setFormData({...formData, welcome_message: e.target.value})}
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                      placeholder="Welcome to our establishment"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                      Primary Color
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                        className="w-12 h-12 border border-stone-200 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.primary_color}
                        onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                        className="flex-1 px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                      Secondary Color
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        value={formData.secondary_color}
                        onChange={(e) => setFormData({...formData, secondary_color: e.target.value})}
                        className="w-12 h-12 border border-stone-200 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.secondary_color}
                        onChange={(e) => setFormData({...formData, secondary_color: e.target.value})}
                        className="flex-1 px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <h4 className="font-bold text-amber-900 mb-3">QR Code Preview</h4>
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-xl shadow-lg inline-block">
                    <div className="text-center">
                      {formData.logo_url ? (
                        <img src={formData.logo_url} alt="Logo" className="h-12 mx-auto mb-2 object-contain" />
                      ) : (
                        <p className="font-bold text-stone-900 mb-2">{business.trading_name}</p>
                      )}
                      <p className="text-sm text-stone-500 mb-2">{formData.welcome_message}</p>
                      <img 
                        src={qrCodeUrl} 
                        alt="QR Code" 
                        className="w-32 h-32 mx-auto my-2"
                        key={qrRefreshKey}
                      />
                      <p className="text-xs font-bold text-amber-600 mt-2">Scan to Check In</p>
                      <p className="text-[10px] text-stone-400 mt-2">FASTCHECKIN</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-amber-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
