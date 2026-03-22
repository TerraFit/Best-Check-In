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
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  welcome_message?: string;
  setup_complete: boolean;
}

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'setup'>('dashboard');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [checkInUrl, setCheckInUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Setup form data
  const [formData, setFormData] = useState({
    total_rooms: '',
    avg_price: '',
    logo_url: '',
    primary_color: '#f59e0b',
    secondary_color: '#1e1e1e',
    welcome_message: ''
  });

  useEffect(() => {
    const storedBusiness = localStorage.getItem('business');
    
    if (!storedBusiness) {
      navigate('/business/login');
      return;
    }

    try {
      const businessData = JSON.parse(storedBusiness);
      setBusiness(businessData);
      
      // Load existing data into form
      setFormData({
        total_rooms: businessData.total_rooms?.toString() || '',
        avg_price: businessData.avg_price?.toString() || '',
        logo_url: businessData.logo_url || '',
        primary_color: businessData.primary_color || '#f59e0b',
        secondary_color: businessData.secondary_color || '#1e1e1e',
        welcome_message: businessData.welcome_message || `Welcome to ${businessData.trading_name}`
      });
      
      // Generate QR code
      const url = `https://fastcheckin.co.za/checkin/${businessData.id}`;
      setCheckInUrl(url);
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`);
      
    } catch (err) {
      console.error('Error parsing business data:', err);
      navigate('/business/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleSaveSetup = async () => {
    setSaving(true);
    setSaveMessage('');
    
    try {
      const response = await fetch('/.netlify/functions/update-business-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      if (response.ok) {
        setSaveMessage('Settings saved successfully!');
        // Update local business data
        const updatedBusiness = { ...business, ...formData, setup_complete: true };
        localStorage.setItem('business', JSON.stringify(updatedBusiness));
        setBusiness(updatedBusiness);
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('Failed to save settings. Please try again.');
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
    
    // Load business logo if exists
    const logoImg = new Image();
    if (formData.logo_url) {
      logoImg.src = formData.logo_url;
    }
    
    img.onload = () => {
      if (ctx) {
        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw business logo if exists
        if (formData.logo_url && logoImg.complete) {
          ctx.drawImage(logoImg, 140, 20, 120, 80);
        } else {
          // Business name as text
          ctx.fillStyle = formData.secondary_color;
          ctx.font = 'bold 24px "Inter", sans-serif';
          ctx.fillText(business?.trading_name || 'Business', 100, 70);
        }
        
        // Welcome message
        ctx.fillStyle = formData.secondary_color;
        ctx.font = 'italic 16px "Inter", sans-serif';
        ctx.fillText(formData.welcome_message || `Welcome to ${business?.trading_name}`, 60, 130);
        
        // QR Code
        ctx.drawImage(img, 100, 150, 200, 200);
        
        // "Scan to Check In" text
        ctx.fillStyle = formData.primary_color;
        ctx.font = 'bold 18px "Inter", sans-serif';
        ctx.fillText('Scan to Check In', 130, 390);
        
        // FastCheckin logo at bottom
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 16px "Inter", sans-serif';
        ctx.fillText('FASTCHECKIN', 150, 470);
        ctx.fillStyle = '#6b7280';
        ctx.font = 'italic 12px "Inter", sans-serif';
        ctx.fillText('Seamless Check-in, Smarter Stay', 110, 500);
        
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
      {/* Header with Navigation Menu */}
      <div className="bg-stone-900 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tighter">
                FAST<span className="text-amber-500">CHECKIN</span>
              </h1>
              <p className="text-stone-400 text-sm mt-1">{business.trading_name}</p>
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
        {activeTab === 'dashboard' ? (
          // Dashboard View
          <div className="space-y-8">
            {/* QR Code Card */}
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

              {/* QR Code Preview */}
              <div className="mt-8 flex justify-center">
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-8 inline-block">
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

              {/* Check-in Link */}
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
                    onClick={() => {
                      navigator.clipboard.writeText(checkInUrl);
                      alert('Link copied to clipboard!');
                    }}
                    className="px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow p-6">
                <h4 className="text-xs uppercase tracking-widest text-stone-400">Total Rooms</h4>
                <p className="text-3xl font-serif font-bold text-stone-900 mt-2">
                  {business.total_rooms || '—'}
                </p>
                {!business.total_rooms && (
                  <p className="text-xs text-amber-600 mt-2">Set up in Settings</p>
                )}
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <h4 className="text-xs uppercase tracking-widest text-stone-400">Avg. Price</h4>
                <p className="text-3xl font-serif font-bold text-stone-900 mt-2">
                  {business.avg_price ? `R${business.avg_price}` : '—'}
                </p>
                {!business.avg_price && (
                  <p className="text-xs text-amber-600 mt-2">Set up in Settings</p>
                )}
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
        ) : (
          // Setup View
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
              {/* Business Details */}
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

              {/* Branding */}
              <div className="border-t border-stone-100 pt-8">
                <h3 className="text-xl font-serif font-bold text-stone-900 mb-6">
                  Branding & Appearance
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                      Logo URL
                    </label>
                    <input
                      type="url"
                      value={formData.logo_url}
                      onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                      placeholder="https://your-logo-url.png"
                    />
                    <p className="text-xs text-stone-400 mt-1">
                      Upload your logo to a service like Imgur and paste the URL here
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

              {/* QR Code Preview */}
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
                      <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32 mx-auto my-2" />
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
