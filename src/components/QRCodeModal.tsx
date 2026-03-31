import { useState, useEffect } from 'react';
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

  useEffect(() => {
    generateQR();
  }, [businessId]);

  const generateQR = async () => {
    setLoading(true);
    setError('');
    try {
      const url = `https://fastcheckin.co.za/checkin/${businessId}`;
      setCheckInUrl(url);
      
      // ✅ SMALLER QR code for modal (160px)
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 1,
        color: {
          dark: '#1e1e1e',
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

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${businessName.toLowerCase().replace(/\s+/g, '-')}-qr-code.png`;
    link.click();
  };

  const downloadPoster = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 500;
    canvas.height = 600;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const img = new Image();
    img.onload = () => {
      const qrSize = 180;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 160;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      
      if (businessLogo) {
        const logo = new Image();
        logo.onload = () => {
          const logoSize = 45;
          ctx.drawImage(logo, (canvas.width - logoSize) / 2, 30, logoSize, logoSize);
          finalize();
        };
        logo.src = businessLogo;
        logo.crossOrigin = 'Anonymous';
      } else {
        finalize();
      }
      
      function finalize() {
        ctx.fillStyle = '#1e1e1e';
        ctx.font = 'bold 18px "Playfair Display", serif';
        ctx.textAlign = 'center';
        ctx.fillText(businessName, canvas.width / 2, 105);
        
        ctx.font = '12px "Inter", sans-serif';
        ctx.fillStyle = '#666';
        ctx.fillText('Welcome to', canvas.width / 2, 75);
        
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 16px "Inter", sans-serif';
        ctx.fillText('Scan to Check In', canvas.width / 2, qrY + qrSize + 35);
        
        ctx.font = '10px "Inter", sans-serif';
        ctx.fillStyle = '#4b5563';
        ctx.fillText('Open camera and point at QR code', canvas.width / 2, qrY + qrSize + 60);
        
        ctx.font = '9px "Inter", sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('No app required • Takes less than 1 minute', canvas.width / 2, canvas.height - 35);
        
        ctx.font = '8px "Inter", sans-serif';
        ctx.fillStyle = '#d1d5db';
        ctx.fillText('Powered by FastCheckin', canvas.width / 2, canvas.height - 12);
        
        const link = document.createElement('a');
        link.download = `${businessName.toLowerCase().replace(/\s+/g, '-')}-poster.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
    };
    img.src = qrCodeUrl;
    img.crossOrigin = 'Anonymous';
  };

  const printQR = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Check-in QR Code - ${businessName}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Inter', sans-serif;
                background: white;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 20px;
              }
              .poster {
                max-width: 400px;
                width: 100%;
                text-align: center;
                background: white;
                padding: 20px;
              }
              .logo { max-width: 50px; height: auto; margin: 0 auto 12px; }
              .welcome { font-size: 11px; color: #666; margin-bottom: 4px; }
              .business-name { font-size: 18px; font-weight: bold; color: #1e1e1e; margin-bottom: 15px; }
              .cta { font-size: 18px; font-weight: bold; color: #f59e0b; margin: 15px 0; }
              .qr-code { max-width: 160px; width: 100%; height: auto; margin: 10px auto; }
              .instruction { font-size: 11px; color: #4b5563; margin-top: 12px; }
              .small { font-size: 9px; color: #9ca3af; margin-top: 4px; }
              .powered { font-size: 8px; color: #d1d5db; margin-top: 15px; padding-top: 10px; border-top: 1px solid #e5e7eb; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <div class="poster">
              ${businessLogo ? `<img src="${businessLogo}" class="logo" onerror="this.style.display='none'">` : ''}
              <div class="welcome">Welcome to</div>
              <div class="business-name">${businessName}</div>
              <div class="cta">📱 Scan to Check In</div>
              <img src="${qrCodeUrl}" class="qr-code">
              <div class="instruction">Open your camera and point it at the QR code</div>
              <div class="small">No app required • Takes less than 1 minute</div>
              <div class="powered">Powered by FastCheckin</div>
            </div>
            <script>window.onload = () => setTimeout(() => window.print(), 300);</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
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

  const handleClose = () => {
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-center mt-3 text-gray-500 text-sm">Generating QR Code...</p>
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
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-white rounded-xl max-w-sm w-full relative shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 hover:bg-gray-100 transition-all z-10"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-5">
          {/* Header */}
          <div className="text-center mb-3">
            <h3 className="text-md font-semibold text-gray-900">Check-in QR Code</h3>
            <p className="text-xs text-gray-500">Display at reception for guests to scan</p>
          </div>

          {/* QR Code */}
          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <div className="flex justify-center">
              <img 
                src={qrCodeUrl} 
                alt={`QR Code for ${businessName}`}
                className="w-32 h-32 border border-gray-200 rounded-lg"
              />
            </div>
            
            {/* Business Info */}
            <div className="text-center mt-2">
              {businessLogo && (
                <img src={businessLogo} alt={businessName} className="h-6 w-auto mx-auto mb-1" />
              )}
              <p className="text-xs font-medium text-gray-900">{businessName}</p>
              <p className="text-xs text-orange-500 mt-1">Scan to Check In</p>
            </div>
          </div>

          {/* URL (optional, small) */}
          <div className="bg-gray-50 rounded-lg p-2 mb-3">
            <p className="text-[10px] text-gray-500 text-center break-all font-mono">
              {checkInUrl}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={downloadQR}
              className="px-2 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1 text-xs font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              QR Only
            </button>
            
            <button
              onClick={downloadPoster}
              className="px-2 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center justify-center gap-1 text-xs font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Poster
            </button>

            <button
              onClick={printQR}
              className="px-2 py-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 flex items-center justify-center gap-1 text-xs font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>

            <button
              onClick={sendEmail}
              className="px-2 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-1 text-xs font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-[10px] text-gray-400 text-center">
            Print and display at reception. Guests scan with phone camera.
          </p>
        </div>
      </div>
    </div>
  );
}
