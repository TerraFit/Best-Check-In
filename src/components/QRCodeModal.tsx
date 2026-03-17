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
  const [checkInUrl, setCheckInUrl] = useState('');

  useEffect(() => {
    generateQR();
  }, [businessId]);

  const generateQR = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${businessName.toLowerCase().replace(/\s+/g, '-')}-checkin-qr.png`;
    link.click();
  };

  const printQR = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${businessName}</title>
            <style>
              body { 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh; 
                margin: 0; 
                font-family: 'Arial', sans-serif;
                background: #f9fafb;
              }
              .container { 
                text-align: center; 
                background: white;
                padding: 40px;
                border-radius: 16px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              }
              h1 { 
                color: #f59e0b; 
                margin-bottom: 10px;
                font-size: 24px;
              }
              h2 { 
                color: #1e1e1e; 
                margin-bottom: 30px;
                font-size: 20px;
              }
              img { 
                max-width: 300px; 
                border: 4px solid #f59e0b;
                border-radius: 16px;
                padding: 16px;
                background: white;
              }
              p { 
                color: #666; 
                margin-top: 30px;
                font-size: 14px;
              }
              .url {
                color: #f59e0b;
                word-break: break-all;
                font-size: 12px;
                margin-top: 10px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>FastCheckin</h1>
              <h2>${businessName}</h2>
              <img src="${qrCodeUrl}" alt="QR Code">
              <p>Scan to check in to ${businessName}</p>
              <div class="url">${checkInUrl}</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              {businessName} - Check-in QR Code
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="bg-orange-50 p-6 rounded-lg flex justify-center mb-4">
            <img 
              src={qrCodeUrl} 
              alt={`QR Code for ${businessName}`}
              className="max-w-full h-auto border-4 border-white shadow-lg rounded-lg"
            />
          </div>

          <div className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="font-medium mb-1">Check-in URL:</p>
            <p className="font-mono text-orange-600 text-xs break-all">
              {checkInUrl}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={downloadQR}
              className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center justify-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PNG
            </button>
            <button
              onClick={printQR}
              className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 flex items-center justify-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
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
