import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface Props {
  businessId: string;
  businessName: string;
  businessLogo?: string;
  businessPhone?: string;
  onClose: () => void;
}

export default function QRCodeModal({ businessId, businessName, businessLogo, businessPhone, onClose }: Props) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkInUrl, setCheckInUrl] = useState('');
  const [localLogo, setLocalLogo] = useState(businessLogo || '');
  const [logoDimensions, setLogoDimensions] = useState({ width: 0, height: 0 });
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // A4 dimensions at 96 DPI
  const A4_WIDTH = 794;
  const A4_HEIGHT = 1123;
  
  // Logo size limits - Optimized for HD
  const MAX_LOGO_WIDTH = 280;
  const MAX_LOGO_HEIGHT = 160;

  useEffect(() => {
    generateQR();
  }, [businessId]);

  // Calculate logo dimensions when logo changes
  useEffect(() => {
    if (localLogo) {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(
          MAX_LOGO_WIDTH / img.width,
          MAX_LOGO_HEIGHT / img.height,
          1
        );
        setLogoDimensions({
          width: img.width * ratio,
          height: img.height * ratio
        });
      };
      img.src = localLogo;
    }
  }, [localLogo]);

  // Draw preview whenever QR, logo, or dimensions change
  useEffect(() => {
    if (!loading && qrCodeUrl && previewCanvasRef.current) {
      drawPoster(previewCanvasRef.current);
    }
  }, [loading, qrCodeUrl, localLogo, businessName, logoDimensions]);

  const generateQR = async () => {
    setLoading(true);
    setError('');
    try {
      const url = `https://fastcheckin.co.za/checkin/${businessId}`;
      setCheckInUrl(url);
      
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      setError('Failed to generate QR code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Logo must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLocalLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const drawPoster = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = A4_WIDTH;
    canvas.height = A4_HEIGHT;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const QR_SIZE = 320;
    const QR_X = (canvas.width - QR_SIZE) / 2;
    const QR_Y = 380;

    // Load QR code and draw everything
    const qrImg = new Image();
    qrImg.crossOrigin = 'Anonymous';
    qrImg.onload = () => {
      // Draw QR code
      ctx.drawImage(qrImg, QR_X, QR_Y, QR_SIZE, QR_SIZE);
      
      // Draw business logo if uploaded
      if (localLogo && logoDimensions.width > 0) {
        const logoImg = new Image();
        logoImg.crossOrigin = 'Anonymous';
        logoImg.onload = () => {
          const LOGO_X = (canvas.width - logoDimensions.width) / 2;
          const LOGO_Y = 50;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(logoImg, LOGO_X, LOGO_Y, logoDimensions.width, logoDimensions.height);
          drawTextAndBranding(ctx, canvas, QR_Y, QR_SIZE);
        };
        logoImg.src = localLogo;
      } else {
        drawTextAndBranding(ctx, canvas, QR_Y, QR_SIZE);
      }
    };
    qrImg.src = qrCodeUrl;
  };

  const drawTextAndBranding = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, QR_Y: number, QR_SIZE: number) => {
    const welcomeTextY = localLogo ? 220 : 160;
    const businessNameY = localLogo ? 290 : 230;
    
    // Welcome text
    ctx.font = '400 18px "Inter", system-ui, sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.fillText('Welcome to', canvas.width / 2, welcomeTextY);

    // Business name
    ctx.font = '700 42px "Playfair Display", Georgia, serif';
    ctx.fillStyle = '#111827';
    ctx.fillText(businessName, canvas.width / 2, businessNameY);

    // SCAN TO CHECK IN
    ctx.font = '700 22px "Inter", system-ui, sans-serif';
    ctx.fillStyle = '#f97316';
    ctx.fillText('SCAN TO CHECK IN', canvas.width / 2, QR_Y - 40);

    // Instruction line 1
    ctx.font = '400 16px "Inter", system-ui, sans-serif';
    ctx.fillStyle = '#374151';
    ctx.fillText('Open your camera and point it at the QR code', canvas.width / 2, QR_Y + QR_SIZE + 50);

    // Instruction line 2
    ctx.font = '400 13px "Inter", system-ui, sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('No app required • Takes less than 1 minute', canvas.width / 2, QR_Y + QR_SIZE + 80);

    // ============================================================
    // BRANDING SECTION - "Powered by [LOGO]" on ONE line
    // ============================================================
    
    const fastcheckinLogo = new Image();
    fastcheckinLogo.crossOrigin = 'Anonymous';
    fastcheckinLogo.onload = () => {
      const logoSize = 20;
      const poweredByText = 'Powered by';
      
      ctx.font = '400 12px "Inter", system-ui, sans-serif';
      ctx.fillStyle = '#9ca3af';
      
      const textWidth = ctx.measureText(poweredByText).width;
      const gap = 6;
      const totalWidth = textWidth + gap + logoSize;
      const startX = (canvas.width - totalWidth) / 2;
      const logoY = QR_Y + QR_SIZE + 115;
      
      // Draw "Powered by" text
      ctx.fillText(poweredByText, startX, logoY + 7);
      
      // Draw logo next to text (same line)
      ctx.drawImage(fastcheckinLogo, startX + textWidth + gap, logoY, logoSize, logoSize);
      
      // ============================================================
      // WEBSITE URL - Centered below
      // ============================================================
      ctx.font = '500 12px "Inter", system-ui, sans-serif';
      ctx.fillStyle = '#6b7280';
      const websiteText = 'www.fastcheckin.co.za';
      const websiteWidth = ctx.measureText(websiteText).width;
      ctx.fillText(websiteText, (canvas.width - websiteWidth) / 2, logoY + logoSize + 28);
    };
    fastcheckinLogo.src = '/fastcheckin-logo.png';
  };

  const downloadPoster = async () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = A4_WIDTH;
      canvas.height = A4_HEIGHT;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const qrImg = await loadImage(qrCodeUrl);
      
      const QR_SIZE = 320;
      const QR_X = (canvas.width - QR_SIZE) / 2;
      const QR_Y = 380;
      
      // Draw QR code
      ctx.drawImage(qrImg, QR_X, QR_Y, QR_SIZE, QR_SIZE);
      
      // Draw business logo if uploaded
      if (localLogo && logoDimensions.width > 0) {
        const logoImg = await loadImage(localLogo);
        const LOGO_X = (canvas.width - logoDimensions.width) / 2;
        const LOGO_Y = 50;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(logoImg, LOGO_X, LOGO_Y, logoDimensions.width, logoDimensions.height);
      }

      const welcomeTextY = localLogo ? 220 : 160;
      const businessNameY = localLogo ? 290 : 230;

      // Welcome text
      ctx.font = '400 18px "Inter", system-ui, sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.textAlign = 'center';
      ctx.fillText('Welcome to', canvas.width / 2, welcomeTextY);

      // Business name
      ctx.font = '700 42px "Playfair Display", Georgia, serif';
      ctx.fillStyle = '#111827';
      ctx.fillText(businessName, canvas.width / 2, businessNameY);

      // SCAN TO CHECK IN
      ctx.font = '700 22px "Inter", system-ui, sans-serif';
      ctx.fillStyle = '#f97316';
      ctx.fillText('SCAN TO CHECK IN', canvas.width / 2, QR_Y - 40);

      // Instruction line 1
      ctx.font = '400 16px "Inter", system-ui, sans-serif';
      ctx.fillStyle = '#374151';
      ctx.fillText('Open your camera and point it at the QR code', canvas.width / 2, QR_Y + QR_SIZE + 50);

      // Instruction line 2
      ctx.font = '400 13px "Inter", system-ui, sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText('No app required • Takes less than 1 minute', canvas.width / 2, QR_Y + QR_SIZE + 80);

      // ============================================================
      // BRANDING SECTION - "Powered by [LOGO]" on ONE line
      // ============================================================
      
      const fastcheckinLogo = await loadImage('/fastcheckin-logo.png');
      
      const logoSize = 20;
      const poweredByText = 'Powered by';
      
      ctx.font = '400 12px "Inter", system-ui, sans-serif';
      ctx.fillStyle = '#9ca3af';
      
      const textWidth = ctx.measureText(poweredByText).width;
      const gap = 6;
      const totalWidth = textWidth + gap + logoSize;
      const startX = (canvas.width - totalWidth) / 2;
      const logoY = QR_Y + QR_SIZE + 115;
      
      // Draw "Powered by" text
      ctx.fillText(poweredByText, startX, logoY + 7);
      
      // Draw logo next to text (same line)
      ctx.drawImage(fastcheckinLogo, startX + textWidth + gap, logoY, logoSize, logoSize);
      
      // ============================================================
      // WEBSITE URL - Centered below
      // ============================================================
      ctx.font = '500 12px "Inter", system-ui, sans-serif';
      ctx.fillStyle = '#6b7280';
      const websiteText = 'www.fastcheckin.co.za';
      const websiteWidth = ctx.measureText(websiteText).width;
      ctx.fillText(websiteText, (canvas.width - websiteWidth) / 2, logoY + logoSize + 28);

      // Download the image
      const link = document.createElement('a');
      link.download = `${businessName.toLowerCase().replace(/\s+/g, '-')}-checkin-poster.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error generating poster:', error);
      alert('Failed to generate poster. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const printPoster = async () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = A4_WIDTH;
      canvas.height = A4_HEIGHT;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const qrImg = await loadImage(qrCodeUrl);
      
      const QR_SIZE = 320;
      const QR_X = (canvas.width - QR_SIZE) / 2;
      const QR_Y = 380;
      
      if (localLogo && logoDimensions.width > 0) {
        const logoImg = await loadImage(localLogo);
        const LOGO_X = (canvas.width - logoDimensions.width) / 2;
        const LOGO_Y = 50;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(logoImg, LOGO_X, LOGO_Y, logoDimensions.width, logoDimensions.height);
      }

      const welcomeTextY = localLogo ? 220 : 160;
      const businessNameY = localLogo ? 290 : 230;

      ctx.font = '400 18px "Inter", system-ui, sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.textAlign = 'center';
      ctx.fillText('Welcome to', canvas.width / 2, welcomeTextY);

      ctx.font = '700 42px "Playfair Display", Georgia, serif';
      ctx.fillStyle = '#111827';
      ctx.fillText(businessName, canvas.width / 2, businessNameY);

      ctx.font = '700 22px "Inter", system-ui, sans-serif';
      ctx.fillStyle = '#f97316';
      ctx.fillText('SCAN TO CHECK IN', canvas.width / 2, QR_Y - 40);

      ctx.drawImage(qrImg, QR_X, QR_Y, QR_SIZE, QR_SIZE);

      ctx.font = '400 16px "Inter", system-ui, sans-serif';
      ctx.fillStyle = '#374151';
      ctx.fillText('Open your camera and point it at the QR code', canvas.width / 2, QR_Y + QR_SIZE + 50);

      ctx.font = '400 13px "Inter", system-ui, sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText('No app required • Takes less than 1 minute', canvas.width / 2, QR_Y + QR_SIZE + 80);

      // ============================================================
      // BRANDING SECTION - "Powered by [LOGO]" on ONE line
      // ============================================================
      
      const fastcheckinLogo = await loadImage('/fastcheckin-logo.png');
      
      const logoSize = 20;
      const poweredByText = 'Powered by';
      
      ctx.font = '400 12px "Inter", system-ui, sans-serif';
      ctx.fillStyle = '#9ca3af';
      
      const textWidth = ctx.measureText(poweredByText).width;
      const gap = 6;
      const totalWidth = textWidth + gap + logoSize;
      const startX = (canvas.width - totalWidth) / 2;
      const logoY = QR_Y + QR_SIZE + 115;
      
      ctx.fillText(poweredByText, startX, logoY + 7);
      ctx.drawImage(fastcheckinLogo, startX + textWidth + gap, logoY, logoSize, logoSize);
      
      // ============================================================
      // WEBSITE URL - Centered below
      // ============================================================
      ctx.font = '500 12px "Inter", system-ui, sans-serif';
      ctx.fillStyle = '#6b7280';
      const websiteText = 'www.fastcheckin.co.za';
      const websiteWidth = ctx.measureText(websiteText).width;
      ctx.fillText(websiteText, (canvas.width - websiteWidth) / 2, logoY + logoSize + 28);

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Check-in Poster - ${businessName}</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 100vh; 
                  background: #f0f0f0;
                  padding: 20px;
                }
                img { 
                  max-width: 100%; 
                  height: auto; 
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                @media print {
                  body { background: white; padding: 0; margin: 0; }
                  img { box-shadow: none; max-width: 100%; height: auto; }
                }
              </style>
            </head>
            <body>
              <img src="${canvas.toDataURL('image/png')}" alt="Check-in Poster">
              <script>
                window.onload = () => {
                  setTimeout(() => {
                    window.print();
                    window.close();
                  }, 500);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Error printing poster:', error);
      alert('Failed to print poster. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${businessName.toLowerCase().replace(/\s+/g, '-')}-qr-code.png`;
    link.click();
  };

  const sendEmail = async () => {
    setSendingEmail(true);
    try {
      const response = await fetch('/.netlify/functions/send-qr-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          businessName,
          qrCodeUrl,
          checkInUrl
        })
      });

      if (response.ok) {
        alert(`✅ QR Code sent successfully to ${businessName}`);
      } else {
        alert('❌ Failed to send email. Please try again.');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Error sending email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const sendWhatsApp = async () => {
    if (!businessPhone) {
      alert('No phone number configured for this business');
      return;
    }

    setSendingWhatsApp(true);
    try {
      const response = await fetch('/.netlify/functions/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: businessPhone,
          guest_name: businessName,
          business_name: businessName,
          check_in_date: new Date().toISOString(),
          qr_code_url: qrCodeUrl
        })
      });

      if (response.ok) {
        alert('✅ WhatsApp message sent successfully!');
      } else {
        alert('❌ Failed to send WhatsApp message');
      }
    } catch (error) {
      console.error('WhatsApp error:', error);
      alert('Failed to send WhatsApp message');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-center mt-3 text-gray-500 text-sm">Preparing your QR code...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-sm w-full p-5 text-center">
          <div className="text-red-500 text-3xl mb-3">⚠️</div>
          <h3 className="text-md font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <button onClick={onClose} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-5xl w-full relative shadow-xl" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 hover:bg-gray-100 transition-all z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6">
          <div className="text-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Print-Ready QR Poster</h3>
            <p className="text-sm text-gray-500">A4 size (210 x 297mm) • HD Logo Support</p>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Logo (HD Recommended)</label>
            <div className="flex items-center gap-4">
              {localLogo ? (
                <img src={localLogo} alt="Logo" className="h-16 w-auto object-contain border rounded-lg p-1 bg-white" />
              ) : (
                <div className="h-16 w-16 bg-gray-200 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Upload HD Logo
                </button>
                <p className="text-xs text-gray-400 mt-1">PNG with transparency • Up to 5MB • Preserves quality</p>
              </div>
              {localLogo && (
                <button onClick={() => setLocalLogo('')} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
              )}
            </div>
          </div>

          <div className="bg-gray-100 rounded-lg p-6 mb-4 flex justify-center overflow-auto">
            <canvas
              ref={previewCanvasRef}
              style={{
                width: 'auto',
                height: '70vh',
                maxWidth: '100%',
                objectFit: 'contain',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                borderRadius: '8px'
              }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
            <button 
              onClick={downloadQR} 
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
            >
              QR Only
            </button>
            <button 
              onClick={downloadPoster} 
              disabled={downloading}
              className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? 'Generating...' : 'Download Poster'}
            </button>
            <button 
              onClick={printPoster} 
              disabled={downloading}
              className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Print Poster
            </button>
            <button 
              onClick={sendEmail} 
              disabled={sendingEmail}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingEmail ? 'Sending...' : 'Send Email'}
            </button>
            {businessPhone && (
              <button 
                onClick={sendWhatsApp} 
                disabled={sendingWhatsApp}
                className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingWhatsApp ? 'Sending...' : '📱 WhatsApp'}
              </button>
            )}
          </div>

          <p className="text-[10px] text-gray-400 text-center">
            HD Logo Support • Prints at full quality • A4 size (210 × 297mm)
          </p>
        </div>
      </div>
    </div>
  );
}
