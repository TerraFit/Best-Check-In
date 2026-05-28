// src/components/dashboard/DashboardModals.tsx
import QRCodeModal from '../QRCodeModal'
import ImportGoogleForms from '../ImportGoogleForms'
import AppealModal from '../AppealModal'

interface DashboardModalsProps {
  showQRModal: boolean
  showImportModal: boolean
  showAppealModal: boolean
  business: any
  rejectedRequest: any
  onCloseQR: () => void
  onCloseImport: () => void
  onCloseAppeal: () => void
  onImportComplete: () => void
  onAppealSubmit: () => void
  loadBookings: () => void
  fetchChangeRequests: () => void
}

export function DashboardModals({
  showQRModal,
  showImportModal,
  showAppealModal,
  business,
  rejectedRequest,
  onCloseQR,
  onCloseImport,
  onCloseAppeal,
  onImportComplete,
  onAppealSubmit,
  loadBookings,
  fetchChangeRequests
}: DashboardModalsProps) {
  return (
    <>
      {showQRModal && business && (
        <QRCodeModal
          businessId={business.id}
          businessName={business.trading_name}
          businessLogo={business.logo_url}
          businessPhone={business.phone}
          onClose={onCloseQR}
        />
      )}

      {showImportModal && business && (
        <ImportGoogleForms
          businessId={business.id}
          onImportComplete={() => {
            loadBookings()
            onImportComplete()
          }}
          onClose={onCloseImport}
        />
      )}

      {showAppealModal && rejectedRequest && business && (
        <AppealModal
          isOpen={showAppealModal}
          onClose={() => {
            onCloseAppeal()
          }}
          request={rejectedRequest}
          business={{ 
            id: business.id, 
            trading_name: business.trading_name, 
            email: business.email 
          }}
          onSubmit={() => fetchChangeRequests()}
        />
      )}
    </>
  )
}
