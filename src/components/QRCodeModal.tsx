import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface Props {
  businessId: string;
  businessName: string;
  businessLogo?: string;
  onClose: () => void;
}

export default function QRCodeModal({ businessId, businessName, businessLogo, onClose }: Props) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkInUrl, setCheckInUrl] = useState('');
  const [localLogo, setLocalLogo] = useState(businessLogo || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poster dimensions - A4 at 150 DPI
  const POSTER_WIDTH = 1240;
  const POSTER_HEIGHT = 1754;

  useEffect(() => {
    generateQR();
  }, [businessId]);

  const generateQR = async () => {
    setLoading(true);
    setError('');
    try {
      const url = `https://fastcheckin.co.za/checkin/${businessId}`;
      setCheckInUrl(url);
      
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 500, // Larger for better print quality
        margin: 1,
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

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLocalLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Generate poster with precise positioning
  const generatePoster = async (): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = POSTER_WIDTH;
      canvas.height = POSTER_HEIGHT;
      
      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Load QR code
      const qrImg = new Image();
      qrImg.crossOrigin = 'Anonymous';
      qrImg.onload = () => {
        // QR Code - 500px square, centered
        const QR_SIZE = 500;
        const QR_X = (canvas.width - QR_SIZE) / 2;
        const QR_Y = 650;
        ctx.drawImage(qrImg, QR_X, QR_Y, QR_SIZE, QR_SIZE);

        // Draw logo if exists
        if (localLogo) {
          const logoImg = new Image();
          logoImg.onload = () => {
            const LOGO_SIZE = 100;
            const LOGO_X = (canvas.width - LOGO_SIZE) / 2;
            const LOGO_Y = 100;
            ctx.drawImage(logoImg, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE);
            drawAllText();
          };
          logoImg.src = localLogo;
          logoImg.crossOrigin = 'Anonymous';
        } else {
          drawAllText();
        }

        function drawAllText() {
          // Welcome text
          ctx.font = '400 28px "Inter", sans-serif';
          ctx.fillStyle = '#666666';
          ctx.textAlign = 'center';
          ctx.fillText('Welcome to', canvas.width / 2, localLogo ? 270 : 180);

          // Business Name - Large
          ctx.font = '700 56px "Playfair Display", serif';
          ctx.fillStyle = '#1e1e1e';
          ctx.fillText(businessName, canvas.width / 2, localLogo ? 350 : 260);

          // Main CTA - Bold Orange
          ctx.font = '700 48px "Inter", sans-serif';
          ctx.fillStyle = '#f59e0b';
          ctx.fillText('SCAN TO CHECK IN', canvas.width / 2, QR_Y + QR_SIZE + 100);

          // Instructions
          ctx.font = '400 24px "Inter", sans-serif';
          ctx.fillStyle = '#4b5563';
          ctx.fillText('Open your camera and point it at the QR code', canvas.width / 2, QR_Y + QR_SIZE + 180);

          // Micro instructions
          ctx.font = '400 20px "Inter", sans-serif';
          ctx.fillStyle = '#9ca3af';
          ctx.fillText('No app download required • Takes less than 1 minute', canvas.width / 2, QR_Y + QR_SIZE + 240);

          // Powered by - bottom
          ctx.font = '400 14px "Inter", sans-serif';
          ctx.fillStyle = '#d1d5db';
          ctx.fillText('Powered by FastCheckin', canvas.width / 2, canvas.height - 70);
          
          ctx.font = '400 12px "Inter", sans-serif';
          ctx.fillStyle = '#e5e7eb';
          ctx.fillText('www.fastcheckin.co.za', canvas.width / 2, canvas.height - 40);

          resolve(canvas.toDataURL('image/png'));
        }
      };
      qrImg.src = qrCodeUrl;
    });
  };

  const downloadPoster = async () => {
    const posterUrl = await generatePoster();
    const link = document.createElement('a');
    link.download = `${businessName.toLowerCase().replace(/\s+/g, '-')}-checkin-poster.png`;
    link.href = posterUrl;
    link.click();
  };

  const printPoster = async () => {
    const posterUrl = await generatePoster();
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
            <img src="${posterUrl}" alt="Check-in Poster">
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
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${businessName.toLowerCase().replace(/\s+/g, '-')}-qr-code.png`;
    link.click();
  };

  const sendEmail = async () => {
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
        alert(`QR Code sent successfully to ${businessName}`);
      } else {
        alert('Failed to send email. Please try again.');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Error sending email. Please try again.');
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
      <div className="bg-white rounded-xl max-w-2xl w-full relative shadow-xl" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 hover:bg-gray-100 transition-all z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Print-Ready QR Poster</h3>
            <p className="text-sm text-gray-500">A4 size (210 x 297mm) • Perfect for printing</p>
          </div>

          {/* Logo Upload */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Logo (Optional)</label>
            <div className="flex items-center gap-4">
              {localLogo ? (
                <img src={localLogo} alt="Logo" className="h-16 w-16 object-contain border rounded-lg p-1 bg-white" />
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
                  Upload Logo
                </button>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 2MB</p>
              </div>
              {localLogo && (
                <button onClick={() => setLocalLogo('')} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-100 rounded-lg p-6 mb-4">
            <p className="text-xs text-gray-400 text-center mb-3">Preview (actual print size when downloaded)</p>
            <div className="bg-white rounded-xl p-6 shadow-sm max-w-md mx-auto">
              {localLogo && (
                <img src={localLogo} alt={businessName} className="h-12 w-auto mx-auto mb-3" />
              )}
              <p className="text-xs text-gray-500 text-center">Welcome to</p>
              <p className="text-lg font-bold text-gray-900 text-center">{businessName}</p>
              <div className="text-center my-3">
                <span className="text-orange-500 font-bold text-sm">📱 SCAN TO CHECK IN</span>
              </div>
              <div className="flex justify-center my-3">
                <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 border border-gray-200 rounded-lg" />
              </div>
              <p className="text-[10px] text-gray-500 text-center mt-2">Open your camera and point it at the QR code</p>
              <p className="text-[9px] text-gray-400 text-center">No app required • Takes less than 1 minute</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <button onClick={downloadQR} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">
              QR Only
            </button>
            <button onClick={downloadPoster} className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium">
              Download Poster
            </button>
            <button onClick={printPoster} className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-sm font-medium">
              Print Poster
            </button>
            <button onClick={sendEmail} className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium">
              Send Email
            </button>
          </div>

          <p className="text-[10px] text-gray-400 text-center">
            Poster size: A4 (210 x 297mm) • Print on paper, laminate, display at reception
          </p>
        </div>
      </div>
    </div>
  );
}
