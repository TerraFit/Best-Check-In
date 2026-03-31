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
      
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 600,
        margin: 2,
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

  const downloadPNG = () => {
    if (!qrCodeUrl) return;
    // Create a canvas to combine elements for a better download
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 800;
    canvas.height = 1000;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Load and draw QR code
    const img = new Image();
    img.onload = () => {
      const qrSize = 400;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 280;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      
      // Business Logo (if available)
      if (businessLogo) {
        const logo = new Image();
        logo.onload = () => {
          const logoSize = 60;
          ctx.drawImage(logo, (canvas.width - logoSize) / 2, 40, logoSize, logoSize);
          finalizeDrawing();
        };
        logo.src = businessLogo;
        logo.crossOrigin = 'Anonymous';
      } else {
        finalizeDrawing();
      }
      
      function finalizeDrawing() {
        // Business Name
        ctx.fillStyle = '#1e1e1e';
        ctx.font = 'bold 28px "Playfair Display", serif';
        ctx.textAlign = 'center';
        ctx.fillText(businessName, canvas.width / 2, 140);
        
        // Welcome line
        ctx.font = '16px "Inter", sans-serif';
        ctx.fillStyle = '#666666';
        ctx.fillText('Welcome to', canvas.width / 2, 100);
        
        // Main Call to Action
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 24px "Inter", sans-serif';
        ctx.fillText('Scan to Check In', canvas.width / 2, qrY + qrSize + 60);
        
        // Instructions
        ctx.font = '14px "Inter", sans-serif';
        ctx.fillStyle = '#4b5563';
        ctx.fillText('Open your camera and point it at the QR code', canvas.width / 2, qrY + qrSize + 100);
        
        ctx.font = '12px "Inter", sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('No app required • Takes less than 1 minute', canvas.width / 2, qrY + qrSize + 130);
        
        // Powered by line
        ctx.font = '10px "Inter", sans-serif';
        ctx.fillStyle = '#d1d5db';
        ctx.fillText('Powered by FastCheckin', canvas.width / 2, canvas.height - 40);
        
        // Download
        const link = document.createElement('a');
        link.download = `${businessName.toLowerCase().replace(/\s+/g, '-')}-checkin-poster.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
    };
    img.src = qrCodeUrl;
    img.crossOrigin = 'Anonymous';
  };

  const downloadSimplePNG = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${businessName.toLowerCase().replace(/\s+/g, '-')}-qr-code.png`;
    link.click();
  };

  const printQR = () => {
    if (!qrCodeUrl) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Check-in QR Code - ${businessName}</title>
            <meta charset="UTF-8">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #ffffff;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 40px;
              }
              .poster {
                max-width: 800px;
                width: 100%;
                margin: 0 auto;
                text-align: center;
                background: white;
              }
              .business-logo {
                max-width: 80px;
                height: auto;
                margin: 0 auto 20px;
              }
              .business-name {
                font-family: 'Playfair Display', serif;
                font-size: 32px;
                font-weight: 700;
                color: #1e1e1e;
                margin-bottom: 8px;
              }
              .welcome-text {
                font-size: 16px;
                color: #666;
                margin-bottom: 24px;
              }
              .cta {
                font-size: 28px;
                font-weight: 700;
                color: #f59e0b;
                margin: 32px 0 24px;
                letter-spacing: -0.5px;
              }
              .qr-container {
                display: flex;
                justify-content: center;
                margin: 24px 0;
                padding: 24px;
                background: #fff;
              }
              .qr-code {
                max-width: 320px;
                width: 100%;
                height: auto;
                border-radius: 24px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.08);
              }
              .instruction {
                font-size: 15px;
                color: #4b5563;
                margin-top: 24px;
                line-height: 1.5;
              }
              .instruction-small {
                font-size: 12px;
                color: #9ca3af;
                margin-top: 8px;
              }
              .powered-by {
                margin-top: 48px;
                padding-top: 24px;
                border-top: 1px solid #e5e7eb;
                font-size: 11px;
                color: #d1d5db;
              }
              .powered-by a {
                color: #9ca3af;
                text-decoration: none;
              }
              @media print {
                body {
                  padding: 0;
                  background: white;
                }
                .poster {
                  box-shadow: none;
                }
                .qr-code {
                  box-shadow: none;
                  border: 1px solid #e5e7eb;
                }
              }
            </style>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
          </head>
          <body>
            <div class="poster">
              ${businessLogo ? `<img src="${businessLogo}" alt="${businessName}" class="business-logo" onerror="this.style.display='none'">` : ''}
              <div class="welcome-text">Welcome to</div>
              <div class="business-name">${businessName}</div>
              <div class="cta">📱 Scan to Check In</div>
              <div class="qr-container">
                <img src="${qrCodeUrl}" alt="Check-in QR Code" class="qr-code">
              </div>
              <div class="instruction">
                Open your camera app and point it at the QR code
              </div>
              <div class="instruction-small">
                No app download required • Takes less than 1 minute
              </div>
              <div class="powered-by">
                Powered by <a href="https://fastcheckin.co.za" target="_blank">FastCheckin</a>
              </div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const generatePDF = async () => {
    if (!qrCodeUrl) return;
    
    // Create a canvas for the poster
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 800;
    canvas.height = 1100;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Load QR code
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = qrCodeUrl;
    });
    
    // Draw QR code
    const qrSize = 400;
    const qrX = (canvas.width - qrSize) / 2;
    const qrY = 280;
    ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
    
    // Draw text elements
    ctx.fillStyle = '#1e1e1e';
    ctx.font = 'bold 28px "Playfair Display", serif';
    ctx.textAlign = 'center';
    ctx.fillText(businessName, canvas.width / 2, 140);
    
    ctx.font = '16px "Inter", sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('Welcome to', canvas.width / 2, 100);
    
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 26px "Inter", sans-serif';
    ctx.fillText('Scan to Check In', canvas.width / 2, qrY + qrSize + 60);
    
    ctx.font = '15px "Inter", sans-serif';
    ctx.fillStyle = '#4b5563';
    ctx.fillText('Open your camera and point it at the QR code', canvas.width / 2, qrY + qrSize + 100);
    
    ctx.font = '12px "Inter", sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('No app required • Takes less than 1 minute', canvas.width / 2, qrY + qrSize + 130);
    
    ctx.font = '10px "Inter", sans-serif';
    ctx.fillStyle = '#d1d5db';
    ctx.fillText('Powered by FastCheckin', canvas.width / 2, canvas.height - 40);
    
    // Open PDF print window
    const pdfWindow = window.open('', '_blank');
    if (pdfWindow) {
      pdfWindow.document.write(`
        <html>
          <head>
            <title>Check-in Poster - ${businessName}</title>
            <style>
              body { 
                margin: 0; 
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: #f9fafb;
              }
              img {
                max-width: 100%;
                height: auto;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                border-radius: 8px;
              }
              @media print {
                body { background: white; padding: 0; }
                img { box-shadow: none; }
              }
            </style>
          </head>
          <body>
            <img src="${canvas.toDataURL()}" alt="Check-in Poster">
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 1000);
              };
            </script>
          </body>
        </html>
      `);
      pdfWindow.document.close();
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-center mt-4 text-gray-500">Preparing your QR code...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full relative shadow-xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 hover:bg-gray-100 transition-all z-10"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 md:p-8">
          {/* Preview Header */}
          <div className="text-center mb-4">
            <h3 className="text-lg font-medium text-gray-700">Print-Ready QR Display</h3>
            <p className="text-sm text-gray-400">Designed for guests to scan easily</p>
          </div>

          {/* QR Poster Preview */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg mb-6">
            <div className="p-8 text-center">
              {/* Business Logo Placeholder */}
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-orange-600 text-2xl">🏨</span>
              </div>
              
              {/* Welcome Text */}
              <p className="text-sm text-gray-500 mb-1">Welcome to</p>
              
              {/* Business Name */}
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-2">
                {businessName}
              </h2>
              
              {/* Main Call to Action */}
              <div className="text-3xl md:text-4xl font-bold text-orange-500 my-4">
                📱 Scan to Check In
              </div>
              
              {/* QR Code */}
              <div className="flex justify-center my-4">
                <img 
                  src={qrCodeUrl} 
                  alt={`Check-in QR Code for ${businessName}`}
                  className="w-64 h-64 md:w-80 md:h-80 border-2 border-gray-200 rounded-xl shadow-md"
                />
              </div>
              
              {/* Instructions */}
              <p className="text-gray-600 text-sm md:text-base mt-4">
                Open your camera and point it at the QR code
              </p>
              <p className="text-gray-400 text-xs mt-1">
                No app download required • Takes less than 1 minute
              </p>
              
              {/* Powered By */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-gray-300 text-xs">
                  Powered by FastCheckin
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={downloadSimplePNG}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex flex-col items-center gap-1 text-xs font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>QR Only</span>
            </button>
            
            <button
              onClick={downloadPNG}
              className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex flex-col items-center gap-1 text-xs font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Poster (PNG)</span>
            </button>

            <button
              onClick={printQR}
              className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 flex flex-col items-center gap-1 text-xs font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print</span>
            </button>

            <button
              onClick={generatePDF}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex flex-col items-center gap-1 text-xs font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>PDF</span>
            </button>
          </div>

          <div className="mt-4 flex justify-center">
            <button
              onClick={sendEmail}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send to Email
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">
            Print and display at your reception. Guests scan with their phone camera to check in.
          </p>
        </div>
      </div>
    </div>
  );
}
