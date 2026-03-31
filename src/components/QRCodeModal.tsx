import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface Props {
  businessId: string;
  businessName: string;
  onClose: () => void;
}

export default function QRCodeModal({ businessId, businessName, onClose }: Props) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkInUrl, setCheckInUrl] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

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
        width: 400,
        margin: 2,
        color: {
          dark: '#f59e0b',
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
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${businessName.toLowerCase().replace(/\s+/g, '-')}-checkin-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printQR = () => {
    if (!qrCodeUrl) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Code - ${businessName}</title>
            <meta charset="utf-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh; 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
                background: #f9fafb;
              }
              .container { 
                text-align: center; 
                background: white;
                padding: 48px;
                border-radius: 24px;
                box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.02);
                max-width: 500px;
                margin: 20px;
              }
              h1 { 
                color: #f59e0b; 
                margin-bottom: 8px;
                font-size: 28px;
                font-weight: bold;
              }
              h2 { 
                color: #1f2937; 
                margin-bottom: 24px;
                font-size: 20px;
                font-weight: 600;
              }
              .qr-container {
                background: #fffbeb;
                padding: 24px;
                border-radius: 16px;
                margin-bottom: 24px;
              }
              img { 
                max-width: 280px; 
                width: 100%;
                height: auto;
                display: block;
                margin: 0 auto;
              }
              .instruction { 
                color: #6b7280; 
                margin-top: 20px;
                font-size: 14px;
              }
              .url {
                color: #f59e0b;
                word-break: break-all;
                font-size: 12px;
                margin-top: 12px;
                padding: 12px;
                background: #fef3c7;
                border-radius: 8px;
                font-family: monospace;
              }
              .footer {
                margin-top: 24px;
                font-size: 11px;
                color: #9ca3af;
                border-top: 1px solid #e5e7eb;
                padding-top: 16px;
              }
              @media print {
                body { background: white; }
                .container { box-shadow: none; padding: 20px; }
                .qr-container { background: white; }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>FastCheckin</h1>
              <h2>${escapeHtml(businessName)}</h2>
              <div class="qr-container">
                <img src="${qrCodeUrl}" alt="QR Code">
              </div>
              <p class="instruction">Scan to check in to ${escapeHtml(businessName)}</p>
              <div class="url">${escapeHtml(checkInUrl)}</div>
              <div class="footer">Powered by FastCheckin</div>
            </div>
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.onafterprint = () => window.close();
                }, 300);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Helper to escape HTML
  const escapeHtml = (text: string) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Generate PDF (creates a printable poster)
  const generatePDF = async () => {
    if (!qrCodeUrl) return;
    
    try {
      const pdfWindow = window.open('', '_blank');
      if (!pdfWindow) {
        alert('Please allow pop-ups to generate PDF');
        return;
      }
      
      pdfWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Code - ${businessName}</title>
            <meta charset="utf-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh;
                background: #f9fafb;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
              }
              .poster {
                background: white;
                width: 600px;
                padding: 40px;
                text-align: center;
                border-radius: 24px;
                box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
              }
              h1 { 
                color: #f59e0b; 
                font-size: 32px;
                margin-bottom: 8px;
              }
              h2 { 
                color: #1f2937; 
                font-size: 24px;
                margin-bottom: 32px;
              }
              .qr-wrapper {
                background: #fffbeb;
                padding: 32px;
                border-radius: 24px;
                margin-bottom: 24px;
              }
              img { 
                max-width: 320px;
                width: 100%;
                height: auto;
                display: block;
                margin: 0 auto;
              }
              .url {
                font-family: monospace;
                font-size: 12px;
                color: #f59e0b;
                background: #fef3c7;
                padding: 12px;
                border-radius: 8px;
                word-break: break-all;
                margin-top: 16px;
              }
              .footer {
                margin-top: 24px;
                font-size: 11px;
                color: #9ca3af;
              }
              @media print {
                body { background: white; }
                .poster { box-shadow: none; }
              }
            </style>
          </head>
          <body>
            <div class="poster">
              <h1>FastCheckin</h1>
              <h2>${escapeHtml(businessName)}</h2>
              <div class="qr-wrapper">
                <img src="${qrCodeUrl}" alt="QR Code">
              </div>
              <p>Scan with your phone camera to check in</p>
              <div class="url">${escapeHtml(checkInUrl)}</div>
              <div class="footer">FastCheckin - Seamless Digital Check-in</div>
            </div>
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.onafterprint = () => window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      pdfWindow.document.close();
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try the Print option instead.');
    }
  };

  const sendEmail = async () => {
    if (sendingEmail) return;
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

      const result = await response.json();
      if (response.ok && result.success) {
        alert('QR Code sent successfully! Check your email.');
      } else {
        alert(result.error || 'Failed to send email. Please try again.');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Error sending email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  // Handle close without any navigation
  const handleClose = () => {
    // Just call onClose - no navigation, no page reload
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
        <div className="bg-white rounded-lg p-8" onClick={(e) => e.stopPropagation()}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-center mt-4 text-gray-500">Generating QR Code...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
        <div className="bg-white rounded-lg max-w-md w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-lg max-w-lg w-full relative shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
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
          <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
            {businessName}
          </h3>
          <p className="text-sm text-gray-500 text-center mb-4">Check-in QR Code</p>

          {/* QR Code Image */}
          <div className="bg-orange-50 p-6 rounded-lg flex justify-center mb-4">
            <img 
              src={qrCodeUrl} 
              alt={`QR Code for ${businessName}`}
              className="max-w-full h-auto border-4 border-white shadow-lg rounded-lg"
              style={{ maxWidth: '280px' }}
            />
          </div>

          {/* Check-in URL */}
          <div className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="font-medium mb-1">Check-in URL:</p>
            <p className="font-mono text-orange-600 text-xs break-all">
              {checkInUrl}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={downloadQR}
              className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex flex-col items-center gap-1 text-xs font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download</span>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l5.414 5.414c.39.39.586.902.586 1.414V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
              </svg>
              <span>PDF</span>
            </button>

            <button
              onClick={sendEmail}
              disabled={sendingEmail}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1 text-xs font-medium transition-colors"
            >
              {sendingEmail ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
              <span>Send</span>
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">
            Display this QR code at your reception. Guests scan with their phone camera to check in.
          </p>
        </div>
      </div>
    </div>
  );
}
