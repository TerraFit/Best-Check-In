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
      
      // QR code for modal preview (smaller)
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

  const generatePrintVersion = (includePrint: boolean = false) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // A4 proportions - larger for print
    canvas.width = 800;
    canvas.height = 1100;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Load QR code
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      // 1. Business Identity - Large QR is primary element
      const qrSize = 400; // QR is the biggest object
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 280;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      
      // 2. Business Logo (Trust Anchor)
      if (businessLogo) {
        const logo = new Image();
        logo.onload = () => {
          const logoSize = 70;
          ctx.drawImage(logo, (canvas.width - logoSize) / 2, 50, logoSize, logoSize);
          drawText();
        };
        logo.src = businessLogo;
        logo.crossOrigin = 'Anonymous';
      } else {
        drawText();
      }
      
      function drawText() {
        // Welcome text (subtle, above logo)
        ctx.font = '18px "Inter", sans-serif';
        ctx.fillStyle = '#666666';
        ctx.textAlign = 'center';
        ctx.fillText('Welcome to', canvas.width / 2, 150);
        
        // Business Name (prominent)
        ctx.font = 'bold 34px "Playfair Display", serif';
        ctx.fillStyle = '#1e1e1e';
        ctx.fillText(businessName, canvas.width / 2, 210);
        
        // 3. Clear Action - HERO MESSAGE (largest, boldest)
        ctx.font = 'bold 32px "Inter", sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('Scan to Check In', canvas.width / 2, qrY + qrSize + 70);
        
        // 4. Micro Instructions (reduces hesitation)
        ctx.font = '18px "Inter", sans-serif';
        ctx.fillStyle = '#4b5563';
        ctx.fillText('Open your camera and point it at the QR code', canvas.width / 2, qrY + qrSize + 130);
        
        ctx.font = '16px "Inter", sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('No app download required • Takes less than 1 minute', canvas.width / 2, qrY + qrSize + 175);
        
        // 5. Secondary Branding (subtle, at bottom)
        ctx.font = '12px "Inter", sans-serif';
        ctx.fillStyle = '#d1d5db';
        ctx.fillText('Powered by FastCheckin', canvas.width / 2, canvas.height - 45);
        
        ctx.font = '10px "Inter", sans-serif';
        ctx.fillStyle = '#e5e7eb';
        ctx.fillText('www.fastcheckin.co.za', canvas.width / 2, canvas.height - 25);
        
        if (includePrint) {
          // Open print window
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Check-in Poster - ${businessName}</title>
                  <style>
                    body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f9fafb; }
                    img { max-width: 100%; height: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px; }
                    @media print { body { background: white; padding: 0; } img { box-shadow: none; } }
                  </style>
                </head>
                <body>
                  <img src="${canvas.toDataURL()}" alt="Check-in Poster">
                  <script>window.onload = () => setTimeout(() => window.print(), 500);</script>
                </body>
              </html>
            `);
            printWindow.document.close();
          }
        } else {
          // Download as PNG
          const link = document.createElement('a');
          link.download = `${businessName.toLowerCase().replace(/\s+/g, '-')}-checkin-poster.png`;
          link.href = canvas.toDataURL();
          link.click();
        }
      }
    };
    img.src = qrCodeUrl;
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${businessName.toLowerCase().replace(/\s+/g, '-')}-qr-code.png`;
    link.click();
  };

  const downloadPoster = () => {
    generatePrintVersion(false);
  };

  const printPoster = () => {
    generatePrintVersion(true);
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
      <div className="bg-white rounded-xl max-w-md w-full relative shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 hover:bg-gray-100 transition-all z-10"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Print-Ready QR Display</h3>
            <p className="text-xs text-gray-500">Professional guest check-in poster</p>
          </div>

          {/* Preview - Shows what the poster will look like */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
            <div className="text-center">
              {businessLogo && (
                <img src={businessLogo} alt={businessName} className="h-12 w-auto mx-auto mb-2" />
              )}
              <p className="text-xs text-gray-500">Welcome to</p>
              <p className="text-sm font-bold text-gray-900">{businessName}</p>
              <div className="text-base font-bold text-orange-500 my-2">📱 Scan to Check In</div>
              <img 
                src={qrCodeUrl} 
                alt={`QR Code for ${businessName}`}
                className="w-28 h-28 mx-auto border border-gray-200 rounded-lg"
              />
              <p className="text-[10px] text-gray-500 mt-2">Open camera and point at QR code</p>
              <p className="text-[9px] text-gray-400">No app required • Takes less than 1 minute</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={downloadQR}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-1 text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              QR Only
            </button>
            
            <button
              onClick={downloadPoster}
              className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center justify-center gap-1 text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Poster
            </button>

            <button
              onClick={printPoster}
              className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 flex items-center justify-center gap-1 text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Poster
            </button>

            <button
              onClick={sendEmail}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-1 text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send Email
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-[10px] text-gray-400 text-center">
            Print poster on A4 paper, laminate, and display at reception.
          </p>
        </div>
      </div>
    </div>
  );
}
