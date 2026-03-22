import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface BusinessProfile {
  id: string;
  trading_name: string;
  registered_name: string;
  email: string;
  phone: string;
  total_rooms?: number;
  avg_price?: number;
  status?: string;
  setup_complete: boolean;
}

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [checkInUrl, setCheckInUrl] = useState('');

  useEffect(() => {
    // Get business from localStorage (set during login)
    const storedBusiness = localStorage.getItem('business');
    
    console.log('📦 Stored business:', storedBusiness);
    
    if (!storedBusiness) {
      console.log('❌ No business found, redirecting to login');
      navigate('/business/login');
      return;
    }

    try {
      const businessData = JSON.parse(storedBusiness);
      console.log('✅ Business loaded:', businessData.trading_name);
      setBusiness(businessData);
      
      // Generate QR code
      const url = `https://fastcheckin.co.za/checkin/${businessData.id}`;
      setCheckInUrl(url);
      
      // Use QR code API
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`);
      
    } catch (err) {
      console.error('Error parsing business data:', err);
      localStorage.removeItem('business');
      navigate('/business/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const downloadQRCode = () => {
    // Create a canvas to generate the QR code with text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 300;
    canvas.height = 380;
    
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = qrCodeUrl;
    
    img.onload = () => {
      if (ctx) {
        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw QR code
        ctx.drawImage(img, 50, 30, 200, 200);
        
        // Add text
        ctx.fillStyle = '#1e1e1e';
        ctx.font = 'bold 20px "Inter", sans-serif';
        ctx.fillText('FASTCHECKIN', 70, 260);
        
        ctx.font = '16px "Inter", sans-serif';
        ctx.fillStyle = '#4b5563';
        ctx.fillText(business?.trading_name || 'Business', 90, 290);
        
        ctx.font = 'italic 14px "Inter", sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('Scan to Check In', 95, 320);
        
        // Download
        const link = document.createElement('a');
        link.download = `${(business?.trading_name || 'business').replace(/\s+/g, '-')}-checkin-qr.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
    };
  };

  const handleLogout = () => {
    localStorage.removeItem('business');
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

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-stone-900 text-white py-6 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tighter">
              FAST<span className="text-amber-500">CHECKIN</span>
            </h1>
            <p className="text-stone-400 text-sm mt-1">{business.trading_name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-stone-400 hover:text-white text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-serif font-bold text-stone-900 mb-2">
                Welcome back, {business.trading_name}!
              </h2>
              <p className="text-stone-500">
                Your business is ready to accept check-ins.
              </p>
            </div>
            
            {/* Download QR Code Button */}
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

          {/* QR Code Display */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-8 inline-block mt-6">
            <div className="bg-white p-4 rounded-xl shadow-lg">
              <img
                src={qrCodeUrl}
                alt="Check-in QR Code"
                className="w-48 h-48 mx-auto"
              />
            </div>
            <div className="text-center mt-4">
              <p className="font-bold text-amber-900">FASTCHECKIN</p>
              <p className="text-amber-700 text-sm">{business.trading_name}</p>
              <p className="text-xs text-amber-600 italic mt-1">Scan to Check In</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
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
            <p className="text-3xl font-serif font-bold text-stone-900 mt-2">0</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => window.open(`/checkin/${business.id}`, '_blank')}
            className="bg-amber-600 text-white p-6 rounded-xl text-left hover:bg-amber-700 transition-colors"
          >
            <h3 className="text-xl font-bold mb-2">Guest Check-in Page</h3>
            <p className="text-amber-100 text-sm">Direct link for your guests</p>
          </button>
          <button
            onClick={() => window.location.href = '/admin'}
            className="bg-stone-900 text-white p-6 rounded-xl text-left hover:bg-stone-800 transition-colors"
          >
            <h3 className="text-xl font-bold mb-2">Management Portal</h3>
            <p className="text-stone-400 text-sm">View analytics and guest registry</p>
          </button>
        </div>
      </div>
    </div>
  );
}
