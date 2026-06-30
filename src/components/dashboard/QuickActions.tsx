import { useTranslation } from '../../i18n';

interface QuickActionsProps {
  businessId: string
  onShowQRModal: () => void
  onShowImportModal: () => void
}

export function QuickActions({ businessId, onShowQRModal, onShowImportModal }: QuickActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard_quick_actions')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => window.location.href = `/checkin/${businessId}`}
          className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all hover:border-orange-200 text-left"
        >
          <div className="bg-orange-500 p-3 rounded-full">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">{t('dashboard_new_checkin')}</p>
            <p className="text-xs text-gray-500">{t('dashboard_new_checkin_desc')}</p>
          </div>
        </button>
        <button
          onClick={onShowQRModal}
          className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all hover:border-orange-200 text-left"
        >
          <div className="bg-blue-500 p-3 rounded-full">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">{t('dashboard_qr_code')}</p>
            <p className="text-xs text-gray-500">{t('dashboard_qr_code_desc')}</p>
          </div>
        </button>
        <button
          onClick={onShowImportModal}
          className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all hover:border-green-200 text-left"
        >
          <div className="bg-green-500 p-3 rounded-full">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">{t('dashboard_import_data')}</p>
            <p className="text-xs text-gray-500">{t('dashboard_import_data_desc')}</p>
          </div>
        </button>
      </div>
    </div>
  );
}
