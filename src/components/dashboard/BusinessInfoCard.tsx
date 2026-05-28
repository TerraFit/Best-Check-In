// src/components/dashboard/BusinessInfoCard.tsx

interface BusinessInfoCardProps {
  business: {
    trading_name?: string
    email?: string
    phone?: string
    total_rooms?: number
    avg_price?: number
  } | null
}

export function BusinessInfoCard({ business }: BusinessInfoCardProps) {
  if (!business) return null

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-white border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Trading Name</p>
            <p className="text-sm font-medium text-gray-900 mt-1">{business.trading_name || 'Not set'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
            <p className="text-sm text-gray-700 mt-1">{business.email || 'Not set'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
            <p className="text-sm text-gray-700 mt-1">{business.phone || 'Not set'}</p>
          </div>
          {business.total_rooms && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total Rooms</p>
              <p className="text-sm text-gray-700 mt-1">{business.total_rooms}</p>
            </div>
          )}
          {business.avg_price && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Average Room Price</p>
              <p className="text-sm text-gray-700 mt-1">R {business.avg_price.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
