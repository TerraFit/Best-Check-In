import { useState } from 'react';
import QRCodeModal from '../QRCodeModal';

interface HeaderProps {
  business: {
    id?: string;
    trading_name?: string;
    slogan?: string;
    logo_url?: string;
    phone?: string;
  } | null;
  refreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

export function Header({ business, refreshing, onRefresh, onLogout }: HeaderProps) {
  const [showQRModal, setShowQRModal] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              {business?.logo_url ? (
                <img src={business.logo_url} alt={business.trading_name} className="h-10 w-auto rounded-lg" />
              ) : (
                <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-lg">
                    {business?.trading_name?.charAt(0) || 'B'}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{business?.trading_name || 'Business Dashboard'}</h1>
                {business?.slogan && (
                  <p className="text-xs text-gray-500 italic">{business.slogan}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowQRModal(true)}
                className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                QR Code
              </button>
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-orange-500 rounded-lg hover:bg-gray-100 transition-colors"
                title="Refresh data"
              >
                <svg className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => window.print()}
                className="p-2 text-gray-500 hover:text-orange-500 rounded-lg hover:bg-gray-100 transition-colors"
                title="Print"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </button>
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* QR Code Modal */}
      {showQRModal && business?.id && (
        <QRCodeModal
          businessId={business.id}
          businessName={business.trading_name || ''}
          businessLogo={business.logo_url}
          businessPhone={business.phone}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </>
  );
}
